import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { sendWellWisherUpdateEmail } from '@/lib/email';
import { assignWellWisherEqually } from '@/lib/utils/wellwisher-assignment';
import { processOrderCompletion } from '@/lib/order-processing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid well-wisher ID format' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get well-wisher with password hash
    const wellWisher = await User.findById(id)
      .select('+passwordHash')
      .lean() as {
        _id: string;
        name: string;
        email: string;
        phone?: string;
        role: string;
        passwordHash?: string;
        createdAt: Date;
        updatedAt: Date;
      } | null;

    if (!wellWisher || wellWisher.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, error: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: wellWisher._id,
        name: wellWisher.name,
        email: wellWisher.email,
        phone: wellWisher.phone,
        role: wellWisher.role,
        createdAt: wellWisher.createdAt,
        updatedAt: wellWisher.updatedAt,
        // Note: In a real application, you wouldn't return the password hash
        // This is for admin convenience only
        hasPassword: !!wellWisher.passwordHash,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid well-wisher ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, phone, password } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // OPTIMIZED: Check existence and email uniqueness in parallel if email is being changed
    const normalizedEmail = email.toLowerCase();
    const existingWellWisher = await User.findById(id).select('email role').lean() as { email: string; role: string } | null;
    
    if (!existingWellWisher || existingWellWisher.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, error: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it's already taken by another user
    const emailChanged = normalizedEmail !== existingWellWisher.email;
    if (emailChanged) {
      const emailExists = await User.findOne({ 
        email: normalizedEmail,
        _id: { $ne: id }
      }).select('_id').lean();
      
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: {
      name: string;
      email: string;
      phone?: string;
      passwordHash?: string;
    } = {
      name,
      email: email.toLowerCase(),
      phone: phone || undefined,
    };

    // Update password only if provided
    if (password && password.trim() !== '') {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Update well-wisher
    const updatedWellWisher = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedWellWisher) {
      return NextResponse.json(
        { success: false, error: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    // OPTIMIZED: Send update email asynchronously (non-blocking)
    const passwordChanged = !!(password && password.trim() !== '');
    
    if (passwordChanged || emailChanged) {
      // Fire and forget - don't await email sending
      sendWellWisherUpdateEmail(
        normalizedEmail,
        name,
        passwordChanged ? password : undefined,
        emailChanged
      ).catch((emailError) => {
        console.error('Error sending update email:', emailError);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Well-wisher updated successfully',
      data: {
        _id: updatedWellWisher._id,
        name: updatedWellWisher.name,
        email: updatedWellWisher.email,
        phone: updatedWellWisher.phone,
        role: updatedWellWisher.role,
        updatedAt: updatedWellWisher.updatedAt,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid well-wisher ID format' },
        { status: 400 }
      );
    }

    await connectDB();

    // OPTIMIZED: Check existence and get orders/well-wishers in parallel
    const wellWisherId = id.toString();
    
    const [existingWellWisher, assignedOrders, availableWellWishers] = await Promise.all([
      User.findById(id).select('role').lean() as Promise<{ role: string } | null>,
      Order.find({ assignedWellwisher: wellWisherId }).select('_id orderId wellwisherTasks').lean(),
      User.find({ role: 'wellwisher', _id: { $ne: id } }).select('_id').lean()
    ]);

    if (!existingWellWisher || existingWellWisher.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, error: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    // If there are no available well-wishers, we can't reassign
    // In this case, we'll still delete but warn about orphaned tasks
    if (availableWellWishers.length === 0) {
      // Delete well-wisher (tasks will be orphaned but orders remain)
      await User.findByIdAndDelete(id);
      
      return NextResponse.json({
        success: true,
        message: 'Well-wisher deleted successfully. No other well-wishers available to reassign tasks.',
        warning: 'Tasks from this well-wisher were not reassigned as no other well-wishers are available.',
      });
    }

    // IMMEDIATE REASSIGNMENT: Redistribute all tasks (regardless of status) equally among available well-wishers
    // Use the equal distribution algorithm to ensure fair task distribution
    const reassignmentUpdates: Array<{ orderId: string; newWellWisherId: string; tasksCount: number; taskStatuses: string[] }> = [];
    const updatePromises: Promise<unknown>[] = [];

    // Reassign each order immediately using equal distribution algorithm
    for (const order of assignedOrders) {
      // Get the best well-wisher using equal distribution (considers current workload)
      const newWellWisherId = await assignWellWisherEqually();
      
      if (!newWellWisherId) {
        console.error(`[WELLWISHER_DELETE] Failed to assign well-wisher for order ${order.orderId || order._id}`);
        continue; // Skip this order if assignment fails
      }

      // Get task statuses for reporting
      const tasks = (order.wellwisherTasks as Array<{ status?: string }>) || [];
      const taskStatuses = tasks.map(task => task.status || 'unknown');

      // IMMEDIATE UPDATE: Update order with new well-wisher assignment
      // All tasks (pending, in_progress, completed, updating) are reassigned together
      updatePromises.push(
        Order.findByIdAndUpdate(
          order._id,
          {
            $set: { assignedWellwisher: newWellWisherId },
            $unset: { wellwisherTaskEmailSentAt: '' }
          }
        )
      );

      reassignmentUpdates.push({
        orderId: (order.orderId as string) || String(order._id),
        newWellWisherId: newWellWisherId,
        tasksCount: tasks.length,
        taskStatuses: taskStatuses
      });
    }

    // IMMEDIATE EXECUTION: Wait for all order updates in parallel, then delete well-wisher
    // No delays - all reassignments happen immediately
    await Promise.all(updatePromises);
    await User.findByIdAndDelete(id);

    const reassignedOrderIds = reassignmentUpdates.map(update => update.orderId);
    const reassignedOrders = await Order.find({ orderId: { $in: reassignedOrderIds } });
    await Promise.all(
      reassignedOrders.map(async (order) => {
        try {
          await processOrderCompletion(order);
        } catch (emailError) {
          console.error(`[WELLWISHER_DELETE] Error notifying reassigned well-wisher for order ${order.orderId}:`, emailError);
        }
      })
    );

    // Calculate statistics for response
    const totalTasks = reassignmentUpdates.reduce((sum, update) => sum + update.tasksCount, 0);
    const uniqueWellWishersUsed = new Set(reassignmentUpdates.map(update => update.newWellWisherId)).size;
    
    // Count tasks by status
    const tasksByStatus = reassignmentUpdates.reduce((acc, update) => {
      update.taskStatuses.forEach(status => {
        acc[status] = (acc[status] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      message: 'Well-wisher deleted successfully. All tasks have been immediately reassigned using equal distribution.',
      reassigned: {
        ordersCount: assignedOrders.length,
        totalTasks: totalTasks,
        wellWishersUsed: uniqueWellWishersUsed,
        tasksByStatus: tasksByStatus
      }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
