import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { uploadToCloudinary } from '@/lib/upload';
import { nanoid } from 'nanoid';

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
    const notes = (formData.get('notes') as string) || '';
    const images = formData.getAll('images') as File[];

    if (!taskId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Task ID and Order ID are required' },
        { status: 400 }
      );
    }

    // Validate images
    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one growth image is required' },
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

    const task = order.wellwisherTasks?.[taskIndex];
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task is completed
    if (task.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Task must be completed to upload growth updates' },
        { status: 400 }
      );
    }

    // Check if task has planting details
    if (!task.plantingDetails?.completedAt) {
      return NextResponse.json(
        { success: false, error: 'Task does not have planting details' },
        { status: 400 }
      );
    }

    // Calculate days since planting
    const completedAt = task.plantingDetails.completedAt;
    const daysSincePlanting = Math.floor(
      (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Upload images to Cloudinary
    const uploadedImages = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        // Validate image file
        if (!(image instanceof File)) {
          return NextResponse.json(
            { success: false, error: `Invalid image file at index ${i}` },
            { status: 400 }
          );
        }

        // Check file size (max 10MB per image)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (image.size > maxSize) {
          return NextResponse.json(
            { success: false, error: `Image ${i + 1} is too large. Maximum size is 10MB` },
            { status: 400 }
          );
        }

        const result = await uploadToCloudinary(image);
        uploadedImages.push({
          url: result.url,
          publicId: result.publicId,
          caption: `Growth update image - Day ${daysSincePlanting}`,
          uploadedAt: new Date()
        });
      } catch (error: unknown) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          { 
            success: false, 
            error: `Failed to upload image ${i + 1}`,
            details: errorMessage
          },
          { status: 500 }
        );
      }
    }

    // Create growth update entry
    const updateId = nanoid();
    const growthUpdate = {
      updateId,
      uploadedAt: new Date(),
      images: uploadedImages,
      notes: notes || '',
      daysSincePlanting
    };

    // Calculate next growth update due date (30 days from now)
    const nextGrowthUpdateDue = new Date();
    nextGrowthUpdateDue.setDate(nextGrowthUpdateDue.getDate() + 30);

    // Use atomic update to add growth update and update next due date
    const updateResult = await Order.findOneAndUpdate(
      {
        _id: orderId,
        assignedWellwisher: session.user.id,
        'wellwisherTasks.taskId': taskId,
        'wellwisherTasks.status': 'completed'
      },
      {
        $push: {
          'wellwisherTasks.$.growthUpdates': growthUpdate
        },
        $set: {
          'wellwisherTasks.$.nextGrowthUpdateDue': nextGrowthUpdateDue
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updateResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to update task. Please refresh and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Growth update uploaded successfully',
      data: {
        taskId,
        updateId,
        uploadedAt: new Date(),
        imagesCount: uploadedImages.length,
        daysSincePlanting,
        nextGrowthUpdateDue
      }
    });

  } catch (error: unknown) {
    console.error('Growth update upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload growth update';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

