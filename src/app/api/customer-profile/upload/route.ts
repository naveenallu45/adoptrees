import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { uploadToCloudinary } from '@/lib/upload';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only dealers can upload customer profiles
    if (session.user.userType !== 'dealer') {
      return NextResponse.json(
        { success: false, error: 'Only dealers can upload customer profiles' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Image size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      imageFile,
      'adoptrees/customer-profiles',
      {
        width: 500,
        height: 500,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId
      }
    });

  } catch (error) {
    console.error('Customer profile upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to upload profile picture: ${errorMessage}` },
      { status: 500 }
    );
  }
}

