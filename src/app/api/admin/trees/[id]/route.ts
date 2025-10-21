import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import { deleteFromCloudinary } from '@/lib/upload';
import { requireAdmin } from '@/lib/api-auth';
import { treeUpdateSchema } from '@/lib/validations/tree';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();
    
    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tree ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input data
    const validationResult = treeUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: String(err.path.join('.')),
        message: err.message,
      }));
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { name, price, info, oxygenKgs } = validationResult.data;

    const tree = await Tree.findByIdAndUpdate(
      id,
      { name, price, info, oxygenKgs },
      { new: true, runValidators: true }
    );

    if (!tree) {
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree updated successfully'
    });

  } catch (error) {
    console.error('Error updating tree:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tree. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();
    
    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tree ID' },
        { status: 400 }
      );
    }

    const tree = await Tree.findById(id);

    if (!tree) {
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary (best effort)
    if (tree.imagePublicId) {
      try {
        await deleteFromCloudinary(tree.imagePublicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue with database deletion even if image deletion fails
      }
    }

    // Soft delete by setting isActive to false
    await Tree.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({
      success: true,
      message: 'Tree deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting tree:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tree. Please try again.' },
      { status: 500 }
    );
  }
}
