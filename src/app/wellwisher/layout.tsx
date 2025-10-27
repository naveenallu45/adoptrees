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
        {/* Mobile sidebar overlay */}
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50 hidden" 
          id="sidebar-overlay"
          onClick={() => {
            const sidebar = document.getElementById('mobile-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) {
              sidebar.classList.add('-translate-x-full');
              overlay.classList.add('hidden');
            }
          }}
        ></div>
        
        {/* Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <WellWisherSidebar />
        </div>
        
        {/* Mobile sidebar */}
        <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform -translate-x-full transition-transform duration-300 ease-in-out" id="mobile-sidebar">
          <WellWisherSidebar />
        </div>
        
        {/* Main content */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          {/* Mobile header */}
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                const sidebar = document.getElementById('mobile-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar && overlay) {
                  sidebar.classList.remove('-translate-x-full');
                  overlay.classList.remove('hidden');
                }
              }}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Well Wisher</h1>
            <div className="w-10"></div>
          </div>
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
