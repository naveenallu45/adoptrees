
import ForestProfileCard from '@/components/Dashboard/ForestProfileCard';
import UserTreesList from '@/components/Dashboard/UserTreesList';
import { redirect } from 'next/navigation';

export default async function PublicForestPage({ params }: { params: { publicId: string } }) {
  const { publicId } = params;
  let userType: 'individual' | 'company' = 'individual';
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/public/users/${publicId}/orders`, { cache: 'no-store' });
    const data = await res.json();
    if (data?.success && data?.data?.user?.userType) {
      userType = data.data.user.userType;
    }
  } catch {}
  // Redirect to dashboard trees with publicId, so we reuse the same page and sidebar is auto-disabled
  const dest = userType === 'company'
    ? `/dashboard/company/trees?publicId=${publicId}`
    : `/dashboard/individual/trees?publicId=${publicId}`;
  redirect(dest);
}


