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
  
  // Decode URL-encoded publicId and trim whitespace (do this outside try block)
  let rawPublicId = '';
  try {
    rawPublicId = decodeURIComponent(publicId || '').trim();
  } catch {
    // If decodeURIComponent fails, just use the original value
    rawPublicId = (publicId || '').trim();
  }
  
  try {
    await connectDB();
    
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
  
  // URL-encode the publicId when redirecting to ensure special characters are handled correctly
  const encodedPublicId = encodeURIComponent(rawPublicId || publicId);
  
  // Redirect to dashboard trees with publicId, so we reuse the same page and sidebar is auto-disabled
  const dest = userType === 'company'
    ? `/dashboard/company/trees?publicId=${encodedPublicId}`
    : `/dashboard/individual/trees?publicId=${encodedPublicId}`;
  redirect(dest);
}


