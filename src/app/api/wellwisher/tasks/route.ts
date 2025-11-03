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

    // Find orders assigned to this wellwisher
    const query: { assignedWellwisher: string; 'wellwisherTasks.status': string } = { 
      assignedWellwisher: session.user.id,
      'wellwisherTasks.status': status
    };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Extract tasks from orders
    const tasks = orders.flatMap(order => 
      order.wellwisherTasks
        ?.filter(task => task.status === status)
        .map(task => ({
          id: task.taskId,
          orderId: order._id,
          task: task.task,
          description: task.description,
          scheduledDate: task.scheduledDate,
          priority: task.priority,
          status: task.status,
          location: task.location,
          orderDetails: {
            isGift: order.isGift,
            giftRecipientName: order.giftRecipientName,
            giftRecipientEmail: order.giftRecipientEmail,
            giftMessage: order.giftMessage,
            totalAmount: order.totalAmount,
            items: order.items
          }
        })) || []
    );

    const totalCount = await Order.countDocuments(query);

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
