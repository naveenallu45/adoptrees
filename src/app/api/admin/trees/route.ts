import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import cloudinary from '@/lib/cloudinary';
import { requireAdmin } from '@/lib/api-auth';
import { treeSchema, validateImageFile, MAX_FILE_SIZE } from '@/lib/validations/tree';

export async function GET() {
  try {
    // Admin route - authentication handled by middleware
    await connectDB();
    const trees = await Tree.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: trees });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication (double-check even though middleware handles it)
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();
    
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const info = formData.get('info') as string;
    const oxygenKgsStr = formData.get('oxygenKgs') as string;
    const treeType = formData.get('treeType') as string;
    const packageQuantityStr = formData.get('packageQuantity') as string;
    const packagePriceStr = formData.get('packagePrice') as string;
    const image = formData.get('image') as File;

    // Validate all fields are present
    if (!name || !priceStr || !info || !oxygenKgsStr || !image) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

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
    const validationResult = treeSchema.safeParse({
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

    // Validate image file
    const imageValidation = validateImageFile(image);
    if (!imageValidation.valid) {
      return NextResponse.json(
        { success: false, error: imageValidation.error },
        { status: 400 }
      );
    }

    // Convert File to buffer for Cloudinary upload
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Additional size check
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Image file size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary using base64
    const base64String = buffer.toString('base64');
    const dataUri = `data:${image.type};base64,${base64String}`;
    
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'adoptrees/trees',
      resource_type: 'image',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit', quality: 'auto' },
        { format: 'auto' }
      ]
    });

    // Create tree in database
    const tree = new Tree({
      name: validationResult.data.name,
      price: validationResult.data.price,
      info: validationResult.data.info,
      oxygenKgs: validationResult.data.oxygenKgs,
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
      treeType: validationResult.data.treeType,
      packageQuantity: validationResult.data.packageQuantity ?? 1,
      packagePrice: validationResult.data.packagePrice,
    });

    await tree.save();

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree created successfully'
    });

  } catch (_error) {
    
    // Don't expose internal error details
    return NextResponse.json(
      { success: false, error: 'Failed to create tree. Please try again.' },
      { status: 500 }
    );
  }
}
