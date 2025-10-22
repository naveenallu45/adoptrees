'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Home/Navbar';
import Footer from '@/components/Home/Footer';
type AdminShellProps = {
  children: ReactNode;
};

// Renders site chrome except on /admin and /dashboard routes
export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  if (isAdminRoute || isDashboardRoute) {
    return <main className="pt-0 min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}


