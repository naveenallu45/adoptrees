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

    // Find orders assigned to this wellwisher that have tasks with the specified status
    // Use aggregation to filter tasks by status more precisely
    const tasksAggregation = await Order.aggregate([
      {
        $match: {
          assignedWellwisher: session.user.id,
          'wellwisherTasks.status': status
        }
      },
      {
        $unwind: '$wellwisherTasks'
      },
      {
        $match: {
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
    const totalCountResult = await Order.aggregate([
      {
        $match: {
          assignedWellwisher: session.user.id,
          'wellwisherTasks.status': status
        }
      },
      {
        $unwind: '$wellwisherTasks'
      },
      {
        $match: {
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

    // Update the task status
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

    // Update the specific task
    const taskIndex = order.wellwisherTasks?.findIndex(task => task.taskId === taskId);
    if (taskIndex === -1 || taskIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    if (order.wellwisherTasks) {
      order.wellwisherTasks[taskIndex].status = status;
      await order.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Task status updated successfully'
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}
