import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/upload';
import { validateImageFile } from '@/lib/validations/tree';

// Configure runtime for file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Profile picture upload request received');
    
    const session = await auth();
    
    if (!session || !session.user) {
      console.log('Unauthorized: No session or user');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Session user ID:', session.user.id);

    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    
    console.log('Image from formData:', {
      exists: !!image,
      isFile: image instanceof File,
      name: image instanceof File ? image.name : 'N/A',
      size: image instanceof File ? image.size : 'N/A',
      type: image instanceof File ? image.type : 'N/A',
    });

    if (!image) {
      return NextResponse.json(
        { success: false, message: 'Image file is required' },
        { status: 400 }
      );
    }

    // Check if it's actually a File instance
    if (!(image instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Check file size before validation
    if (image.size === 0) {
      return NextResponse.json(
        { success: false, message: 'File is empty' },
        { status: 400 }
      );
    }

    // Validate image file
    const imageValidation = validateImageFile(image);
    if (!imageValidation.valid) {
      return NextResponse.json(
        { success: false, message: imageValidation.error },
        { status: 400 }
      );
    }

    await connectDB();

    // Get current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Delete old profile picture if exists
    if (user.profilePicture?.publicId) {
      try {
        await deleteFromCloudinary(user.profilePicture.publicId);
      } catch (error) {
        // Log error but don't fail the upload
        console.error('Failed to delete old profile picture:', error);
      }
    }

    // Upload new profile picture
    let result;
    try {
      result = await uploadToCloudinary(image, 'adoptrees/profile-pictures', {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
      });
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      throw new Error(`Failed to upload to Cloudinary: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    // Update user with new profile picture
    user.profilePicture = {
      url: result.url,
      publicId: result.publicId,
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to upload profile picture',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture?.publicId) {
      try {
        await deleteFromCloudinary(user.profilePicture.publicId);
      } catch (error) {
        console.error('Failed to delete profile picture from Cloudinary:', error);
      }
    }

    // Remove profile picture from user
    user.profilePicture = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile picture deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete profile picture' },
      { status: 500 }
    );
  }
}

