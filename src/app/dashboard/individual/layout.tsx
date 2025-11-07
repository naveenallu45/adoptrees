'use client';

import IndividualSidebar from '@/components/Dashboard/IndividualSidebar';
import AuthGuard from '@/components/Dashboard/AuthGuard';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const publicId = searchParams.get('publicId');
  
  if (publicId) {
    return <PublicLayout>{children}</PublicLayout>;
  }
  return (
    <AuthGuard userType="individual">
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
          <IndividualSidebar />
        </div>
        
        {/* Mobile sidebar */}
        <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform -translate-x-full transition-transform duration-300 ease-in-out" id="mobile-sidebar">
          <IndividualSidebar />
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
            <h1 className="text-lg font-semibold text-gray-900">Adoptrees</h1>
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

export default function IndividualDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
