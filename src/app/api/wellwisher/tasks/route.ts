import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a wellwisher
    if (session.user.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Wellwisher role required.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const needsGrowthUpdate = searchParams.get('needsGrowthUpdate') === 'true';

    // Find orders assigned to this wellwisher that have tasks with the specified status
    // Use aggregation to filter tasks by status more precisely
    // First unwind to get individual tasks, then filter by status to ensure accuracy
    const matchConditions: Record<string, unknown> = {
      assignedWellwisher: session.user.id,
      wellwisherTasks: { $exists: true, $ne: [] }
    };

    // If fetching tasks needing growth updates, filter differently
    if (needsGrowthUpdate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchConditions['wellwisherTasks.status'] = 'completed';
      matchConditions['wellwisherTasks.nextGrowthUpdateDue'] = { $lte: today };
    } else {
      matchConditions['wellwisherTasks.status'] = status;
    }

    const tasksAggregation = await Order.aggregate([
      {
        $match: matchConditions
      },
      {
        $unwind: '$wellwisherTasks'
      },
      {
        $match: needsGrowthUpdate ? {
          'wellwisherTasks.status': 'completed',
          'wellwisherTasks.nextGrowthUpdateDue': { $lte: new Date(new Date().setHours(0, 0, 0, 0)) }
        } : {
          'wellwisherTasks.status': status
        }
      },
      {
        $project: {
          orderId: '$_id',
          taskId: '$wellwisherTasks.taskId',
          task: '$wellwisherTasks.task',
          description: '$wellwisherTasks.description',
          scheduledDate: '$wellwisherTasks.scheduledDate',
          priority: '$wellwisherTasks.priority',
          status: '$wellwisherTasks.status',
          location: '$wellwisherTasks.location',
          plantingDetails: '$wellwisherTasks.plantingDetails',
          nextGrowthUpdateDue: '$wellwisherTasks.nextGrowthUpdateDue',
          growthUpdates: '$wellwisherTasks.growthUpdates',
          isGift: 1,
          giftRecipientName: 1,
          giftRecipientEmail: 1,
          giftMessage: 1,
          totalAmount: 1,
          items: 1,
          createdAt: 1
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ]);

    // Transform aggregation results to task format
    type TaskAggregationResult = {
      orderId: { toString(): string } | string;
      taskId: string;
      task: string;
      description: string;
      scheduledDate: Date;
      priority: string;
      status: string;
      location?: string;
      plantingDetails?: {
        plantedAt: Date;
        plantingLocation: {
          type: string;
          coordinates: [number, number];
        };
        plantingImages: Array<{
          url: string;
          publicId: string;
          caption?: string;
          uploadedAt: Date;
        }>;
        plantingNotes?: string;
        completedAt: Date;
      };
      nextGrowthUpdateDue?: Date;
      growthUpdates?: Array<{
        updateId: string;
        uploadedAt: Date;
        images: Array<{
          url: string;
          publicId: string;
          caption?: string;
          uploadedAt: Date;
        }>;
        notes?: string;
        daysSincePlanting: number;
      }>;
      isGift: boolean;
      giftRecipientName?: string;
      giftRecipientEmail?: string;
      giftMessage?: string;
      totalAmount: number;
      items: unknown[];
      createdAt: Date;
    };
    const tasks = tasksAggregation.map((taskDoc: TaskAggregationResult) => ({
      id: taskDoc.taskId,
      orderId: typeof taskDoc.orderId === 'string' ? taskDoc.orderId : taskDoc.orderId.toString(),
      task: taskDoc.task,
      description: taskDoc.description,
      scheduledDate: taskDoc.scheduledDate,
      priority: taskDoc.priority,
      status: taskDoc.status,
      location: taskDoc.location || 'To be determined',
      plantingDetails: taskDoc.plantingDetails ? {
        plantedAt: taskDoc.plantingDetails.plantedAt,
        plantingLocation: taskDoc.plantingDetails.plantingLocation,
        plantingImages: taskDoc.plantingDetails.plantingImages,
        plantingNotes: taskDoc.plantingDetails.plantingNotes,
        completedAt: taskDoc.plantingDetails.completedAt
      } : undefined,
      nextGrowthUpdateDue: taskDoc.nextGrowthUpdateDue,
      growthUpdates: taskDoc.growthUpdates || [],
      orderDetails: {
        isGift: taskDoc.isGift,
        giftRecipientName: taskDoc.giftRecipientName,
        giftRecipientEmail: taskDoc.giftRecipientEmail,
        giftMessage: taskDoc.giftMessage,
        totalAmount: taskDoc.totalAmount,
        items: taskDoc.items
      }
    }));

    // Count total tasks with the specified status
    // Use same logic as main query to ensure consistency
    const countMatchConditions: Record<string, unknown> = {
      assignedWellwisher: session.user.id,
      wellwisherTasks: { $exists: true, $ne: [] }
    };

    if (needsGrowthUpdate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      countMatchConditions['wellwisherTasks.status'] = 'completed';
      countMatchConditions['wellwisherTasks.nextGrowthUpdateDue'] = { $lte: today };
    } else {
      countMatchConditions['wellwisherTasks.status'] = status;
    }

    const totalCountResult = await Order.aggregate([
      {
        $match: countMatchConditions
      },
      {
        $unwind: '$wellwisherTasks'
      },
      {
        $match: needsGrowthUpdate ? {
          'wellwisherTasks.status': 'completed',
          'wellwisherTasks.nextGrowthUpdateDue': { $lte: new Date(new Date().setHours(0, 0, 0, 0)) }
        } : {
          'wellwisherTasks.status': status
        }
      },
      {
        $count: 'total'
      }
    ]);
    
    const totalCount = totalCountResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { taskId, status, orderId } = body;

    if (!taskId || !status || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Task ID, status, and order ID are required' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the order and task first to check current status
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

    const currentTask = order.wellwisherTasks?.[taskIndex];
    if (!currentTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const currentStatus = currentTask.status;

    // Validate status transitions - prevent invalid transitions
    // Only allow: pending -> in_progress -> completed
    // Prevent: completed -> pending or completed -> in_progress
    if (currentStatus === 'completed' && status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot change status of a completed task' },
        { status: 400 }
      );
    }

    // Prevent: in_progress -> pending (tasks should only move forward)
    if (currentStatus === 'in_progress' && status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot move task back to pending once it is in progress' },
        { status: 400 }
      );
    }

    // Use atomic update to ensure consistency
    const updateResult = await Order.findOneAndUpdate(
      { 
        _id: orderId, 
        assignedWellwisher: session.user.id,
        'wellwisherTasks.taskId': taskId,
        'wellwisherTasks.status': currentStatus // Ensure we're updating the task with the expected current status
      },
      {
        $set: {
          [`wellwisherTasks.$.status`]: status
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updateResult) {
      return NextResponse.json(
        { success: false, error: 'Task not found or status has changed. Please refresh and try again.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task status updated successfully'
    });

  } catch (_error) {
    console.error('Error updating task status:', _error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}
