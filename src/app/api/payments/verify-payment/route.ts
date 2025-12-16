import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { logPaymentEvent, logError } from '@/lib/logger';
import { generateCertificate } from '@/lib/certificate';
import { sendThankYouEmailWithCertificate, sendWellWisherTaskAssignmentEmail, sendGiftRecipientGreetingEmail } from '@/lib/email';

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

    // Verify the payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
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

    // Find the order
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

    // Check if order already processed
    if (order.paymentStatus === 'paid') {
      // Generate certificate if it doesn't exist
      if (!order.certificate) {
        try {
          // Fetch latest user profile picture and name from database
          // Users frequently change their profile picture, so we always fetch the latest one
          // This ensures certificate always shows the most up-to-date profile
          const user = await User.findById(order.userId).select('publicId qrCode image name');
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
            
            // Use latest user name and profile picture from database
            // Users frequently change their profile picture, so we always fetch the latest one
            // This ensures certificate always shows the most up-to-date profile
            const certificateUserName = order.isGift && order.giftRecipientName 
              ? order.giftRecipientName 
              : (user.name || order.userName);
            // Always fetch fresh from database to ensure certificate uses current profile picture
            const profilePicUrl = user.image || undefined;
            
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
            });
            
            order.certificate = certificateBuffer;
            await order.save();
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
    order.status = 'confirmed';

    // OPTIMIZED: Run parallel operations for faster processing
    const [couponUpdateResult] = await Promise.allSettled([
      // Increment coupon usage count if coupon was used (non-blocking)
      order.couponCode ? Coupon.findOneAndUpdate(
        { code: order.couponCode },
        { $inc: { usedCount: 1 } }
      ) : Promise.resolve(null)
    ]);

    if (couponUpdateResult.status === 'rejected') {
      logError('Error incrementing coupon usage count', couponUpdateResult.reason as Error);
    }

    // Save order immediately (before heavy operations)
    await order.save();

    // OPTIMIZED: Return response immediately, process heavy operations in background
    // This dramatically reduces payment processing delay
    const response = NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        items: order.items.length
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

    // Process heavy operations in background (non-blocking)
    // This includes: certificate generation, well-wisher assignment, and email sending
    setImmediate(async () => {
      try {
        // Calculate values needed for certificate and emails
        const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        
        // Get user details for certificate generation (including latest profile picture)
        // Always fetch latest profile picture since users frequently change their profile
        const userResult = await Promise.allSettled([
          User.findById(order.userId).select('publicId qrCode image name')
        ]);
        const user = userResult[0];

        // Create wellwisher tasks - assign using equal distribution (non-blocking)
        if (!order.assignedWellwisher || !order.wellwisherTasks || order.wellwisherTasks.length === 0) {
          (async () => {
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
                      console.error('Error sending task assignment email:', emailError);
                    }
                  }
                }).catch(() => {}); // Ignore errors
              } else {
                console.error(`[PAYMENT_VERIFY] Failed to assign well-wisher to order ${order.orderId} - no well-wisher available`);
                logError('Well-wisher assignment returned null', new Error(`Order ${order.orderId} could not be assigned a well-wisher`));
              }
            } catch (assignmentError) {
              console.error(`[PAYMENT_VERIFY] Error assigning well-wisher to order ${order.orderId}:`, assignmentError);
              logError('Error assigning well-wisher', assignmentError as Error);
            }
          })();
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

            // Use latest user name and profile picture from database (not from order)
            // This ensures certificate always shows the most up-to-date profile
            // Users frequently change their profile picture, so we always fetch the latest one
            const certificateUserName = order.isGift && order.giftRecipientName 
              ? order.giftRecipientName 
              : (user.value.name || order.userName);
            
            // Get latest profile picture from user model (users can change their profile frequently)
            // Always fetch fresh from database to ensure certificate uses current profile picture
            const profilePicUrl = user.value.image || undefined;

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
            });

            // Update order with certificate
            order.certificate = certificateBuffer;
            await order.save();

            // Send thank you email with certificate (non-blocking)
            const recipientEmail = order.isGift && order.giftRecipientEmail 
              ? order.giftRecipientEmail 
              : order.userEmail;
            const recipientName = order.isGift && order.giftRecipientName 
              ? order.giftRecipientName 
              : order.userName;
            
            sendThankYouEmailWithCertificate(
              recipientEmail,
              recipientName,
              order.orderId,
              treesCount,
              certificateBuffer
            ).then(() => {
              logPaymentEvent('thank_you_email_sent', {
                orderId: order.orderId,
                recipientEmail
              });
            }).catch((emailError) => {
              logError('Error sending thank you email', emailError as Error);
            });

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
        logError('Error in background payment processing', backgroundError as Error);
      }
    });

    logPaymentEvent('payment_verification_successful', {
      orderId: order.orderId,
      paymentId: razorpay_payment_id,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length
    });

    return response;

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

