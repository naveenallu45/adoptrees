import cloudinary from './cloudinary';

interface UploadOptions {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
}

export async function uploadToCloudinary(
  file: File,
  folder: string = 'adoptrees/trees',
  options?: UploadOptions
): Promise<{ url: string; publicId: string }> {
  try {
    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Convert to base64 for Cloudinary
    const base64String = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64String}`;
    
    // Build transformation array for Cloudinary
    const transformation: Array<Record<string, string | number>> = [];
    
    if (options?.width || options?.height || options?.crop || options?.quality || options?.format) {
      // Create transformation object with provided options
      const transform: Record<string, string | number> = {};
      if (options.width) transform.width = options.width;
      if (options.height) transform.height = options.height;
      if (options.crop) transform.crop = options.crop;
      if (options.quality) transform.quality = options.quality;
      if (options.format) transform.format = options.format;
      transformation.push(transform);
    }
    
    // Upload to Cloudinary with proper configuration
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };
    
    // Add transformations if provided
    if (transformation.length > 0) {
      uploadOptions.transformation = transformation;
    }
    
    console.log('Uploading to Cloudinary:', {
      folder,
      hasTransformations: transformation.length > 0,
      fileSize: buffer.length,
      fileType: file.type,
    });
    
    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

    console.log('Cloudinary upload successful:', {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload image to Cloudinary: ${errorMessage}`);
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (_error) {
    throw new Error('Failed to delete image');
  }
}

/**
 * Upload certificate PDF to Cloudinary
 * @param certificateBuffer - PDF certificate as Buffer
 * @param orderId - Order ID for filename
 * @returns Cloudinary URL and public ID
 */
export async function uploadCertificateToCloudinary(
  certificateBuffer: Buffer,
  orderId: string
): Promise<{ url: string; publicId: string }> {
  try {
    // Convert Buffer to base64 for Cloudinary
    const base64String = certificateBuffer.toString('base64');
    const dataUri = `data:application/pdf;base64,${base64String}`;
    
    // Upload to Cloudinary with PDF resource type
    const uploadOptions = {
      folder: 'adoptrees/certificates',
      resource_type: 'raw' as const, // PDF files should use 'raw' resource type
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      filename_override: `certificate-${orderId}`,
      format: 'pdf',
    };
    
    console.log('Uploading certificate to Cloudinary:', {
      orderId,
      size: certificateBuffer.length,
      folder: uploadOptions.folder,
    });
    
    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

    console.log('Certificate upload successful:', {
      publicId: result.public_id,
      url: result.secure_url,
      orderId,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Certificate upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload certificate to Cloudinary: ${errorMessage}`);
  }
}
