import cloudinary from './cloudinary';

export async function uploadToCloudinary(file: File): Promise<{ url: string; publicId: string }> {
  try {
    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Convert to base64 for Cloudinary
    const base64String = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64String}`;
    
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'adoptrees/trees',
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'fill', quality: 'auto' },
        { format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image');
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error('Failed to delete image');
  }
}
