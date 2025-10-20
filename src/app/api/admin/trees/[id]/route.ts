import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import { deleteFromCloudinary } from '@/lib/upload';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    const { name, price, info, oxygenKgs } = body;

    // Validation
    if (!name || !price || !info || !oxygenKgs) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (price < 0 || oxygenKgs < 0) {
      return NextResponse.json(
        { success: false, error: 'Price and oxygen production cannot be negative' },
        { status: 400 }
      );
    }

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
      { success: false, error: 'Failed to update tree' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const tree = await Tree.findById(id);

    if (!tree) {
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary
    try {
      await deleteFromCloudinary(tree.imagePublicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Continue with database deletion even if image deletion fails
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
      { success: false, error: 'Failed to delete tree' },
      { status: 500 }
    );
  }
}
