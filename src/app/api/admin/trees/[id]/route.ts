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

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const info = formData.get('info') as string;
    const oxygenKgsStr = formData.get('oxygenKgs') as string;
    const treeType = formData.get('treeType') as string;
    const packageQuantityStr = formData.get('packageQuantity') as string;
    const packagePriceStr = formData.get('packagePrice') as string;
    const image = formData.get('image') as File;

    // Parse numeric values
    const price = parseFloat(priceStr);
    const oxygenKgs = parseFloat(oxygenKgsStr);
    const packageQuantity = packageQuantityStr ? parseInt(packageQuantityStr) : 1;
    const packagePrice = packagePriceStr ? parseFloat(packagePriceStr) : undefined;

    if (isNaN(price) || isNaN(oxygenKgs)) {
      return NextResponse.json(
        { success: false, error: 'Price and oxygen production must be valid numbers' },
        { status: 400 }
      );
    }

    if (packageQuantityStr && isNaN(packageQuantity)) {
      return NextResponse.json(
        { success: false, error: 'Package quantity must be a valid number' },
        { status: 400 }
      );
    }

    if (packagePriceStr && isNaN(packagePrice!)) {
      return NextResponse.json(
        { success: false, error: 'Package price must be a valid number' },
        { status: 400 }
      );
    }

    // Validate tree data
    const validationResult = treeUpdateSchema.safeParse({
      name,
      price,
      info,
      oxygenKgs,
      treeType: treeType || 'individual',
      packageQuantity,
      packagePrice,
    });

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

    const { name: validatedName, price: validatedPrice, info: validatedInfo, oxygenKgs: validatedOxygenKgs, treeType: validatedTreeType, packageQuantity: validatedPackageQuantity, packagePrice: validatedPackagePrice } = validationResult.data;

    // Handle image update if provided
    const updateData: {
      name: string;
      price: number;
      info: string;
      oxygenKgs: number;
      treeType: string;
      packageQuantity?: number;
      packagePrice?: number;
      imageUrl?: string;
      imagePublicId?: string;
    } = { 
      name: validatedName, 
      price: validatedPrice, 
      info: validatedInfo, 
      oxygenKgs: validatedOxygenKgs, 
      treeType: validatedTreeType, 
      packageQuantity: validatedPackageQuantity, 
      packagePrice: validatedPackagePrice 
    };

    if (image && image.size > 0) {
      // Import cloudinary for image upload
      const cloudinary = await import('@/lib/cloudinary');
      
      // Convert File to buffer for Cloudinary upload
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64String = buffer.toString('base64');
      const dataUri = `data:${image.type};base64,${base64String}`;
      
      const result = await cloudinary.default.uploader.upload(dataUri, {
        folder: 'adoptrees/trees',
        resource_type: 'image',
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto' },
          { format: 'auto' }
        ]
      });

      updateData.imageUrl = result.secure_url;
      updateData.imagePublicId = result.public_id;
    }

    const tree = await Tree.findByIdAndUpdate(
      id,
      updateData,
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

  } catch (_error) {
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
      } catch (_error) {
        // Continue with database deletion even if image deletion fails
      }
    }

    // Soft delete by setting isActive to false
    await Tree.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({
      success: true,
      message: 'Tree deleted successfully'
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete tree. Please try again.' },
      { status: 500 }
    );
  }
}
