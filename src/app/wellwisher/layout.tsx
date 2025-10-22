'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import WellWisherSidebar from '@/components/WellWisher/WellWisherSidebar';
import AuthGuard from '@/components/WellWisher/AuthGuard';

export default function WellWisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/wellwisher/login';

  // Don't apply AuthGuard or sidebar on login page
  if (isLoginPage) {
    return (
      <>
        <Toaster position="bottom-right" />
        {children}
      </>
    );
  }

  return (
    <AuthGuard>
      <Toaster position="bottom-right" />
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <WellWisherSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
