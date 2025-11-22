import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

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
        { success: false, message: 'Invalid well-wisher ID format' },
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
        { success: false, message: 'Well-wisher not found' },
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
        { success: false, message: 'Invalid well-wisher ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, phone, password } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if well-wisher exists
    const existingWellWisher = await User.findById(id);
    if (!existingWellWisher || existingWellWisher.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, message: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it's already taken by another user
    if (email !== existingWellWisher.email) {
      const emailExists = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: id }
      });
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
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
      { success: false, message: 'Internal server error' },
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
        { success: false, message: 'Invalid well-wisher ID format' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if well-wisher exists
    const existingWellWisher = await User.findById(id);
    if (!existingWellWisher || existingWellWisher.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, message: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    const wellWisherId = id.toString();

    // Find all orders assigned to this well-wisher
    const assignedOrders = await Order.find({
      assignedWellwisher: wellWisherId
    });

    // Get all available well-wishers (excluding the one being deleted)
    const availableWellWishers = await User.find({
      role: 'wellwisher',
      _id: { $ne: id }
    }).select('_id');

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

    // Redistribute tasks equally among available well-wishers
    // Use round-robin approach for equal distribution
    let wellWisherIndex = 0;
    const reassignmentUpdates: Array<{ orderId: string; newWellWisherId: string; tasksCount: number }> = [];

    for (const order of assignedOrders) {
      // Select next well-wisher in round-robin fashion
      const newWellWisher = availableWellWishers[wellWisherIndex % availableWellWishers.length];
      const newWellWisherId = newWellWisher._id.toString();

      // Update order with new well-wisher assignment
      // This preserves all tasks (upcoming, ongoing, completed, updating) and just reassigns them
      await Order.findByIdAndUpdate(
        order._id,
        {
          $set: {
            assignedWellwisher: newWellWisherId
          }
        }
      );

      reassignmentUpdates.push({
        orderId: order.orderId || String(order._id),
        newWellWisherId: newWellWisherId,
        tasksCount: order.wellwisherTasks?.length || 0
      });

      // Move to next well-wisher for next order
      wellWisherIndex++;
    }

    // Delete well-wisher after reassigning all tasks
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Well-wisher deleted successfully. All tasks have been reassigned equally to available well-wishers.',
      reassigned: {
        ordersCount: assignedOrders.length,
        totalTasks: reassignmentUpdates.reduce((sum, update) => sum + update.tasksCount, 0),
        wellWishersUsed: availableWellWishers.length
      }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
