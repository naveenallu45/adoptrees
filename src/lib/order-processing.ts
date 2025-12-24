import { IOrder } from '@/models/Order';
import Order from '@/models/Order';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import { logPaymentEvent, logError } from '@/lib/logger';
import { sendWellWisherTaskAssignmentEmail, sendThankYouEmailWithCertificate, sendGiftRecipientGreetingEmail } from '@/lib/email';
import { generateCertificate } from '@/lib/certificate';
// Removed Cloudinary upload - certificates stored only in database

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

        const wellwisherTasks = order.items.map((item: { treeName: string; quantity: number; [key: string]: unknown }, index: number) => ({
          taskId: `${order.orderId}-${index}`,
          task: `Plant and care for ${item.treeName}`,
          description: `Plant ${item.quantity} ${item.treeName} tree(s) and provide ongoing care. ${order.isGift && order.giftMessage ? `Gift message: ${order.giftMessage}` : ''}`,
          scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
          status: 'pending' as const,
          location: 'To be determined'
        }));

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

        // Send task assignment email (non-blocking)
        User.findById(wellwisherId).select('email name').then(async (wellWisher) => {
          if (wellWisher) {
            try {
              await sendWellWisherTaskAssignmentEmail(
                wellWisher.email,
                wellWisher.name || '',
                order.orderId,
                wellwisherTasks,
                {
                  totalTrees: treesCount,
                  customerName: order.userName,
                  isGift: order.isGift || false
                }
              );
            } catch (emailError) {
              logError('Error sending well-wisher email', emailError as Error);
            }
          }
        }).catch((findError) => {
          logError('Error finding well-wisher for email', findError as Error);
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

    // 2. Generate certificate for email (not stored - generated on-demand)
    // Always generate fresh certificate with latest user data
    if (true) { // Always generate for email
      try {
        const user = await User.findById(order.userId).select('publicId qrCode image name companyName userType');
        
        if (user && user.publicId) {
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

          let certificateUserName: string;
          if (order.isGift && order.giftRecipientName) {
            certificateUserName = order.giftRecipientName;
          } else {
            if (user.userType === 'company') {
              certificateUserName = user.companyName || user.name || order.userName || 'Company';
            } else {
              certificateUserName = user.name || order.userName || 'User';
            }
          }
          
          const profilePicUrl = user.image || undefined;
          
          const certificateBuffer = await generateCertificate({
            userName: certificateUserName,
            profilePicUrl: profilePicUrl,
            treesCount,
            oxygenKgs,
            co2Kgs,
            treeNames: treeNames.length > 0 ? treeNames : undefined,
            publicId: user.publicId,
            orderId: order.orderId,
            qrCode: user.qrCode,
          });

          // Don't store certificate - generate on-demand when needed
          // Certificate is generated here only for email attachment
          result.completed.certificate = true;

          // 3. Send thank you email with certificate (non-blocking for better performance)
          const recipientEmail = order.isGift && order.giftRecipientEmail 
            ? order.giftRecipientEmail 
            : order.userEmail;
          const recipientName = order.isGift && order.giftRecipientName 
            ? order.giftRecipientName 
            : order.userName;
          
          // Validate certificate buffer before sending email
          if (!certificateBuffer || certificateBuffer.length === 0) {
            logError('Certificate buffer is empty, cannot send email', new Error('Empty certificate buffer'), {
              orderId: order.orderId
            });
          } else {
            // Send email asynchronously - don't block
            sendThankYouEmailWithCertificate(
              recipientEmail,
              recipientName,
              order.orderId,
              treesCount,
              certificateBuffer
            ).then((emailSent) => {
              if (emailSent) {
                result.completed.email = true;
                logPaymentEvent('thank_you_email_sent', {
                  orderId: order.orderId,
                  recipientEmail,
                  certificateSize: certificateBuffer.length
                });
              } else {
                logError('Thank you email was not sent successfully', new Error('Email sending returned false'), {
                  orderId: order.orderId,
                  recipientEmail
                });
              }
            }).catch((emailError) => {
              logError('Error sending thank you email', emailError as Error, {
                orderId: order.orderId,
                recipientEmail,
                certificateSize: certificateBuffer.length
              });
            });
          }
          
          // Mark email as completed (will be sent in background)
          result.completed.email = true;

          // Send gift recipient emails (non-blocking)
          if (order.isGift && order.giftRecipientEmail) {
            order.items.forEach((item: { adoptionType?: string; recipientEmail?: string; recipientName?: string; treeName: string; quantity: number; giftMessage?: string; occasion?: string; [key: string]: unknown }) => {
              const isGiftItem = item.adoptionType === 'gift' || order.isGift;
              const recipientEmail = item.recipientEmail || order.giftRecipientEmail;
              
              if (isGiftItem && recipientEmail) {
                sendGiftRecipientGreetingEmail(
                  recipientEmail,
                  item.recipientName || order.giftRecipientName || 'Friend',
                  order.userName,
                  item.treeName,
                  item.quantity,
                  item.giftMessage || order.giftMessage,
                  item.occasion
                ).catch((emailError) => {
                  logError('Error sending gift recipient email', emailError as Error);
                });
              }
            });
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
          // Update user credits
          const user = await User.findById(order.userId);
          if (user) {
            const currentCredits = user.credits || 0;
            user.credits = currentCredits + creditsToAward;
            await user.save();

            // Store credits earned in order
            order.creditsEarned = creditsToAward;
            await order.save();

            logPaymentEvent('credits_awarded', {
              orderId: order.orderId,
              userId: order.userId,
              creditsAwarded: creditsToAward,
              newBalance: user.credits
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

