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
  latitude: z.number().min(-90).max(90, 'Invalid latitude').optional(),
  longitude: z.number().min(-180).max(180, 'Invalid longitude').optional(),
  plantingNotes: z.string().max(500, 'Planting notes cannot exceed 500 characters').optional(),
  // Optional location metadata from browser
  accuracy: z.number().min(0).optional(),
  altitude: z.number().optional(),
  altitudeAccuracy: z.number().min(0).optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  source: z.string().optional(),
  permissionState: z.enum(['granted', 'prompt', 'denied']).optional(),
  clientTimestamp: z.number().optional() // ms since epoch
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
    const latitudeStr = formData.get('latitude') as string;
    const longitudeStr = formData.get('longitude') as string;
    const plantingNotes = (formData.get('plantingNotes') as string) || '';
    // Optional metadata
    const accuracyStr = formData.get('accuracy') as string | null;
    const altitudeStr = formData.get('altitude') as string | null;
    const altitudeAccuracyStr = formData.get('altitudeAccuracy') as string | null;
    const headingStr = formData.get('heading') as string | null;
    const speedStr = formData.get('speed') as string | null;
    const source = (formData.get('source') as string) || undefined;
    const permissionState = (formData.get('permissionState') as 'granted'|'prompt'|'denied' | null) || undefined;
    const clientTimestampStr = formData.get('clientTimestamp') as string | null;
    const images = formData.getAll('images') as File[];

    // Parse coordinates (optional - location can be skipped if unavailable)
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (latitudeStr && longitudeStr) {
      const parsedLat = parseFloat(latitudeStr);
      const parsedLng = parseFloat(longitudeStr);

      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        // Only set if both are valid numbers
        if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
          latitude = parsedLat;
          longitude = parsedLng;
        }
      }
    }

    // Validate required fields
    const validationResult = plantingDetailsSchema.safeParse({
      taskId,
      orderId,
      latitude,
      longitude,
      plantingNotes,
      accuracy: accuracyStr ? parseFloat(accuracyStr) : undefined,
      altitude: altitudeStr ? parseFloat(altitudeStr) : undefined,
      altitudeAccuracy: altitudeAccuracyStr ? parseFloat(altitudeAccuracyStr) : undefined,
      heading: headingStr ? parseFloat(headingStr) : undefined,
      speed: speedStr ? parseFloat(speedStr) : undefined,
      source,
      permissionState,
      clientTimestamp: clientTimestampStr ? parseInt(clientTimestampStr, 10) : undefined
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
          caption: `Planting image for ${order.wellwisherTasks?.[taskIndex]?.task || 'tree'}`,
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

    // Prepare planting details
    const completedAt = new Date();
    const nextGrowthUpdateDue = new Date(completedAt);
    nextGrowthUpdateDue.setDate(nextGrowthUpdateDue.getDate() + 30); // 30 days from completion

    const plantingDetailsData: {
      plantedAt: Date;
      plantingLocation?: {
        type: 'Point';
        coordinates: [number, number];
      };
      locationMeta?: {
        accuracy?: number;
        altitude?: number;
        altitudeAccuracy?: number;
        heading?: number;
        speed?: number;
        source?: string;
        permissionState?: string;
        clientTimestamp?: Date;
      };
      plantingImages: typeof uploadedImages;
      plantingNotes: string;
      completedAt: Date;
    } = {
      plantedAt: new Date(),
      plantingImages: uploadedImages,
      plantingNotes: plantingNotes || '',
      completedAt: completedAt
    };

    // Only add location if coordinates are available
    if (latitude !== undefined && longitude !== undefined) {
      plantingDetailsData.plantingLocation = {
        type: 'Point' as const,
        coordinates: [longitude, latitude] as [number, number]
      };

      plantingDetailsData.locationMeta = {
        accuracy: accuracyStr ? parseFloat(accuracyStr) : undefined,
        altitude: altitudeStr ? parseFloat(altitudeStr) : undefined,
        altitudeAccuracy: altitudeAccuracyStr ? parseFloat(altitudeAccuracyStr) : undefined,
        heading: headingStr ? parseFloat(headingStr) : undefined,
        speed: speedStr ? parseFloat(speedStr) : undefined,
        source: source || undefined,
        permissionState: permissionState || undefined,
        clientTimestamp: clientTimestampStr ? new Date(parseInt(clientTimestampStr, 10)) : undefined
      };
    }

    // Use atomic update to ensure consistency and prevent race conditions
    // Only update if task is still in_progress (prevents double-completion)
    const updateResult = await Order.findOneAndUpdate(
      {
        _id: orderId,
        assignedWellwisher: session.user.id,
        'wellwisherTasks.taskId': taskId,
        'wellwisherTasks.status': 'in_progress' // Ensure task is still in_progress
      },
      {
        $set: {
          'wellwisherTasks.$.status': 'completed',
          'wellwisherTasks.$.plantingDetails': plantingDetailsData,
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
        { success: false, error: 'Task not found, not in progress, or status has changed. Please refresh and try again.' },
        { status: 400 }
      );
    }

    // Check if all tasks are completed and update order status if needed
    const allTasksCompleted = updateResult.wellwisherTasks?.every(task => task.status === 'completed');
    if (allTasksCompleted && updateResult.status !== 'completed') {
      await Order.findByIdAndUpdate(orderId, { status: 'completed' });
    }

    const responseData: {
      taskId: string;
      plantedAt: Date;
      imagesCount: number;
      location?: { latitude: number; longitude: number };
      locationMeta?: {
        accuracy?: number;
        altitude?: number;
        altitudeAccuracy?: number;
        heading?: number;
        speed?: number;
        source?: string;
        permissionState?: string;
        clientTimestamp?: Date;
      };
    } = {
      taskId,
      plantedAt: new Date(),
      imagesCount: uploadedImages.length
    };

    // Only include location data if available
    if (latitude !== undefined && longitude !== undefined) {
      responseData.location = { latitude, longitude };
      responseData.locationMeta = {
        accuracy: accuracyStr ? parseFloat(accuracyStr) : undefined,
        altitude: altitudeStr ? parseFloat(altitudeStr) : undefined,
        altitudeAccuracy: altitudeAccuracyStr ? parseFloat(altitudeAccuracyStr) : undefined,
        heading: headingStr ? parseFloat(headingStr) : undefined,
        speed: speedStr ? parseFloat(speedStr) : undefined,
        source: source || undefined,
        permissionState: permissionState || undefined,
        clientTimestamp: clientTimestampStr ? new Date(parseInt(clientTimestampStr, 10)) : undefined
      };
    }

    return NextResponse.json({
      success: true,
      message: latitude !== undefined && longitude !== undefined 
        ? 'Planting details uploaded successfully with location'
        : 'Planting details uploaded successfully (location not available)',
      data: responseData
    });

  } catch (error: unknown) {
    console.error('Planting upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload planting details';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: errorStack
      },
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

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch planting details' },
      { status: 500 }
    );
  }
}
