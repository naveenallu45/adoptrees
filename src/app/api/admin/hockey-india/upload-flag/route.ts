import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { uploadToCloudinary } from '@/lib/upload';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    const folder = 'adoptrees/hockey-india/flags';

    const { url, publicId } = await uploadToCloudinary(file, folder, {
      width: 600,
      height: 400,
      crop: 'limit',
      quality: 'auto',
    });

    return NextResponse.json({
      success: true,
      url,
      publicId,
    });
  } catch (error) {
    console.error('Error uploading Hockey India flag:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

