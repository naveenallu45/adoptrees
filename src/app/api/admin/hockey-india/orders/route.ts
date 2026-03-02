import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

interface LeanOrder {
  _id: unknown;
  orderId: string;
  userName: string;
  userEmail: string;
  items: Array<{
    treeName: string;
    quantity: number;
    treeId: string;
  }>;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: Date;
  assignedWellwisher?: unknown;
  wellwisherTasks?: Array<{
    taskId: string;
    status: string;
    plantingDetails?: unknown;
  }>;
  plantingDetails?: {
    plantedAt?: Date;
    plantingLocation?: {
      type: string;
      coordinates: [number, number];
    };
    plantingImages?: Array<{
      url: string;
      publicId: string;
      caption?: string;
      uploadedAt: Date;
    }> | string[];
    plantingNotes?: string;
  };
}

export async function GET(_request: NextRequest) {
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
      .lean() as LeanOrder[];

    return NextResponse.json({
      success: true,
      data: orders.map((order) => ({
        _id: String(order._id),
        orderId: order.orderId,
        userName: order.userName || 'Anonymous',
        userEmail: order.userEmail || '',
        items: order.items.map((item) => ({
          treeName: item.treeName,
          quantity: item.quantity,
          treeId: String(item.treeId),
        })),
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        assignedWellwisher: order.assignedWellwisher ? String(order.assignedWellwisher) : undefined,
        wellwisherTasks: order.wellwisherTasks ? order.wellwisherTasks.map((task) => ({
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
