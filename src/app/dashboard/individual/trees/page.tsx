'use client';

import UserTreesList from '@/components/Dashboard/UserTreesList';
import ForestProfileCard from '@/components/Dashboard/ForestProfileCard';
import { useSearchParams } from 'next/navigation';

export default function IndividualTreesPage() {
  const searchParams = useSearchParams();
  const publicId = searchParams.get('publicId') || undefined;
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Forest Profile Card */}
      <ForestProfileCard userType="individual" publicId={publicId} />

      {/* User Trees List Component */}
      <UserTreesList userType="individual" publicId={publicId} />
    </div>
  );
}
