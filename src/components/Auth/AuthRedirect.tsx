'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

interface AuthRedirectProps {
  children: React.ReactNode;
}

export default function AuthRedirect({ children }: AuthRedirectProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session) {
      // Check if there's a redirect parameter (e.g., from cart page)
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        // User is already logged in, redirect to appropriate dashboard
        if (session.user.userType === 'individual') {
          router.push('/dashboard/individual/trees');
        } else if (session.user.userType === 'company') {
          router.push('/dashboard/company/trees');
        } else if (session.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    }
  }, [session, status, router, redirectTo]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-green-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return null; // Don't render anything while redirecting
  }

  return <>{children}</>;
}
