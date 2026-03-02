import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    // Fetch all Hockey India orders
    const orders = await Order.find({ userType: 'hockey-india' })
      .select('orderId userName userEmail items totalAmount paymentStatus status createdAt plantingDetails assignedWellwisher wellwisherTasks')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: orders.map(order => ({
        _id: String(order._id),
        orderId: order.orderId,
        userName: order.userName || 'Anonymous',
        userEmail: order.userEmail || '',
        items: order.items.map((item: { treeName: string; quantity: number; treeId: string }) => ({
          treeName: item.treeName,
          quantity: item.quantity,
          treeId: String(item.treeId),
        })),
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        assignedWellwisher: order.assignedWellwisher ? String(order.assignedWellwisher) : undefined,
        wellwisherTasks: order.wellwisherTasks ? order.wellwisherTasks.map((task: { taskId: string; status: string; plantingDetails?: unknown }) => ({
          taskId: task.taskId,
          status: task.status,
          plantingDetails: task.plantingDetails || undefined,
        })) : undefined,
        plantingDetails: order.plantingDetails || undefined,
      })),
    });
  } catch (error) {
    console.error('Error fetching Hockey India orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
