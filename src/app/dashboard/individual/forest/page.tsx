'use client';

import UserTreesList from '@/components/Dashboard/UserTreesList';
import ForestProfileCard from '@/components/Dashboard/ForestProfileCard';
import { useSearchParams } from 'next/navigation';

export default function IndividualForestPage() {
  const searchParams = useSearchParams();
  const publicId = searchParams.get('publicId') || undefined;

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="w-full">
        <ForestProfileCard userType="individual" publicId={publicId} focus="forest" />
      </div>

      <div className="w-full">
        <UserTreesList userType="individual" publicId={publicId} showForestOnly />
      </div>
    </div>
  );
}

