import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireAdmin } from '@/lib/api-auth';

/**
 * POST /api/admin/adoptions/cleanup-duplicates
 * Find and optionally delete duplicate orders
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();
    const { dryRun = true } = body; // Default to dry run (just find, don't delete)

    // Get all orders grouped by user
    const allOrders = await Order.find({}).sort({ createdAt: -1 }).lean();
    
    // Group orders by userId
    const ordersByUser = new Map<string, typeof allOrders>();
    for (const order of allOrders) {
      const userId = String(order.userId);
      if (!ordersByUser.has(userId)) {
        ordersByUser.set(userId, []);
      }
      ordersByUser.get(userId)!.push(order);
    }

    const duplicates: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      duplicateOrders: Array<{
        orderId: string;
        createdAt: string;
        status: string;
        paymentStatus: string;
        totalAmount: number;
      }>;
      keepOrderId: string;
    }> = [];

    let totalDuplicatesFound = 0;
    let totalDuplicatesToDelete = 0;

    // Check each user's orders for duplicates
    for (const [userId, userOrders] of ordersByUser.entries()) {
      const seenOrderKeys = new Map<string, typeof userOrders[0]>();
      
      for (const order of userOrders) {
        // Create a unique key based on items, total amount, and gift status
        const orderKey = JSON.stringify({
          items: order.items.map((item: { treeId: string; quantity: number; adoptionType?: string }) => ({
            treeId: String(item.treeId),
            quantity: item.quantity,
            adoptionType: item.adoptionType || 'self'
          })).sort((a, b) => a.treeId.localeCompare(b.treeId)),
          totalAmount: order.totalAmount,
          isGift: order.isGift || false
        });

        if (seenOrderKeys.has(orderKey)) {
          // Duplicate found
          const existingOrder = seenOrderKeys.get(orderKey)!;
          
          // Determine which order to keep (prefer paid/confirmed, then most recent)
          let keepOrder = existingOrder;
          let duplicateOrder = order;
          
          // Prefer paid/confirmed orders
          if (order.paymentStatus === 'paid' && existingOrder.paymentStatus !== 'paid') {
            keepOrder = order;
            duplicateOrder = existingOrder;
          } else if (order.status === 'confirmed' && existingOrder.status === 'pending') {
            keepOrder = order;
            duplicateOrder = existingOrder;
          } else if (new Date(order.createdAt) > new Date(existingOrder.createdAt)) {
            // If same status, keep most recent
            keepOrder = order;
            duplicateOrder = existingOrder;
          }

          // Find or create duplicate entry
          let duplicateEntry = duplicates.find(d => d.userId === userId);
          if (!duplicateEntry) {
            duplicateEntry = {
              userId,
              userName: order.userName || 'Unknown',
              userEmail: order.userEmail || 'Unknown',
              duplicateOrders: [],
              keepOrderId: keepOrder.orderId
            };
            duplicates.push(duplicateEntry);
          }

          duplicateEntry.duplicateOrders.push({
            orderId: duplicateOrder.orderId,
            createdAt: duplicateOrder.createdAt.toString(),
            status: duplicateOrder.status,
            paymentStatus: duplicateOrder.paymentStatus,
            totalAmount: duplicateOrder.totalAmount
          });

          totalDuplicatesFound++;

          // Delete duplicate if not dry run
          if (!dryRun && duplicateOrder.orderId !== keepOrder.orderId) {
            await Order.deleteOne({ _id: duplicateOrder._id });
            totalDuplicatesToDelete++;
          }
        } else {
          seenOrderKeys.set(orderKey, order);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalDuplicatesFound,
        totalDuplicatesDeleted: dryRun ? 0 : totalDuplicatesToDelete,
        usersAffected: duplicates.length
      },
      duplicates: duplicates.slice(0, 100) // Limit to first 100 for response size
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup duplicates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

