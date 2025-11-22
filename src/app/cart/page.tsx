'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CartNavbar from '@/components/Cart/CartNavbar';
import CartContent from '@/components/Cart/CartContent';

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      // Redirect to login with cart as redirect destination
      router.push('/login?redirect=/cart');
      return;
    }
  }, [session, status, router]);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render cart if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <CartNavbar />
      <CartContent />
    </div>
  );
}
