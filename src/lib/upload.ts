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
    
    interface CloudinaryTransform {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    }
    
    const transformation: CloudinaryTransform[] = [];
    
    if (options?.width || options?.height) {
      // Create a single transformation object with all options
      const transform: CloudinaryTransform = {};
      if (options.width) transform.width = options.width;
      if (options.height) transform.height = options.height;
      if (options.crop) transform.crop = options.crop;
      if (options.quality) transform.quality = options.quality;
      if (options.format) transform.format = options.format;
      transformation.push(transform);
    } else {
      // Default transformations
      transformation.push(
        { width: 800, height: 600, crop: 'fill', quality: 'auto' },
        { format: 'auto' }
      );
    }
    
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      transformation: transformation.length > 0 ? transformation : undefined,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload image: ${errorMessage}`);
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (_error) {
    throw new Error('Failed to delete image');
  }
}
