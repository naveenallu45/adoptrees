import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

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

    await connectDB();

    // Check if well-wisher exists
    const existingWellWisher = await User.findById(id);
    if (!existingWellWisher || existingWellWisher.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, message: 'Well-wisher not found' },
        { status: 404 }
      );
    }

    // Delete well-wisher
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Well-wisher deleted successfully',
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
