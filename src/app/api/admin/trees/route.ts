import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import cloudinary from '@/lib/cloudinary';
import { requireAdmin } from '@/lib/api-auth';
import { treeSchema, validateImageFile, MAX_FILE_SIZE } from '@/lib/validations/tree';
import { logError, logInfo, logWarning } from '@/lib/logger';

export async function GET() {
  try {
    await connectDB();
    const trees = await Tree.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    logInfo('Trees fetched successfully', { count: trees.length });
    return NextResponse.json({ success: true, data: trees });
  } catch (error) {
    logError('Failed to fetch trees', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees. Please try again later.' },
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
    const scientificSpecies = formData.get('scientificSpecies') as string;
    const speciesInfoAvailableStr = formData.get('speciesInfoAvailable') as string;
    const co2Str = formData.get('co2') as string;
    const foodSecurityStr = formData.get('foodSecurity') as string;
    const economicDevelopmentStr = formData.get('economicDevelopment') as string;
    const co2AbsorptionStr = formData.get('co2Absorption') as string;
    const environmentalProtectionStr = formData.get('environmentalProtection') as string;
    const localUsesArray = formData.getAll('localUses[]') as string[];
    const image = formData.get('image') as File;

    // Log received form data (sanitized for production)
    logInfo('Tree creation request received', {
      hasName: !!name,
      hasImage: !!image,
      treeType,
      localUsesCount: localUsesArray.length,
    });

    // Validate required fields
    const missingFields: string[] = [];
    if (!name || name.trim() === '') missingFields.push('name');
    if (!priceStr || priceStr.trim() === '') missingFields.push('price');
    if (!info || info.trim() === '') missingFields.push('info');
    if (!oxygenKgsStr || oxygenKgsStr.trim() === '') missingFields.push('oxygenKgs');
    if (!image || image.size === 0) missingFields.push('image');
    
    if (missingFields.length > 0) {
      logWarning('Tree creation failed: missing required fields', { missingFields });
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Parse numeric values
    const price = parseFloat(priceStr);
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
      logWarning('Tree creation failed: invalid numeric fields', numericFieldErrors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: Object.entries(numericFieldErrors).map(([field, message]) => ({ field, message }))
        },
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
      
      logWarning('Tree creation failed: validation error', { errors });
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed. Please check your input.',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Validate image file
    const imageValidation = validateImageFile(image);
    if (!imageValidation.valid) {
      logWarning('Tree creation failed: invalid image', { error: imageValidation.error });
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
      logWarning('Tree creation failed: image too large', { size: buffer.length });
      return NextResponse.json(
        { success: false, error: 'Image file size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    let result: { secure_url: string; public_id: string };
    try {
      const base64String = buffer.toString('base64');
      const dataUri = `data:${image.type};base64,${base64String}`;
      
      result = await cloudinary.uploader.upload(dataUri, {
        folder: 'adoptrees/trees',
        resource_type: 'image',
        transformation: [
          { width: 2000, height: 2000, crop: 'limit', quality: 'auto' },
          { format: 'auto' }
        ]
      });
      
      logInfo('Image uploaded to Cloudinary', { publicId: result.public_id });
    } catch (error) {
      logError('Failed to upload image to Cloudinary', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, error: 'Failed to upload image. Please try again.' },
        { status: 500 }
      );
    }

    // Build tree data object with sanitized inputs
    const treeData: {
      name: string;
      price: number;
      info: string;
      oxygenKgs: number;
      imageUrl: string;
      imagePublicId: string;
      treeType: string;
      packageQuantity: number;
      packagePrice?: number;
      speciesInfoAvailable: boolean;
      localUses: string[];
      scientificSpecies?: string;
      co2?: number;
      foodSecurity?: number;
      economicDevelopment?: number;
      co2Absorption?: number;
      environmentalProtection?: number;
    } = {
      name: validationResult.data.name.trim(),
      price: validationResult.data.price,
      info: validationResult.data.info.trim(),
      oxygenKgs: validationResult.data.oxygenKgs,
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
      treeType: validationResult.data.treeType,
      packageQuantity: validationResult.data.packageQuantity ?? 1,
      packagePrice: validationResult.data.packagePrice,
      speciesInfoAvailable: speciesInfoAvailable,
      localUses: localUsesArray.length > 0 ? localUsesArray : [],
    };

    // Include optional additional fields
    if (scientificSpecies && scientificSpecies.trim() !== '') {
      treeData.scientificSpecies = scientificSpecies.trim();
    }
    
    if (co2 !== undefined && typeof co2 === 'number' && !isNaN(co2)) {
      treeData.co2 = co2;
    }
    
    if (foodSecurity !== undefined && typeof foodSecurity === 'number' && !isNaN(foodSecurity)) {
      treeData.foodSecurity = foodSecurity;
    }
    
    if (economicDevelopment !== undefined && typeof economicDevelopment === 'number' && !isNaN(economicDevelopment)) {
      treeData.economicDevelopment = economicDevelopment;
    }
    
    if (co2Absorption !== undefined && typeof co2Absorption === 'number' && !isNaN(co2Absorption)) {
      treeData.co2Absorption = co2Absorption;
    }
    
    if (environmentalProtection !== undefined && typeof environmentalProtection === 'number' && !isNaN(environmentalProtection)) {
      treeData.environmentalProtection = environmentalProtection;
    }
    
    // Create tree instance
    const tree = new Tree();
    Object.assign(tree, treeData);
    
    // Mark additional fields as modified to ensure they're saved
    if (treeData.scientificSpecies !== undefined) {
      tree.markModified('scientificSpecies');
    }
    if (treeData.co2 !== undefined) {
      tree.markModified('co2');
    }
    if (treeData.foodSecurity !== undefined) {
      tree.markModified('foodSecurity');
    }
    if (treeData.economicDevelopment !== undefined) {
      tree.markModified('economicDevelopment');
    }
    if (treeData.co2Absorption !== undefined) {
      tree.markModified('co2Absorption');
    }
    if (treeData.environmentalProtection !== undefined) {
      tree.markModified('environmentalProtection');
    }
    if (treeData.localUses !== undefined) {
      tree.markModified('localUses');
    }
    
    // Save tree to database
    try {
      await tree.save({ validateBeforeSave: true });
      const treeId = tree._id && typeof tree._id === 'object' && 'toString' in tree._id 
        ? tree._id.toString() 
        : String(tree._id);
      logInfo('Tree created successfully', { treeId, name: tree.name });
    } catch (saveError) {
      // If save fails, try to delete uploaded image
      try {
        await cloudinary.uploader.destroy(result.public_id);
      } catch (deleteError) {
        logError('Failed to delete uploaded image after save failure', deleteError instanceof Error ? deleteError : new Error(String(deleteError)));
      }
      
      logError('Failed to save tree to database', saveError instanceof Error ? saveError : new Error(String(saveError)));
      return NextResponse.json(
        { success: false, error: 'Failed to save tree. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree created successfully'
    });

  } catch (error) {
    logError('Unexpected error creating tree', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
