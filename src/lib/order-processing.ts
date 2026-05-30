import { IOrder } from '@/models/Order';
import Order from '@/models/Order';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import { logPaymentEvent, logError } from '@/lib/logger';
import { sendWellWisherTaskAssignmentEmail, sendThankYouEmailWithCertificate, sendGiftRecipientGreetingEmail } from '@/lib/email';
import { generateCertificate } from '@/lib/certificate';
// Removed Cloudinary upload - certificates stored only in database

async function ensureUserPublicId(user: { _id: unknown; publicId?: string; save: () => Promise<unknown> }): Promise<string | null> {
  if (user.publicId) {
    return user.publicId;
  }

  for (let attempts = 0; attempts < 5; attempts++) {
    const random = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now().toString(36).slice(-4);
    const publicId = `${random}${timestamp}`.toLowerCase();
    const existing = await User.findOne({ publicId }).select('_id').lean();

    if (!existing) {
      user.publicId = publicId;
      await user.save();
      return publicId;
    }
  }

  return null;
}

/**
 * Complete order processing after payment
 * This is idempotent - safe to call multiple times
 */
export async function processOrderCompletion(order: IOrder): Promise<{
  success: boolean;
  error?: string;
  completed: {
    certificate: boolean;
    wellwisher: boolean;
    email: boolean;
  };
}> {
  const result: {
    success: boolean;
    error?: string;
    completed: {
      certificate: boolean;
      wellwisher: boolean;
      email: boolean;
    };
  } = {
    success: true,
    completed: {
      certificate: false,
      wellwisher: false,
      email: false
    }
  };

  try {
    // Ensure order is marked as paid and confirmed
    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
    }

    const treesCount = order.items.reduce((sum: number, item: { quantity: number; [key: string]: unknown }) => sum + item.quantity, 0);

    // 1. Assign well-wisher if not assigned
    if (!order.assignedWellwisher || !order.wellwisherTasks || order.wellwisherTasks.length === 0) {
      try {
        const { assignWellWisherEqually } = await import('@/lib/utils/wellwisher-assignment');
        const wellwisherId = await assignWellWisherEqually();
      
        if (!wellwisherId) {
          // No well-wisher available - log error and mark as incomplete
          const errorMsg = 'No well-wisher available for assignment';
          logError('Well-wisher assignment failed', new Error(errorMsg), {
            orderId: order.orderId,
            reason: 'no_wellwisher_available'
          });
          result.success = false;
          result.error = errorMsg;
          // Don't mark as completed - will allow retry
          return result;
        }

        // Create one task per tree (not per item) so well-wisher can upload separate images/locations for each tree
        const wellwisherTasks: Array<{
          taskId: string;
          task: string;
          description: string;
          scheduledDate: Date;
          status: 'pending';
          location: string;
        }> = [];
        let taskIndex = 0;
        order.items.forEach((item: { treeName: string; quantity: number; [key: string]: unknown }) => {
          // Create a separate task for each tree in the quantity
          for (let i = 0; i < item.quantity; i++) {
            wellwisherTasks.push({
              taskId: `${order.orderId}-${taskIndex}`,
              task: `Plant and care for ${item.treeName}`,
              description: `Plant 1 ${item.treeName} tree and provide ongoing care. ${order.isGift && order.giftMessage ? `Gift message: ${order.giftMessage}` : ''}`,
              scheduledDate: new Date(Date.now() + (taskIndex + 1) * 24 * 60 * 60 * 1000),
              status: 'pending' as const,
              location: 'To be determined'
            });
            taskIndex++;
          }
        });

        order.assignedWellwisher = wellwisherId;
        order.wellwisherTasks = wellwisherTasks;
        await order.save();
        
        // Verify assignment was saved successfully
        const savedOrder = await Order.findById(order._id).select('assignedWellwisher wellwisherTasks').lean();
        if (!savedOrder || savedOrder.assignedWellwisher?.toString() !== wellwisherId) {
          const errorMsg = 'Well-wisher assignment failed to save';
          logError('Well-wisher assignment verification failed', new Error(errorMsg), {
            orderId: order.orderId,
            wellwisherId,
            savedWellwisher: savedOrder?.assignedWellwisher?.toString()
          });
          result.success = false;
          result.error = errorMsg;
          return result;
        }
        
        result.completed.wellwisher = true;
        logPaymentEvent('wellwisher_assigned', {
          orderId: order.orderId,
          wellwisherId,
          tasksCount: wellwisherTasks.length
        });

      } catch (assignmentError) {
        const errorMsg = `Error assigning well-wisher: ${assignmentError instanceof Error ? assignmentError.message : String(assignmentError)}`;
        logError('Error assigning well-wisher', assignmentError as Error, {
          orderId: order.orderId
        });
        result.success = false;
        result.error = errorMsg;
        // Don't mark as completed - will allow retry
        return result;
      }
    } else {
      result.completed.wellwisher = true; // Already assigned
    }

    if (order.assignedWellwisher && order.wellwisherTasks?.length && !order.wellwisherTaskEmailSentAt) {
      const wellwisherId = order.assignedWellwisher.toString();

      try {
        const wellWisher = await User.findById(wellwisherId).select('email name');
        if (wellWisher && wellWisher.email) {
          const emailSent = await sendWellWisherTaskAssignmentEmail(
            wellWisher.email,
            wellWisher.name || '',
            order.orderId,
            order.wellwisherTasks,
            {
              totalTrees: treesCount,
              customerName: order.userName,
              isGift: order.isGift || false
            }
          );

          if (emailSent) {
            order.wellwisherTaskEmailSentAt = new Date();
            await order.save();
            logPaymentEvent('wellwisher_task_assignment_email_sent', {
              orderId: order.orderId,
              wellwisherId,
              wellwisherEmail: wellWisher.email,
              tasksCount: order.wellwisherTasks.length
            });
          } else {
            logError('Well-wisher task assignment email failed to send', new Error('Email sending returned false'), {
              orderId: order.orderId,
              wellwisherId,
              wellwisherEmail: wellWisher.email
            });
          }
        } else {
          logError('Well-wisher not found or missing email', new Error('Well-wisher not found'), {
            orderId: order.orderId,
            wellwisherId
          });
        }
      } catch (emailError) {
        logError('Error sending well-wisher email', emailError as Error, {
          orderId: order.orderId,
          wellwisherId
        });
      }
    }

    // 2. Generate certificate for email (not stored - generated on-demand)
    // Always generate fresh certificate with latest user data
    if (true) { // Always generate for email
      try {
        // For dealer orders, use customer's account (customerUserId) instead of dealer's account
        // This ensures we use the customer's existing QR code and public ID
        const userIdToUse = (order.userType === 'dealer' && order.customerUserId) 
          ? order.customerUserId 
          : order.userId;
        
        const user = await User.findById(userIdToUse).select('publicId qrCode image name companyName userType');

        if (!user) {
          const errorMsg = 'User not found for certificate/email generation';
          logError(errorMsg, new Error(errorMsg), {
            orderId: order.orderId,
            userIdToUse
          });
          result.success = false;
          result.error = errorMsg;
        } else {
          const publicId = await ensureUserPublicId(user);
          if (!publicId) {
            const errorMsg = 'Unable to generate publicId for certificate/email generation';
            logError(errorMsg, new Error(errorMsg), {
              orderId: order.orderId,
              userIdToUse
            });
            result.success = false;
            result.error = errorMsg;
            return result;
          }

          const oxygenKgs = order.items.reduce((sum: number, item: { oxygenKgs: number; quantity: number; [key: string]: unknown }) => sum + (item.oxygenKgs * item.quantity), 0);
          const co2Kgs = order.items.reduce((sum: number, item: { oxygenKgs: number; co2Kgs?: number; quantity: number; [key: string]: unknown }) => {
            const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null) 
              ? item.co2Kgs * item.quantity
              : (item.oxygenKgs * 0.715) * item.quantity;
            return sum + itemCo2;
          }, 0);
          
          const treeNames: string[] = [];
          order.items.forEach((item: { treeName: string; [key: string]: unknown }) => {
            if (!treeNames.includes(item.treeName)) {
              treeNames.push(item.treeName);
            }
          });

          // For dealer orders, always use customer's account info (not dealer's)
          // We already fetched the customer's account via customerUserId, so use that
          let certificateUserName: string;
          let profilePicUrl: string | undefined;
          
          if (order.userType === 'dealer' && order.customerUserId) {
            // For dealer orders, use customer's account name and profile picture
            // Never use dealer's info - always use customer's account data
            certificateUserName = user.name || 'Customer';
            profilePicUrl = user.image || undefined;
          } else if (order.isGift && order.giftRecipientName) {
            // For gift orders, use gift recipient name
            certificateUserName = order.giftRecipientName;
            const firstGiftItem = order.items.find((item: { adoptionType?: string; recipientProfilePicture?: string }) => item.adoptionType === 'gift' && item.recipientProfilePicture) as { recipientProfilePicture?: string } | undefined;
            profilePicUrl = order.giftRecipientProfilePicture || firstGiftItem?.recipientProfilePicture || undefined;
          } else {
            // For regular orders, use the user's account info
            if (user.userType === 'company' || user.userType === 'dealer') {
              certificateUserName = user.companyName || user.name || order.userName || (user.userType === 'dealer' ? 'Dealer' : 'Company');
            } else {
              certificateUserName = user.name || order.userName || 'User';
            }
            profilePicUrl = user.image || undefined;
          }
          
          // Get dealer and vehicle info for dealer orders
          let dealerName: string | undefined;
          let vehicleName: string | undefined;
          let dealerImageUrl: string | undefined;
          if (order.userType === 'dealer' && order.items.length > 0) {
            dealerName = order.dealerName || order.showroomName || order.userName;
            const firstItem = order.items[0] as { vehicleName?: string };
            vehicleName = firstItem.vehicleName;
            
            // Fetch dealer profile information
            try {
              const dealer = await User.findById(order.userId).select('name companyName image').lean();
              if (dealer) {
                // Use companyName for dealers if available, otherwise name
                if (!dealerName) {
                  dealerName = dealer.companyName || dealer.name || order.userName;
                }
                dealerImageUrl = dealer.image || undefined;
              }
            } catch (dealerError) {
              console.warn('[ORDER-PROCESSING] Error fetching dealer profile:', dealerError);
            }
          }

          const certificateBuffer = await generateCertificate({
            userName: certificateUserName,
            profilePicUrl: profilePicUrl,
            treesCount,
            oxygenKgs,
            co2Kgs,
            treeNames: treeNames.length > 0 ? treeNames : undefined,
            publicId, // Use customer's public ID for dealer orders
            orderId: order.orderId,
            qrCode: user.qrCode, // Use customer's QR code for dealer orders
            dealerName, // Dealer name for dealer orders
            vehicleName, // Vehicle name for dealer orders
            dealerImageUrl, // Dealer profile image for dealer orders
          });

          // Don't store certificate - generate on-demand when needed
          // Certificate is generated here only for email attachment
          result.completed.certificate = true;

          // 3. Send thank you email with certificate (non-blocking for better performance)
          // For dealer orders, send email to customer instead of dealer
          let recipientEmail: string;
          let recipientName: string;
          let dealerInfo: { dealerName?: string; showroomName?: string; vehicleName?: string } | undefined;
          
          if (order.userType === 'dealer' && order.items.length > 0) {
            // Get customer info from first item
            const firstItem = order.items[0] as { customerEmail?: string; customerName?: string; vehicleName?: string };
            if (firstItem.customerEmail && firstItem.customerName) {
              recipientEmail = firstItem.customerEmail;
              recipientName = firstItem.customerName;
              
              // Prepare dealer information for email
              dealerInfo = {
                dealerName: order.dealerName,
                showroomName: order.showroomName,
                vehicleName: firstItem.vehicleName
              };
            } else {
              // Fallback to dealer email if customer info not available
              recipientEmail = order.userEmail;
              recipientName = order.userName;
            }
          } else if (order.isGift && order.giftRecipientEmail) {
            recipientEmail = order.giftRecipientEmail;
            recipientName = order.giftRecipientName || order.userName;
          } else {
            recipientEmail = order.userEmail;
            recipientName = order.userName;
          }
          
          // Validate certificate buffer before sending email
          if (!certificateBuffer || certificateBuffer.length === 0) {
            logError('Certificate buffer is empty, cannot send email', new Error('Empty certificate buffer'), {
              orderId: order.orderId
            });
            result.completed.email = false;
          } else if (order.thankYouEmailSentAt) {
            result.completed.email = true;
          } else {
            // Send email and await completion to ensure it's sent
            try {
              const emailSent = await sendThankYouEmailWithCertificate(
                recipientEmail,
                recipientName,
                order.orderId,
                treesCount,
                certificateBuffer,
                dealerInfo // Pass dealer info for dealer orders
              );
              
              if (emailSent) {
                result.completed.email = true;
                order.thankYouEmailSentAt = new Date();
                await order.save();
                logPaymentEvent('thank_you_email_sent', {
                  orderId: order.orderId,
                  recipientEmail,
                  certificateSize: certificateBuffer.length
                });
              } else {
                result.completed.email = false;
                logError('Thank you email was not sent successfully', new Error('Email sending returned false'), {
                  orderId: order.orderId,
                  recipientEmail
                });
              }
            } catch (emailError) {
              result.completed.email = false;
              logError('Error sending thank you email', emailError as Error, {
                orderId: order.orderId,
                recipientEmail,
                certificateSize: certificateBuffer.length
              });
            }
          }

          if (order.isGift && order.giftRecipientEmail && !order.giftRecipientGreetingEmailSentAt) {
            const giftEmailResults = await Promise.all(
              order.items.map(async (item: { adoptionType?: string; recipientEmail?: string; recipientName?: string; treeName: string; quantity: number; giftMessage?: string; occasion?: string; [key: string]: unknown }) => {
                const isGiftItem = item.adoptionType === 'gift' || order.isGift;
                const giftRecipientEmail = item.recipientEmail || order.giftRecipientEmail;

                if (!isGiftItem || !giftRecipientEmail) {
                  return true;
                }

                try {
                  return await sendGiftRecipientGreetingEmail(
                    giftRecipientEmail,
                    item.recipientName || order.giftRecipientName || 'Friend',
                    order.userName,
                    item.treeName,
                    item.quantity,
                    item.giftMessage || order.giftMessage,
                    item.occasion
                  );
                } catch (emailError) {
                  logError('Error sending gift recipient email', emailError as Error, {
                    orderId: order.orderId,
                    recipientEmail: giftRecipientEmail
                  });
                  return false;
                }
              })
            );

            if (giftEmailResults.every(Boolean)) {
              order.giftRecipientGreetingEmailSentAt = new Date();
              await order.save();
              logPaymentEvent('gift_recipient_greeting_email_sent', {
                orderId: order.orderId,
                recipientEmail: order.giftRecipientEmail
              });
            }
          }
        }
      } catch (certError) {
        logError('Error generating certificate', certError as Error);
        result.success = false;
        result.error = `Certificate generation failed: ${certError instanceof Error ? certError.message : String(certError)}`;
      }
    }

    // Update coupon usage if applicable
    if (order.couponCode) {
      try {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode },
          { $inc: { usedCount: 1 } }
        );
      } catch (couponError) {
        logError('Error updating coupon usage', couponError as Error);
        // Non-critical, don't fail the whole process
      }
    }

    // Award credits: 10% of tree price (not discounted) for individual/company adoptions (not forest)
    // Only award if credits haven't been awarded yet (idempotent)
    // For dealer orders: award credits to the customer, not the dealer
    if (!order.creditsEarned || order.creditsEarned === 0) {
      try {
        // Calculate credits based on tree price (not discounted price)
        // Only for individual and company tree types (not forest)
        let creditsToAward = 0;
        order.items.forEach((item: { treeType?: string; price: number; quantity: number; [key: string]: unknown }) => {
          const treeType = item.treeType || 'individual';
          // Only award credits for individual and company adoptions, not forest
          if (treeType === 'individual' || treeType === 'company') {
            // 10% of tree price (not discounted) per item
            creditsToAward += Math.round((item.price * item.quantity) * 0.1);
          }
        });

        if (creditsToAward > 0) {
          // For dealer orders, award credits to the customer (customerUserId), not the dealer
          // For regular orders, award credits to the buyer (userId)
          const userIdToAward = (order.userType === 'dealer' && order.customerUserId) 
            ? order.customerUserId 
            : order.userId;
          
          // Update user credits
          const user = await User.findById(userIdToAward);
          if (user) {
            const currentCredits = user.credits || 0;
            user.credits = currentCredits + creditsToAward;
            await user.save();

            // Store credits earned in order
            order.creditsEarned = creditsToAward;
            await order.save();

            logPaymentEvent('credits_awarded', {
              orderId: order.orderId,
              userId: userIdToAward,
              creditsAwarded: creditsToAward,
              newBalance: user.credits,
              isDealerOrder: order.userType === 'dealer',
              customerUserId: order.customerUserId,
              dealerUserId: order.userId
            });
          } else {
            logError('User not found for credit award', new Error('User not found'), {
              orderId: order.orderId,
              userIdToAward,
              isDealerOrder: order.userType === 'dealer'
            });
          }
        }
      } catch (creditsError) {
        logError('Error awarding credits', creditsError as Error);
        // Non-critical, don't fail the whole process
      }
    }

    logPaymentEvent('order_processing_completed', {
      orderId: order.orderId,
      completed: result.completed
    });

    return result;
  } catch (error) {
    logError('Error in processOrderCompletion', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      completed: result.completed
    };
  }
}

