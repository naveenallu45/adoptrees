import { redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// Ensure this route is dynamic and not cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Safely escape RegExp special characters in a string
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function PublicForestPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let userType: 'individual' | 'company' = 'individual';
  
  try {
    await connectDB();
    const rawPublicId = (publicId || '').trim();
    
    if (!rawPublicId) {
      console.error('[PublicRoute] Empty publicId provided');
      // Default to individual and redirect
    } else {
      // Query user by publicId (case-insensitive to support legacy mixed-case IDs)
      const publicIdRegex = new RegExp(`^${escapeRegExp(rawPublicId)}$`, 'i');
      const userDoc = await User.findOne({ publicId: publicIdRegex }).select('userType').lean();

      if (userDoc && !Array.isArray(userDoc) && 'userType' in userDoc && userDoc.userType) {
        const resolvedType = userDoc.userType as string;
        if (resolvedType === 'company' || resolvedType === 'individual') {
          userType = resolvedType;
        }
      } else {
        console.error(`[PublicRoute] User not found for publicId: ${rawPublicId}`);
      }
    }
  } catch (error) {
    console.error('[PublicRoute] Error fetching user type:', error);
    // Default to individual if there's an error
  }
  
  // Redirect to dashboard trees with publicId, so we reuse the same page and sidebar is auto-disabled
  const dest = userType === 'company'
    ? `/dashboard/company/trees?publicId=${publicId}`
    : `/dashboard/individual/trees?publicId=${publicId}`;
  redirect(dest);
}


