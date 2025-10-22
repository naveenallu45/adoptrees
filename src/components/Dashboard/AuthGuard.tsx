'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

interface AuthGuardProps {
  children: React.ReactNode;
  userType: 'individual' | 'company';
}

export default function AuthGuard({ children, userType }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.userType !== userType) {
      // Redirect to the correct dashboard based on user type
      if (session.user.userType === 'individual') {
        router.push('/dashboard/individual/trees');
      } else if (session.user.userType === 'company') {
        router.push('/dashboard/company/trees');
      }
      return;
    }
  }, [session, status, router, userType]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.userType !== userType) {
    return null;
  }

  return (
    <>
      <Toaster position="bottom-right" />
      {children}
    </>
  );
}
