'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Home/Navbar';
import Footer from '@/components/Home/Footer';
type AdminShellProps = {
  children: ReactNode;
};

// Renders site chrome except on /admin, /dashboard, and /wellwisher routes
export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isWellWisherRoute = pathname?.startsWith('/wellwisher');
  const isPublicUserRoute = pathname?.startsWith('/u/');
  const isLoginPage = pathname === '/login' || pathname === '/register' || pathname?.startsWith('/admin/login');

  // Hide navbar only on admin, dashboard, wellwisher, public user routes, and login pages
  if (isAdminRoute || isDashboardRoute || isWellWisherRoute || isPublicUserRoute || isLoginPage) {
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


