'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IndividualDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the trees page by default
    router.replace('/dashboard/individual/trees');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
        <p className="mt-4 text-lg text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
