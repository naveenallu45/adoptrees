import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import cloudinary from '@/lib/cloudinary';

export async function GET() {
  try {
    await connectDB();
    const trees = await Tree.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: trees });
  } catch (error) {
    console.error('Error fetching trees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const info = formData.get('info') as string;
    const oxygenKgs = parseFloat(formData.get('oxygenKgs') as string);
    const image = formData.get('image') as File;

    console.log('Received form data:', { name, price, info, oxygenKgs, imageName: image?.name });

    // Validation
    if (!name || !price || !info || !oxygenKgs || !image) {
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

    // Convert File to buffer for Cloudinary upload
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Image buffer size:', buffer.length);

    // Upload to Cloudinary using base64
    const base64String = buffer.toString('base64');
    const dataUri = `data:${image.type};base64,${base64String}`;

    console.log('Uploading to Cloudinary...');
    
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'adoptrees/trees',
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'fill', quality: 'auto' },
        { format: 'auto' }
      ]
    });

    console.log('Cloudinary upload result:', { url: result.secure_url, public_id: result.public_id });

    // Create tree in database
    const tree = new Tree({
      name,
      price,
      info,
      oxygenKgs,
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
    });

    await tree.save();

    console.log('Tree saved to database:', tree._id);

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree created successfully'
    });

  } catch (error) {
    console.error('Error creating tree:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create tree: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
