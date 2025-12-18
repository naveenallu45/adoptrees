'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CompanyDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to the trees page by default, preserving query params
    const params = searchParams.toString();
    router.replace(`/dashboard/company/trees${params ? `?${params}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        <p className="mt-4 text-lg text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
