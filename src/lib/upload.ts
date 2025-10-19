import { promises as fs } from 'fs';
import cloudinary from './cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function uploadToCloudinary(file: File): Promise<{ url: string; publicId: string }> {
  try {
    const data = await fs.readFile(file.filepath);
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'adoptrees/trees',
          transformation: [
            { width: 800, height: 600, crop: 'fill', quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error: Error | null, result: unknown) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(data);
    });

    return {
      url: (result as { secure_url: string; public_id: string }).secure_url,
      publicId: (result as { secure_url: string; public_id: string }).public_id
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
