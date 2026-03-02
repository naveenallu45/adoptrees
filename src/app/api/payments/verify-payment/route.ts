import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { logPaymentEvent, logError } from '@/lib/logger';
import { processOrderCompletion } from '@/lib/order-processing';
import { generateCertificate } from '@/lib/certificate';
// Removed Cloudinary upload - certificates stored only in database

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for payment verification
    const rateLimitResult = await checkRateLimit(request, {
      maxRequests: 20, // 20 verification attempts per minute
      windowMs: 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const session = await auth();
    
    if (!session?.user) {
      logPaymentEvent('payment_verification_failed', { reason: 'authentication_required' });
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    await connectDB();

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logPaymentEvent('payment_verification_failed', { reason: 'missing_verification_data' });
      return NextResponse.json(
        { success: false, error: 'Payment verification data is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Find the order first to determine which Razorpay account to use
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      logPaymentEvent('payment_verification_failed', { 
        reason: 'order_not_found',
        orderId 
      });
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // PRODUCTION: Validate Razorpay secret is configured
    // Use company account secret for company users, regular secret for others
    let razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (order.userType === 'company' && process.env.RAZORPAY_COMPANY_KEY_SECRET) {
      razorpaySecret = process.env.RAZORPAY_COMPANY_KEY_SECRET;
    }
    
    if (!razorpaySecret) {
      logError('Razorpay key secret not configured', new Error('RAZORPAY_KEY_SECRET is missing'));
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Verify the payment signature
    const generated_signature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logPaymentEvent('payment_verification_failed', { 
        reason: 'signature_mismatch',
        orderId,
        razorpay_order_id,
        razorpay_payment_id
      });
      
      // Payment verification failed
      if (orderId) {
        const order = await Order.findOne({ orderId });
        if (order && order.paymentStatus === 'pending') {
          order.paymentStatus = 'failed';
          await order.save();
        }
      }

      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Order already fetched above for signature verification

    // Check if order already processed
    if (order.paymentStatus === 'paid') {
      // Generate certificate if it doesn't exist
      if (!order.certificate) {
        try {
          // Fetch latest user profile picture and name from database
          // Users frequently change their profile picture, so we always fetch the latest one
          // This ensures certificate always shows the most up-to-date profile
          // For dealer orders, use customer's account (customerUserId) instead of dealer's account
          // This ensures we use the customer's existing QR code and public ID
          const userIdToUse = (order.userType === 'dealer' && order.customerUserId) 
            ? order.customerUserId 
            : order.userId;
          const user = await User.findById(userIdToUse).select('publicId qrCode image name companyName userType');
          if (user && user.publicId) {
            const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);
            // Calculate CO2 from order items - use actual tree CO2 value (can be negative), only fallback if not provided
            const co2Kgs = order.items.reduce((sum, item) => {
              // Use item.co2Kgs if it's defined (including 0 or negative values), otherwise calculate from oxygen
              const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null) 
                ? item.co2Kgs * item.quantity
                : (item.oxygenKgs * 0.715) * item.quantity;
              return sum + itemCo2;
            }, 0);
            
            // Collect unique tree names from order items
            const treeNames: string[] = [];
            order.items.forEach(item => {
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
              profilePicUrl = user.image || undefined;
            } else {
              // For regular orders, use the user's account info
              if (user.userType === 'company' || user.userType === 'dealer') {
                certificateUserName = user.companyName || user.name || order.userName || (user.userType === 'dealer' ? 'Dealer' : 'Company');
              } else {
                certificateUserName = user.name || order.userName || 'User';
              }
              // Always fetch fresh from database to ensure certificate uses current profile picture
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
                console.warn('[VERIFY-PAYMENT] Error fetching dealer profile:', dealerError);
              }
            }

            const certificateBuffer = await generateCertificate({
              userName: certificateUserName,
              profilePicUrl: profilePicUrl,
              treesCount,
              oxygenKgs,
              co2Kgs: co2Kgs, // Always pass CO2 (calculated from items or oxygen)
              treeNames: treeNames.length > 0 ? treeNames : undefined,
              publicId: user.publicId,
              orderId: order.orderId,
              qrCode: user.qrCode, // Use stored QR code from user
              dealerName, // Dealer name for dealer orders
              vehicleName, // Vehicle name for dealer orders
              dealerImageUrl, // Dealer profile image for dealer orders
            });
            
            // Don't store certificate - generate on-demand when needed
            // Certificate generation logged but not stored
            logPaymentEvent('certificate_generated_for_existing_order', {
              orderId: order.orderId,
              certificateSize: certificateBuffer.length
            });
          }
        } catch (certError) {
          logError('Error generating certificate for existing order', certError as Error);
        }
      }
      
      logPaymentEvent('payment_verification_already_processed', { 
        orderId,
        paymentStatus: order.paymentStatus 
      });
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        data: {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Update order with payment details
    order.paymentStatus = 'paid';
    order.paymentId = razorpay_payment_id;
    // Store Razorpay order ID if not already stored
    if (!order.razorpayOrderId && razorpay_order_id) {
      order.razorpayOrderId = razorpay_order_id;
    }
    order.status = 'confirmed';
    await order.save();

    // OPTIMIZED: Return success immediately for better UX
    // Process heavy tasks (certificate, emails) in background
    // This ensures payment verification is fast (< 1 second)
    
    // Fire-and-forget: Process order completion asynchronously
    // This doesn't block the payment response
    processOrderCompletion(order).then((processingResult) => {
      // Log the processing result to track email completion
      if (!processingResult.success || !processingResult.completed.email) {
        logError('Order processing completed but email may have failed', new Error(processingResult.error || 'Email not sent'), {
          orderId: order.orderId,
          paymentId: razorpay_payment_id,
          completed: processingResult.completed
        });
      } else {
        logPaymentEvent('order_processing_completed_successfully', {
          orderId: order.orderId,
          completed: processingResult.completed
        });
      }
    }).catch((processingError) => {
      logError('Error in background order processing', processingError as Error, {
        orderId: order.orderId,
        paymentId: razorpay_payment_id
      });
      // Order is already marked as paid - reconciliation cron will retry if needed
    });

    // Log payment verification
    logPaymentEvent('payment_verification_successful', {
      orderId: order.orderId,
      paymentId: razorpay_payment_id,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      backgroundProcessing: true
    });
    
    // Return success immediately - user gets instant feedback
    // Include pricing breakdown for display in success dialog
    const originalAmount = order.totalAmount; // Original amount before any discounts
    const couponDiscount = order.couponDiscount || 0;
    const creditsUsed = order.creditsUsed || 0;
    // Calculate final amount: original - coupon discount - credits
    // Use stored finalAmount if available, otherwise calculate it
    const finalAmount = order.finalAmount !== undefined 
      ? order.finalAmount 
      : (originalAmount - couponDiscount - creditsUsed);
    
    // Ensure originalAmount is always set when discounts or credits are applied
    const shouldShowBreakdown = couponDiscount > 0 || creditsUsed > 0;
    
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        totalAmount: finalAmount, // Final amount paid (after discounts and credits)
        originalAmount: shouldShowBreakdown ? originalAmount : undefined, // Original amount before discounts (only if discounts/credits applied)
        couponDiscount: couponDiscount > 0 ? couponDiscount : undefined, // Discount from coupon
        creditsUsed: creditsUsed > 0 ? creditsUsed : undefined, // Green credits used (in points)
        couponCode: order.couponCode || null, // Coupon code if applied
        items: order.items.length
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

    // Legacy code block - keeping for reference but should not execute
    /* try {
      // Calculate values needed for certificate and emails
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Get user details for certificate generation (including latest profile picture)
      // Always fetch latest profile picture since users frequently change their profile
      // Include companyName and userType to properly handle company users
      // For dealer orders, use customer's account (customerUserId) instead of dealer's account
      // This ensures we use the customer's existing QR code and public ID
      const userIdToUse = (order.userType === 'dealer' && order.customerUserId) 
        ? order.customerUserId 
        : order.userId;
      
      const userResult = await Promise.allSettled([
        User.findById(userIdToUse).select('publicId qrCode image name companyName userType')
      ]);
      const user = userResult[0];
      
      // Fallback to dealer account if customer account not found (shouldn't happen, but safety net)
      if ((user.status === 'rejected' || !user.value) && order.userType === 'dealer' && order.customerUserId) {
        const dealerUserResult = await Promise.allSettled([
          User.findById(order.userId).select('publicId qrCode image name companyName userType')
        ]);
        const dealerUser = dealerUserResult[0];
        if (dealerUser.status === 'fulfilled' && dealerUser.value) {
          // Use dealer account as fallback
          user.status = 'fulfilled';
          user.value = dealerUser.value;
        }
      }

      // Create wellwisher tasks - assign using equal distribution
      if (!order.assignedWellwisher || !order.wellwisherTasks || order.wellwisherTasks.length === 0) {
        try {
          const { assignWellWisherEqually } = await import('@/lib/utils/wellwisher-assignment');
          const wellwisherId = await assignWellWisherEqually();
        
          if (wellwisherId) {
            console.log(`[PAYMENT_VERIFY] Assigning well-wisher ${wellwisherId} to order ${order.orderId}`);
            const wellwisherTasks = order.items.map((item, index) => ({
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

            // Send task assignment email to well-wisher (non-blocking)
            User.findById(wellwisherId).select('email name').then(async (wellWisher) => {
              if (wellWisher) {
                try {
                  const emailSent = await sendWellWisherTaskAssignmentEmail(
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
                  
                  if (emailSent) {
                    logPaymentEvent('wellwisher_task_assignment_email_sent', {
                      orderId: order.orderId,
                      wellwisherEmail: wellWisher.email,
                      wellwisherId: wellwisherId
                    });
                    console.log(`[PAYMENT_VERIFY] Task assignment email sent successfully to well-wisher ${wellWisher.email} for order ${order.orderId}`);
                  } else {
                    logError('Well-wisher task assignment email failed to send', new Error(`Email returned false for order ${order.orderId}, well-wisher ${wellWisher.email}`));
                    console.error(`[PAYMENT_VERIFY] Task assignment email failed to send to well-wisher ${wellWisher.email} for order ${order.orderId}`);
                  }
                } catch (emailError) {
                  logError('Error sending task assignment email', emailError as Error);
                  console.error(`[PAYMENT_VERIFY] Error sending task assignment email to well-wisher ${wellWisher.email} for order ${order.orderId}:`, emailError);
                }
              } else {
                console.error(`[PAYMENT_VERIFY] Well-wisher not found for ID ${wellwisherId} for order ${order.orderId}`);
              }
            }).catch((findError) => {
              logError('Error finding well-wisher for email', findError as Error);
              console.error(`[PAYMENT_VERIFY] Error finding well-wisher ${wellwisherId} for order ${order.orderId}:`, findError);
            });
          } else {
            console.error(`[PAYMENT_VERIFY] Failed to assign well-wisher to order ${order.orderId} - no well-wisher available`);
            logError('Well-wisher assignment returned null', new Error(`Order ${order.orderId} could not be assigned a well-wisher`));
          }
        } catch (assignmentError) {
          console.error(`[PAYMENT_VERIFY] Error assigning well-wisher to order ${order.orderId}:`, assignmentError);
          logError('Error assigning well-wisher', assignmentError as Error);
        }
      } else {
        console.log(`[PAYMENT_VERIFY] Order ${order.orderId} already has well-wisher assigned: ${order.assignedWellwisher}`);
      }

      // Generate certificate if user found
      if (user.status === 'fulfilled' && user.value && user.value.publicId) {
        try {
            const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);
            const co2Kgs = order.items.reduce((sum, item) => {
              const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null) 
                ? item.co2Kgs * item.quantity
                : (item.oxygenKgs * 0.715) * item.quantity;
              return sum + itemCo2;
            }, 0);
            
            const treeNames: string[] = [];
            order.items.forEach(item => {
              if (!treeNames.includes(item.treeName)) {
                treeNames.push(item.treeName);
              }
            });

            // For dealer orders, always use customer's account info (not dealer's)
            // We already fetched the customer's account via customerUserId, so use that
            let certificateUserName: string;
            let profilePicUrl: string | undefined;
            
            if (order.userType === 'dealer' && order.customerUserId && user.status === 'fulfilled' && user.value) {
              // For dealer orders, use customer's account name and profile picture
              // Never use dealer's info - always use customer's account data
              certificateUserName = user.value.name || 'Customer';
              profilePicUrl = user.value.image || undefined;
            } else if (order.isGift && order.giftRecipientName) {
              // For gift orders, use gift recipient name
              certificateUserName = order.giftRecipientName;
              profilePicUrl = (user.status === 'fulfilled' && user.value) ? user.value.image : undefined;
            } else {
              // For regular orders, use the user's account info
              if (user.status === 'fulfilled' && user.value) {
                if (user.value.userType === 'company' || user.value.userType === 'dealer') {
                  certificateUserName = user.value.companyName || user.value.name || order.userName || (user.value.userType === 'dealer' ? 'Dealer' : 'Company');
                } else {
                  certificateUserName = user.value.name || order.userName || 'User';
                }
                // Get latest profile picture from user model (users can change their profile frequently)
                // Always fetch fresh from database to ensure certificate uses current profile picture
                profilePicUrl = user.value.image || undefined;
              } else {
                // Fallback if user not found
                certificateUserName = order.userName || 'User';
                profilePicUrl = undefined;
              }
            }
            
            console.log('[PAYMENT_VERIFY] Certificate generation data:', {
              userName: certificateUserName,
              hasImage: !!profilePicUrl,
              imageUrl: profilePicUrl ? profilePicUrl.substring(0, 50) + '...' : 'none',
              userType: user.value.userType
            });

            // Get dealer and vehicle info for dealer orders
            let dealerName: string | undefined;
            let vehicleName: string | undefined;
            if (order.userType === 'dealer' && order.items.length > 0) {
              dealerName = order.dealerName || order.showroomName || order.userName;
              const firstItem = order.items[0] as { vehicleName?: string };
              vehicleName = firstItem.vehicleName;
            }

            // Generate certificate (this is the slowest operation)
            const certificateBuffer = await generateCertificate({
              userName: certificateUserName,
              profilePicUrl: profilePicUrl,
              treesCount,
              oxygenKgs,
              co2Kgs,
              treeNames: treeNames.length > 0 ? treeNames : undefined,
              publicId: user.value.publicId,
              orderId: order.orderId,
              qrCode: user.value.qrCode,
              dealerName, // Dealer name for dealer orders
              vehicleName, // Vehicle name for dealer orders
            });

          // Don't store certificate - generate on-demand when needed
          // Certificate generation logged but not stored
          logPaymentEvent('certificate_generated_for_order', {
            orderId: order.orderId,
            certificateSize: certificateBuffer.length
          });

          // Send thank you email with certificate (await to ensure it runs)
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
                logPaymentEvent('thank_you_email_sent', {
                  orderId: order.orderId,
                  recipientEmail
                });
                console.log(`[PAYMENT_VERIFY] Thank you email sent successfully to ${recipientEmail} for order ${order.orderId}`);
              } else {
                logError('Thank you email failed to send', new Error(`Email returned false for order ${order.orderId}`));
                console.error(`[PAYMENT_VERIFY] Thank you email failed to send to ${recipientEmail} for order ${order.orderId}`);
              }
            } catch (emailError) {
              logError('Error sending thank you email', emailError as Error);
              console.error(`[PAYMENT_VERIFY] Error sending thank you email to ${recipientEmail} for order ${order.orderId}:`, emailError);
            }

            // Send greeting email to gift recipients (non-blocking)
            if (order.isGift && order.giftRecipientEmail) {
              // Send greeting email for each gift item
              // Use item recipientEmail if available, otherwise fall back to order-level giftRecipientEmail
              order.items.forEach((item) => {
                // If order is a gift, treat all items as gifts (or check item.adoptionType === 'gift')
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
                  ).then(() => {
                    logPaymentEvent('gift_recipient_greeting_email_sent', {
                      orderId: order.orderId,
                      recipientEmail: recipientEmail
                    });
                  }).catch((emailError) => {
                    logError('Error sending gift recipient greeting email', emailError as Error);
                  });
                }
              });
            }
        } catch (certError) {
          logError('Error generating certificate', certError as Error);
        }
      }
    } catch (backgroundError) {
      logError('Error in payment post-processing (certificate/email)', backgroundError as Error);
    } */


  } catch (_error) {
    logError('Error verifying payment', _error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

