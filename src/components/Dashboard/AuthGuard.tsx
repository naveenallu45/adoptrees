'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

interface AuthGuardProps {
  children: React.ReactNode;
  userType: 'individual' | 'company' | 'dealer';
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

    // Allow dealers to access company dashboard
    const isAllowed = session.user.userType === userType || 
                      (userType === 'company' && session.user.userType === 'dealer') ||
                      (userType === 'dealer' && session.user.userType === 'company');
    
    if (!isAllowed) {
      // Redirect to the correct dashboard based on user type
      if (session.user.userType === 'individual') {
        router.push('/dashboard/individual/trees');
      } else if (session.user.userType === 'company' || session.user.userType === 'dealer') {
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

  // Allow dealers to access company dashboard
  const isAllowed = session && (
    session.user.userType === userType || 
    (userType === 'company' && session.user.userType === 'dealer') ||
    (userType === 'dealer' && session.user.userType === 'company')
  );
  
  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <Toaster position="bottom-right" />
      {children}
    </>
  );
}
