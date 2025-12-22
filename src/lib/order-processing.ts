import { IOrder } from '@/models/Order';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import { logPaymentEvent, logError } from '@/lib/logger';
import { sendWellWisherTaskAssignmentEmail, sendThankYouEmailWithCertificate, sendGiftRecipientGreetingEmail } from '@/lib/email';
import { generateCertificate } from '@/lib/certificate';
import { uploadCertificateToCloudinary } from '@/lib/upload';

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
      
        if (wellwisherId) {
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
          result.completed.wellwisher = true;

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
        }
      } catch (assignmentError) {
        logError('Error assigning well-wisher', assignmentError as Error);
      }
    } else {
      result.completed.wellwisher = true; // Already assigned
    }

    // 2. Generate certificate if not exists
    if (!order.certificate) {
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

          // Upload certificate to Cloudinary and store URL
          try {
            const { url: certificateUrl } = await uploadCertificateToCloudinary(
              certificateBuffer,
              order.orderId
            );
            order.certificateUrl = certificateUrl;
            logPaymentEvent('certificate_uploaded_to_cloudinary', {
              orderId: order.orderId,
              certificateUrl
            });
          } catch (uploadError) {
            logError('Failed to upload certificate to Cloudinary', uploadError as Error, {
              orderId: order.orderId
            });
            // Continue with storing buffer as fallback
            order.certificate = certificateBuffer;
          }
          
          await order.save();
          result.completed.certificate = true;

          // 3. Send thank you email with certificate
          const recipientEmail = order.isGift && order.giftRecipientEmail 
            ? order.giftRecipientEmail 
            : order.userEmail;
          const recipientName = order.isGift && order.giftRecipientName 
            ? order.giftRecipientName 
            : order.userName;
          
          try {
            const emailSent = await sendThankYouEmailWithCertificate(
              recipientEmail,
              recipientName,
              order.orderId,
              treesCount,
              certificateBuffer
            );
            
            if (emailSent) {
              result.completed.email = true;
            }
          } catch (emailError) {
            logError('Error sending thank you email', emailError as Error);
          }

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
    } else {
      result.completed.certificate = true; // Already exists
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

