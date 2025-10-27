import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { uploadToCloudinary } from '@/lib/upload';
import { z } from 'zod';

// Validation schema for planting details
const plantingDetailsSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  plantingNotes: z.string().max(500, 'Planting notes cannot exceed 500 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Wellwisher role required.' },
        { status: 403 }
      );
    }

    await connectDB();

    // Parse form data
    const formData = await request.formData();
    const taskId = formData.get('taskId') as string;
    const orderId = formData.get('orderId') as string;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);
    const plantingNotes = formData.get('plantingNotes') as string;
    const images = formData.getAll('images') as File[];

    // Validate required fields
    const validationResult = plantingDetailsSchema.safeParse({
      taskId,
      orderId,
      latitude,
      longitude,
      plantingNotes
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationResult.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    // Validate images
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

    // Check if order exists and is assigned to this wellwisher
    const order = await Order.findOne({ 
      _id: orderId, 
      assignedWellwisher: session.user.id 
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Find the specific task
    const taskIndex = order.wellwisherTasks?.findIndex(task => task.taskId === taskId);
    if (taskIndex === -1 || taskIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task is in progress
    if (order.wellwisherTasks && order.wellwisherTasks[taskIndex] && order.wellwisherTasks[taskIndex].status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: 'Task must be in progress to upload planting details' },
        { status: 400 }
      );
    }

    // Upload images to Cloudinary
    const uploadedImages = [];
    for (const image of images) {
      try {
        const result = await uploadToCloudinary(image);
        uploadedImages.push({
          url: result.url,
          publicId: result.publicId,
          caption: `Planting image for ${order.wellwisherTasks?.[taskIndex]?.task || 'tree'}`,
          uploadedAt: new Date()
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to upload image' },
          { status: 500 }
        );
      }
    }

    // Update the task with planting details
    if (order.wellwisherTasks && order.wellwisherTasks[taskIndex]) {
      order.wellwisherTasks[taskIndex].status = 'completed';
      (order.wellwisherTasks[taskIndex] as unknown as { plantingDetails: Record<string, unknown> }).plantingDetails = {
        plantedAt: new Date(),
        plantingLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        plantingImages: uploadedImages,
        plantingNotes: plantingNotes || '',
        completedAt: new Date()
      };

      // Update order status if all tasks are completed
      const allTasksCompleted = order.wellwisherTasks?.every(task => task.status === 'completed');
      if (allTasksCompleted) {
        order.status = 'completed';
      }

      await order.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Planting details uploaded successfully',
      data: {
        taskId,
        plantedAt: new Date(),
        imagesCount: uploadedImages.length,
        location: { latitude, longitude }
      }
    });

  } catch (error) {
    console.error('Error uploading planting details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload planting details' },
      { status: 500 }
    );
  }
}

// Get planting details for a specific task
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const orderId = searchParams.get('orderId');

    if (!taskId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Task ID and Order ID are required' },
        { status: 400 }
      );
    }

    // Find the order and task
    const order = await Order.findOne({ 
      _id: orderId,
      ...(session.user.role === 'wellwisher' ? { assignedWellwisher: session.user.id } : {})
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const task = order.wellwisherTasks?.find(task => task.taskId === taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.taskId,
        status: task.status,
        plantingDetails: (task as unknown as { plantingDetails?: Record<string, unknown> }).plantingDetails || null
      }
    });

  } catch (error) {
    console.error('Error fetching planting details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch planting details' },
      { status: 500 }
    );
  }
}
