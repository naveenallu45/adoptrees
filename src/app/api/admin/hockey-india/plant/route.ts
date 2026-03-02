import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { uploadToCloudinary } from '@/lib/upload';
import { assignWellWisherEqually } from '@/lib/utils/wellwisher-assignment';
import { sendWellWisherTaskAssignmentEmail } from '@/lib/email';
import { logPaymentEvent } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const latitudeStr = formData.get('latitude') as string;
    const longitudeStr = formData.get('longitude') as string;
    const notes = (formData.get('notes') as string) || '';
    const images = formData.getAll('images') as File[];

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!latitudeStr || !longitudeStr) {
      return NextResponse.json(
        { success: false, error: 'Planting location coordinates are required' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one planting image is required' },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 images allowed' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.userType !== 'hockey-india') {
      return NextResponse.json(
        { success: false, error: 'Order is not a Hockey India order' },
        { status: 400 }
      );
    }

    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Order is not paid' },
        { status: 400 }
      );
    }

    // 1. Assign well-wisher if not assigned (same as regular order processing)
    if (!order.assignedWellwisher || !order.wellwisherTasks || order.wellwisherTasks.length === 0) {
      try {
        const wellwisherId = await assignWellWisherEqually();
        
        if (!wellwisherId) {
          return NextResponse.json(
            { success: false, error: 'No well-wisher available for assignment' },
            { status: 500 }
          );
        }

        // Create one task per tree (not per item) - same as regular orders
        // Include Hockey India messaging in task descriptions
        const wellwisherTasks: Array<{
          taskId: string;
          task: string;
          description: string;
          scheduledDate: Date;
          status: 'pending';
          location: string;
        }> = [];
        let taskIndex = 0;
        order.items.forEach((item: { treeName: string; quantity: number }) => {
          // Create a separate task for each tree in the quantity
          for (let i = 0; i < item.quantity; i++) {
            wellwisherTasks.push({
              taskId: `${order.orderId}-${taskIndex}`,
              task: `Plant and care for ${item.treeName}`,
              description: `Plant 1 ${item.treeName} tree and provide ongoing care.

🏑 Hockey India Collaboration - FIH Hockey World Cup 2026 Qualifiers
📍 Location: Hyderabad, Telangana
🌱 Every goal grows something bigger! 🙏

50 trees for a PC 🏑
💯 trees for a field goal!
Every time the net shakes, the Earth breathes 🥅

This FIH Hockey World Cup 2026 Qualifiers Hyderabad, Telangana - every goal grows something bigger! 🙏`,
              scheduledDate: new Date(Date.now() + (taskIndex + 1) * 24 * 60 * 60 * 1000),
              status: 'pending' as const,
              location: 'To be determined'
            });
            taskIndex++;
          }
        });

        order.assignedWellwisher = wellwisherId;
        order.wellwisherTasks = wellwisherTasks;
        
        // Verify assignment was saved
        await order.save();
        const savedOrder = await Order.findById(order._id).select('assignedWellwisher wellwisherTasks').lean();
        if (!savedOrder || savedOrder.assignedWellwisher?.toString() !== wellwisherId) {
          return NextResponse.json(
            { success: false, error: 'Well-wisher assignment failed to save' },
            { status: 500 }
          );
        }

        logPaymentEvent('wellwisher_assigned', {
          orderId: order.orderId,
          wellwisherId,
          tasksCount: wellwisherTasks.length,
          source: 'admin_hockey_india'
        });

        // Send task assignment email to well-wisher (don't fail if email fails)
        try {
          const wellWisher = await User.findById(wellwisherId).select('email name');
          if (wellWisher && wellWisher.email) {
            const treesCount = order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
            
            await sendWellWisherTaskAssignmentEmail(
              wellWisher.email,
              wellWisher.name || '',
              order.orderId,
              wellwisherTasks, // Tasks with Hockey India messaging
              {
                totalTrees: treesCount,
                customerName: order.userName,
                isGift: false
              }
            );
          }
        } catch (emailError) {
          console.error('[HockeyIndia] Failed to send wellwisher assignment email:', emailError);
          // Don't fail the request if email fails
        }
      } catch (assignmentError) {
        console.error('[HockeyIndia] Error assigning well-wisher:', assignmentError);
        return NextResponse.json(
          { success: false, error: 'Failed to assign well-wisher' },
          { status: 500 }
        );
      }
    }

    // Reload order to get latest wellwisherTasks
    await order.populate('assignedWellwisher');
    const freshOrder = await Order.findById(orderId).lean();
    if (!freshOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found after wellwisher assignment' },
        { status: 500 }
      );
    }

    // 2. Upload images to Cloudinary
    const uploadedImages: Array<{
      url: string;
      publicId: string;
      caption?: string;
      uploadedAt: Date;
    }> = [];
    
    for (const image of images) {
      if (!(image instanceof File)) {
        continue;
      }

      // Validate image file
      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'Invalid image file type' },
          { status: 400 }
        );
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (image.size > maxSize) {
        return NextResponse.json(
          { success: false, error: `Image ${image.name} is too large. Maximum size is 10MB` },
          { status: 400 }
        );
      }

      try {
        // Upload to Cloudinary (uploadToCloudinary expects a File)
        const uploadResult = await uploadToCloudinary(
          image,
          'hockey-india/planting'
        );

        uploadedImages.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          caption: `Planting image for Hockey India order ${order.orderId}`,
          uploadedAt: new Date(),
        });
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return NextResponse.json(
          { success: false, error: `Failed to upload image: ${image.name}` },
          { status: 500 }
        );
      }
    }

    // 3. Store admin planting request details at order level (wellwisher will complete tasks)
    // Reload order as Mongoose document (not lean) to update
    const orderToUpdate = await Order.findById(orderId);
    if (!orderToUpdate) {
      return NextResponse.json(
        { success: false, error: 'Order not found for update' },
        { status: 500 }
      );
    }

    if (!orderToUpdate.wellwisherTasks || orderToUpdate.wellwisherTasks.length === 0) {
      console.error('[HockeyIndia] No wellwisher tasks found for order:', orderId);
      return NextResponse.json(
        { success: false, error: 'No wellwisher tasks found. Please ensure wellwisher is assigned.' },
        { status: 400 }
      );
    }

    // Update task locations with admin-provided coordinates (but keep tasks as pending)
    // This gives wellwisher the suggested location, but they can update it when planting
    orderToUpdate.wellwisherTasks.forEach((task) => {
      task.location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    });
    
    // Store admin planting request details at order level for reference
    // Wellwisher will complete tasks and add their own planting details when they actually plant
    orderToUpdate.plantingDetails = {
      plantedAt: new Date(), // Admin request date
      plantingLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      plantingImages: uploadedImages,
      plantingNotes: notes || `Admin planting request for Hockey India collaboration.

🏑 50 trees for a PC 🏑
💯 trees for a field goal!
Every time the net shakes, the Earth breathes 🥅

This FIH Hockey World Cup 2026 Qualifiers Hyderabad, Telangana - every goal grows something bigger! 🙏`,
    };

    // Update order status to 'confirmed' (wellwisher will change to 'completed' when done)
    if (orderToUpdate.status === 'pending') {
      orderToUpdate.status = 'confirmed';
    }

    await orderToUpdate.save();

    // 4. Log the admin planting request (not completion - wellwisher will complete)
    logPaymentEvent('hockey_india_planting_request', {
      orderId: orderToUpdate.orderId,
      treesCount: orderToUpdate.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
      wellwisherId: orderToUpdate.assignedWellwisher?.toString(),
      requestedBy: 'admin',
      location: { latitude, longitude }
    });

    return NextResponse.json({
      success: true,
      message: 'Planting request created successfully. Wellwisher has been assigned and notified.',
      data: {
        orderId: orderToUpdate.orderId,
        plantingRequest: orderToUpdate.plantingDetails,
        wellwisherId: orderToUpdate.assignedWellwisher?.toString(),
        tasksAssigned: orderToUpdate.wellwisherTasks?.length || 0,
        message: 'Wellwisher will complete the planting tasks. Tasks are now pending assignment.',
      },
    });
  } catch (error) {
    console.error('[HockeyIndia] Error planting trees:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to plant trees';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[HockeyIndia] Error details:', {
      message: errorMessage,
      stack: errorStack,
      orderId: formData.get('orderId') as string | undefined,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
