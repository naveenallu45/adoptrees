'use client';

import IndividualSidebar from '@/components/Dashboard/IndividualSidebar';
import AuthGuard from '@/components/Dashboard/AuthGuard';

export default function IndividualDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <AuthGuard userType="individual">
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <IndividualSidebar />
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
