'use client';

import UserTreesList from '@/components/Dashboard/UserTreesList';
import ForestProfileCard from '@/components/Dashboard/ForestProfileCard';
import { useSearchParams } from 'next/navigation';

export default function CompanyTreesPage() {
  const searchParams = useSearchParams();
  const publicId = searchParams.get('publicId') || undefined;
  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Forest Profile Card */}
      <div className="w-full">
        <ForestProfileCard userType="company" publicId={publicId} />
      </div>

      {/* User Trees List Component */}
      <div className="w-full">
        <UserTreesList userType="company" publicId={publicId} />
      </div>
    </div>
  );
}
