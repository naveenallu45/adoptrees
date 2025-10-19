import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import cloudinary from './cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function uploadToCloudinary(file: any): Promise<{ url: string; publicId: string }> {
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
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(data);
    });

    return {
      url: (result as any).secure_url,
      publicId: (result as any).public_id
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
