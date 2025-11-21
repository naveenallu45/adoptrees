import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import { deleteFromCloudinary } from '@/lib/upload';
import { requireAdmin } from '@/lib/api-auth';
import { treeUpdateSchema, validateImageFile, MAX_FILE_SIZE } from '@/lib/validations/tree';
import { revalidatePath } from 'next/cache';
import { logError, logInfo, logWarning } from '@/lib/logger';
import cloudinary from '@/lib/cloudinary';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

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
    const scientificSpecies = formData.get('scientificSpecies') as string;
    const speciesInfoAvailableStr = formData.get('speciesInfoAvailable') as string;
    const co2Str = formData.get('co2') as string;
    const foodSecurityStr = formData.get('foodSecurity') as string;
    const economicDevelopmentStr = formData.get('economicDevelopment') as string;
    const co2AbsorptionStr = formData.get('co2Absorption') as string;
    const environmentalProtectionStr = formData.get('environmentalProtection') as string;
    const localUsesArray = formData.getAll('localUses[]') as string[];
    const image = formData.get('image') as File;

    // Log update request (sanitized)
    logInfo('Tree update request received', {
      treeId: id,
      hasImage: !!image && image.size > 0,
      treeType,
      localUsesCount: localUsesArray.length,
    });

    // Convert string to number (required: FormData sends strings, MongoDB needs numbers)
    // Using Number() for direct conversion - no manipulation, exact value preserved
    const price = Number(priceStr);
    const oxygenKgs = parseFloat(oxygenKgsStr);
    const packageQuantity = packageQuantityStr ? parseInt(packageQuantityStr) : 1;
    const packagePrice = packagePriceStr ? parseFloat(packagePriceStr) : undefined;
    const speciesInfoAvailable = speciesInfoAvailableStr === 'true';
    // Parse numeric fields - handle empty strings properly
    // Parse and validate - include if it's a valid number (including 0 and negative)
    const co2Parsed = (co2Str && co2Str.trim() !== '') ? parseFloat(co2Str) : NaN;
    const co2 = !isNaN(co2Parsed) ? co2Parsed : undefined;
    const foodSecurityParsed = (foodSecurityStr && foodSecurityStr.trim() !== '') ? parseInt(foodSecurityStr) : NaN;
    const foodSecurity = !isNaN(foodSecurityParsed) ? foodSecurityParsed : undefined;
    const economicDevelopmentParsed = (economicDevelopmentStr && economicDevelopmentStr.trim() !== '') ? parseInt(economicDevelopmentStr) : NaN;
    const economicDevelopment = !isNaN(economicDevelopmentParsed) ? economicDevelopmentParsed : undefined;
    const co2AbsorptionParsed = (co2AbsorptionStr && co2AbsorptionStr.trim() !== '') ? parseInt(co2AbsorptionStr) : NaN;
    const co2Absorption = !isNaN(co2AbsorptionParsed) ? co2AbsorptionParsed : undefined;
    const environmentalProtectionParsed = (environmentalProtectionStr && environmentalProtectionStr.trim() !== '') ? parseInt(environmentalProtectionStr) : NaN;
    const environmentalProtection = !isNaN(environmentalProtectionParsed) ? environmentalProtectionParsed : undefined;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!info || info.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be a valid positive number' },
        { status: 400 }
      );
    }

    if (isNaN(oxygenKgs) || oxygenKgs < 0) {
      return NextResponse.json(
        { success: false, error: 'Oxygen production must be a valid non-negative number' },
        { status: 400 }
      );
    }

    // Validate package fields for company trees
    if (treeType === 'company') {
      if (!packageQuantityStr || packageQuantity <= 0) {
      return NextResponse.json(
          { success: false, error: 'Package quantity is required and must be greater than 0 for company trees' },
        { status: 400 }
      );
    }
      if (!packagePriceStr || !packagePrice || packagePrice <= 0) {
      return NextResponse.json(
          { success: false, error: 'Package price is required and must be greater than 0 for company trees' },
        { status: 400 }
      );
    }
    }

    // Validate optional numeric fields
    const numericFieldErrors: Record<string, string> = {};
    
    if (co2Str && co2Str.trim() !== '' && isNaN(co2Parsed)) {
      numericFieldErrors.co2 = 'CO₂ must be a valid number';
    }
    
    if (foodSecurityStr && foodSecurityStr.trim() !== '' && (isNaN(foodSecurityParsed) || foodSecurityParsed < 0 || foodSecurityParsed > 10)) {
      numericFieldErrors.foodSecurity = 'Food security rating must be a number between 0 and 10';
    }
    
    if (economicDevelopmentStr && economicDevelopmentStr.trim() !== '' && (isNaN(economicDevelopmentParsed) || economicDevelopmentParsed < 0 || economicDevelopmentParsed > 10)) {
      numericFieldErrors.economicDevelopment = 'Economic development rating must be a number between 0 and 10';
    }
    
    if (co2AbsorptionStr && co2AbsorptionStr.trim() !== '' && (isNaN(co2AbsorptionParsed) || co2AbsorptionParsed < 0 || co2AbsorptionParsed > 10)) {
      numericFieldErrors.co2Absorption = 'CO₂ absorption rating must be a number between 0 and 10';
    }

    if (environmentalProtectionStr && environmentalProtectionStr.trim() !== '' && (isNaN(environmentalProtectionParsed) || environmentalProtectionParsed < 0 || environmentalProtectionParsed > 10)) {
      numericFieldErrors.environmentalProtection = 'Environmental protection rating must be a number between 0 and 10';
    }

    if (Object.keys(numericFieldErrors).length > 0) {
      logWarning('Tree update failed: invalid numeric fields', { treeId: id, errors: numericFieldErrors });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: Object.entries(numericFieldErrors).map(([field, message]) => ({ field, message }))
        },
        { status: 400 }
      );
    }

    // Validate tree data - use the price we parsed with parseInt
    const validationResult = treeUpdateSchema.safeParse({
      name,
      price, // Use the integer price we parsed
      info,
      oxygenKgs,
      treeType: treeType || 'individual',
      packageQuantity,
      packagePrice,
      scientificSpecies: (scientificSpecies && scientificSpecies.trim() !== '') ? scientificSpecies.trim() : undefined,
      speciesInfoAvailable,
      co2,
      foodSecurity,
      economicDevelopment,
      co2Absorption,
      environmentalProtection,
      localUses: localUsesArray.length > 0 ? localUsesArray : undefined,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: String(err.path.join('.')),
        message: err.message,
      }));
      
      logWarning('Tree update failed: validation error', { treeId: id, errors });
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed. Please check your input.',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { 
      name: validatedName, 
      price: validatedPrice, 
      info: validatedInfo, 
      oxygenKgs: validatedOxygenKgs, 
      treeType: validatedTreeType, 
      packageQuantity: validatedPackageQuantity, 
      packagePrice: validatedPackagePrice
    } = validationResult.data;

    // Use the price exactly as admin entered - no manipulation
    const finalPrice = price;

    // Handle image update if provided
    // Use parsed values directly for additional fields to ensure they're saved
    const updateData: {
      name: string;
      price: number;
      info: string;
      oxygenKgs: number;
      treeType: string;
      packageQuantity?: number;
      packagePrice?: number;
      scientificSpecies?: string;
      speciesInfoAvailable?: boolean;
      co2?: number;
      foodSecurity?: number;
      economicDevelopment?: number;
      co2Absorption?: number;
      environmentalProtection?: number;
      localUses?: string[];
      imageUrl?: string;
      imagePublicId?: string;
      smallImageUrls?: string[];
      smallImagePublicIds?: string[];
    } = { 
      name: validatedName, 
      price: finalPrice, 
      info: validatedInfo, 
      oxygenKgs: validatedOxygenKgs, 
      treeType: validatedTreeType, 
      packageQuantity: validatedPackageQuantity, 
      packagePrice: validatedPackagePrice,
      speciesInfoAvailable: speciesInfoAvailable,
      localUses: localUsesArray.length > 0 ? localUsesArray : []
    };

    // Get existing tree early (needed for both main image and small images handling)
    const existingTree = await Tree.findById(id).select('imagePublicId smallImageUrls smallImagePublicIds').lean();
    
    if (!existingTree) {
      logWarning('Tree update failed: tree not found', { treeId: id });
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    // Include additional fields using the parsed values (not from validationResult)
    // This ensures they are saved to the database even if Zod strips them from validationResult
    // Always include these fields explicitly, even if empty, so they're saved
    // Scientific Species
    if (scientificSpecies && scientificSpecies.trim() !== '') {
      updateData.scientificSpecies = scientificSpecies.trim();
    }
    
    // CO2 - include if it's a valid number (can be 0 or negative)
    if (co2 !== undefined && typeof co2 === 'number' && !isNaN(co2)) {
      updateData.co2 = co2;
    }
    
    // Food Security - include if it's a valid number (0-10)
    if (foodSecurity !== undefined && typeof foodSecurity === 'number' && !isNaN(foodSecurity)) {
      updateData.foodSecurity = foodSecurity;
    }
    
    // Economic Development - include if it's a valid number (0-10)
    if (economicDevelopment !== undefined && typeof economicDevelopment === 'number' && !isNaN(economicDevelopment)) {
      updateData.economicDevelopment = economicDevelopment;
    }
    
    // CO2 Absorption - include if it's a valid number (0-10)
    if (co2Absorption !== undefined && typeof co2Absorption === 'number' && !isNaN(co2Absorption)) {
      updateData.co2Absorption = co2Absorption;
    }
    
    // Environmental Protection - include if it's a valid number (0-10)
    if (environmentalProtection !== undefined && typeof environmentalProtection === 'number' && !isNaN(environmentalProtection)) {
      updateData.environmentalProtection = environmentalProtection;
    }
    
    // Handle image update if provided
    if (image && image.size > 0 && image instanceof File) {
      // Validate image file
      const imageValidation = validateImageFile(image);
      if (!imageValidation.valid) {
        logWarning('Tree update failed: invalid image', { treeId: id, error: imageValidation.error });
        return NextResponse.json(
          { success: false, error: imageValidation.error },
          { status: 400 }
        );
      }
      
      // Convert File to buffer for Cloudinary upload
      let buffer: Buffer;
      try {
      const bytes = await image.arrayBuffer();
        buffer = Buffer.from(bytes);
      } catch (error) {
        logError('Failed to convert image to buffer', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
          { success: false, error: 'Failed to process image file' },
          { status: 400 }
        );
      }
      
      // Additional size check
      if (buffer.length > MAX_FILE_SIZE) {
        logWarning('Tree update failed: image too large', { treeId: id, size: buffer.length });
        return NextResponse.json(
          { success: false, error: 'Image file size exceeds 5MB limit' },
          { status: 400 }
        );
      }
      
      // Upload new image
      let uploadResult: { secure_url: string; public_id: string };
      try {
      const base64String = buffer.toString('base64');
      const dataUri = `data:${image.type};base64,${base64String}`;
      
        uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'adoptrees/trees',
        resource_type: 'image',
        transformation: [
          { width: 2000, height: 2000, crop: 'limit', quality: 'auto' },
          { format: 'auto' }
        ]
      });

        logInfo('Image uploaded to Cloudinary', { treeId: id, publicId: uploadResult.public_id });
      } catch (error) {
        logError('Failed to upload image to Cloudinary', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
          { success: false, error: 'Failed to upload image. Please try again.' },
          { status: 500 }
        );
      }

      updateData.imageUrl = uploadResult.secure_url;
      updateData.imagePublicId = uploadResult.public_id;
      
      // Delete old image (best effort)
      if (existingTree?.imagePublicId) {
        try {
          await deleteFromCloudinary(existingTree.imagePublicId);
          logInfo('Old image deleted from Cloudinary', { treeId: id, publicId: existingTree.imagePublicId });
        } catch (deleteError) {
          logWarning('Failed to delete old image from Cloudinary', { 
            treeId: id, 
            publicId: existingTree.imagePublicId,
            error: deleteError instanceof Error ? deleteError.message : String(deleteError)
          });
          // Continue with update even if old image deletion fails
        }
      }
    }

    // Handle small images (up to 4)
    // Track which indices have new images
    const newSmallImages: Array<{ index: number; file: File }> = [];
    for (let i = 0; i < 4; i++) {
      const smallImage = formData.get(`smallImage${i}`) as File;
      if (smallImage && smallImage.size > 0) {
        newSmallImages.push({ index: i, file: smallImage });
      }
    }

    if (newSmallImages.length > 0) {
      const existingSmallImageUrls = (existingTree?.smallImageUrls as string[]) || [];
      const existingSmallImagePublicIds = (existingTree?.smallImagePublicIds as string[]) || [];
      const smallImageUrls = [...existingSmallImageUrls]; // Start with existing images
      const smallImagePublicIds = [...existingSmallImagePublicIds];
      const oldPublicIdsToDelete: string[] = [];

      // Upload new small images and replace at their specific indices
      for (const { index, file: smallImage } of newSmallImages) {
        // Validate file size (2MB limit for small images)
        if (smallImage.size > 2 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: `Small image ${index + 1} file size exceeds 2MB limit` },
            { status: 400 }
          );
        }

        // Track old public ID for deletion if it exists
        if (index < existingSmallImagePublicIds.length) {
          oldPublicIdsToDelete.push(existingSmallImagePublicIds[index]);
        }

        try {
          const arrayBuffer = await smallImage.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64String = buffer.toString('base64');
          const dataUri = `data:${smallImage.type};base64,${base64String}`;
          
          const smallResult = await cloudinary.uploader.upload(dataUri, {
            folder: 'adoptrees/trees/small',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 800, crop: 'limit', quality: 'auto' },
              { format: 'auto' }
            ]
          });

          // Replace at the specific index
          smallImageUrls[index] = smallResult.secure_url;
          smallImagePublicIds[index] = smallResult.public_id;
          logInfo('Small image uploaded to Cloudinary', { treeId: id, index, publicId: smallResult.public_id });
        } catch (error) {
          logError(`Failed to upload small image ${index + 1} to Cloudinary`, error instanceof Error ? error : new Error(String(error)));
          return NextResponse.json(
            { success: false, error: `Failed to upload small image ${index + 1}. Please try again.` },
            { status: 500 }
          );
        }
      }

      // Remove undefined entries (in case we're replacing beyond existing array length)
      const filteredUrls = smallImageUrls.filter((url): url is string => url !== undefined);
      const filteredPublicIds = smallImagePublicIds.filter((id): id is string => id !== undefined);

      updateData.smallImageUrls = filteredUrls;
      updateData.smallImagePublicIds = filteredPublicIds;

      // Delete old small images that were replaced (best effort)
      for (const oldPublicId of oldPublicIdsToDelete) {
        try {
          await deleteFromCloudinary(oldPublicId);
          logInfo('Old small image deleted from Cloudinary', { treeId: id, publicId: oldPublicId });
        } catch (deleteError) {
          logWarning('Failed to delete old small image from Cloudinary', { 
            treeId: id, 
            publicId: oldPublicId,
            error: deleteError instanceof Error ? deleteError.message : String(deleteError)
          });
          // Continue even if deletion fails
        }
      }
    }

    // Sanitize string fields
    updateData.name = updateData.name.trim();
    updateData.info = updateData.info.trim();
    if (updateData.scientificSpecies) {
      updateData.scientificSpecies = updateData.scientificSpecies.trim();
    }

    const tree = await Tree.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!tree) {
      logWarning('Tree update failed: tree not found', { treeId: id });
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    logInfo('Tree updated successfully', { 
      treeId: id, 
      name: tree.name 
    });

    // Revalidate Next.js cache
    revalidatePath('/individuals');
    revalidatePath('/companies');
    revalidatePath(`/tree/${id}`);

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree updated successfully'
    });

  } catch (error) {
    logError('Unexpected error updating tree', error instanceof Error ? error : new Error(String(error)), { treeId: id });
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tree ID' },
        { status: 400 }
      );
    }

    const tree = await Tree.findById(id).lean();

    if (!tree) {
      logWarning('Tree delete failed: tree not found', { treeId: id });
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    logInfo('Deleting tree', { treeId: id, name: tree.name });

    // Delete image from Cloudinary (best effort)
    if (tree.imagePublicId) {
      try {
        await deleteFromCloudinary(tree.imagePublicId);
        logInfo('Image deleted from Cloudinary', { treeId: id, publicId: tree.imagePublicId });
      } catch (imgError) {
        logWarning('Failed to delete image from Cloudinary', { 
          treeId: id, 
          publicId: tree.imagePublicId,
          error: imgError instanceof Error ? imgError.message : String(imgError)
        });
        // Continue with database deletion even if image deletion fails
      }
    }

    // Soft delete by setting isActive to false
    const updatedTree = await Tree.findByIdAndUpdate(
      id, 
      { isActive: false },
      { new: true }
    );

    if (!updatedTree) {
      logError('Failed to soft delete tree', new Error('Update returned null'), { treeId: id });
      return NextResponse.json(
        { success: false, error: 'Failed to delete tree' },
        { status: 500 }
      );
    }

    logInfo('Tree deleted successfully', { treeId: id, name: tree.name });

    // Revalidate Next.js cache for user-facing pages
    revalidatePath('/individuals');
    revalidatePath('/companies');
    revalidatePath('/api/trees');
    revalidatePath(`/tree/${id}`);

    return NextResponse.json({
      success: true,
      message: 'Tree deleted successfully'
    });

  } catch (error) {
    logError('Unexpected error deleting tree', error instanceof Error ? error : new Error(String(error)), { treeId: id });
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
