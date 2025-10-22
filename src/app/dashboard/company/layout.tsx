'use client';

import CompanySidebar from '@/components/Dashboard/CompanySidebar';
import AuthGuard from '@/components/Dashboard/AuthGuard';

export default function CompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <AuthGuard userType="company">
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <CompanySidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            <div className="p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
