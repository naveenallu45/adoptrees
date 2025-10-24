'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import AuthGuard from '@/components/Admin/AuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

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
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Toaster position="bottom-right" />
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="h-full">{children}</div>
          </main>
        </div>
      </AuthGuard>
    </QueryClientProvider>
  );
}

