import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/upload';
import { validateImageFile } from '@/lib/validations/tree';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Users can only fetch their own data
    if (session.user.id !== id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(id).select('-passwordHash').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
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
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Users can only update their own data
    if (session.user.id !== id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if request contains FormData (for image upload)
    const contentType = request.headers.get('content-type') || '';
    interface BodyData {
      name?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      address?: string;
      gstNumber?: string;
      dateOfBirth?: string; // ISO date string
    }
    let body: BodyData = {};
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const imageField = formData.get('image');
      // Only set imageFile if it's actually a File object with content
      if (imageField instanceof File && imageField.size > 0) {
        imageFile = imageField;
      }
      
      // Get other form fields
      const nameField = formData.get('name');
      const companyNameField = formData.get('companyName');
      const emailField = formData.get('email');
      const phoneField = formData.get('phone');
      const addressField = formData.get('address');
      const gstNumberField = formData.get('gstNumber');
      const dateOfBirthField = formData.get('dateOfBirth');

      body = {
        name: nameField ? String(nameField) : undefined,
        companyName: companyNameField ? String(companyNameField) : undefined,
        email: emailField ? String(emailField) : undefined,
        phone: phoneField ? String(phoneField) : undefined,
        address: addressField ? String(addressField) : undefined,
        gstNumber: gstNumberField ? String(gstNumberField) : undefined,
        dateOfBirth: dateOfBirthField ? String(dateOfBirthField) : undefined,
      };
    } else {
      body = (await request.json()) as BodyData;
    }

    const { name, companyName, email, phone, address, gstNumber, dateOfBirth } = body;

    // Build update object
    interface UpdateData {
      image?: string;
      imagePublicId?: string;
      name?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      address?: string;
      gstNumber?: string;
      dateOfBirth?: Date;
      dateOfBirthLastUpdated?: Date;
    }
    const updateData: UpdateData = {};

    // Handle image upload if provided
    if (imageFile && imageFile.size > 0) {
      // Validate image file
      const imageValidation = validateImageFile(imageFile);
      if (!imageValidation.valid) {
        return NextResponse.json(
          { success: false, message: imageValidation.error },
          { status: 400 }
        );
      }

      try {
        // Delete old image if exists
        if (user.imagePublicId) {
          try {
            await deleteFromCloudinary(user.imagePublicId);
          } catch (error) {
            console.error('Error deleting old profile image:', error);
            // Continue even if deletion fails
          }
        }

        // Upload new image
        const uploadResult = await uploadToCloudinary(
          imageFile,
          'adoptrees/profiles',
          {
            width: 500,
            height: 500,
            crop: 'fill',
            quality: 'auto',
            format: 'auto',
          }
        );

        updateData.image = uploadResult.url;
        updateData.imagePublicId = uploadResult.publicId;
        console.log('Profile image uploaded successfully:', {
          url: uploadResult.url,
          publicId: uploadResult.publicId
        });
      } catch (error) {
        console.error('Error uploading profile image:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to upload profile image' },
          { status: 500 }
        );
      }
    }

    // Update fields based on user type
    if (user.userType === 'individual') {
      if (name !== undefined) updateData.name = name;
      
      // Handle date of birth update for individual users
      if (dateOfBirth !== undefined) {
        if (dateOfBirth === '' || dateOfBirth === null) {
          // Allow clearing the date of birth
          updateData.dateOfBirth = undefined;
          updateData.dateOfBirthLastUpdated = undefined;
        } else {
          // Validate and parse the date
          const parsedDate = new Date(dateOfBirth);
          if (isNaN(parsedDate.getTime())) {
            return NextResponse.json(
              { success: false, message: 'Invalid date of birth format' },
              { status: 400 }
            );
          }
          
          // Validate date is not in the future
          const today = new Date();
          today.setHours(23, 59, 59, 999); // End of today
          if (parsedDate > today) {
            return NextResponse.json(
              { success: false, message: 'Date of birth cannot be in the future' },
              { status: 400 }
            );
          }
          
          // Validate reasonable age (max 120 years)
          const maxAge = new Date();
          maxAge.setFullYear(today.getFullYear() - 120);
          if (parsedDate < maxAge) {
            return NextResponse.json(
              { success: false, message: 'Date of birth is too far in the past' },
              { status: 400 }
            );
          }
          
          // Only update if the date actually changed
          const existingDateOfBirth = user.dateOfBirth 
            ? new Date(user.dateOfBirth).toISOString().split('T')[0]
            : null;
          const newDateOfBirth = parsedDate.toISOString().split('T')[0];
          
          if (existingDateOfBirth !== newDateOfBirth) {
            updateData.dateOfBirth = parsedDate;
            updateData.dateOfBirthLastUpdated = new Date();
          }
        }
      }
    } else if (user.userType === 'company') {
      if (companyName !== undefined) updateData.companyName = companyName;
      if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    }

    // Common fields
    if (email !== undefined && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== id) {
        return NextResponse.json(
          { success: false, message: 'Email already in use' },
          { status: 400 }
        );
      }
      updateData.email = email.toLowerCase();
    }

    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    // Log update data
    console.log('Update data before save:', updateData);

    // Use findByIdAndUpdate to save all changes at once
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash').lean() as Omit<IUser, 'passwordHash'> | null;

    console.log('User updated, returning data:', {
      hasImage: !!updatedUser?.image,
      imageUrl: updatedUser?.image,
      imagePublicId: updatedUser?.imagePublicId,
      userId: id,
      allFields: Object.keys(updatedUser || {})
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

