'use client';

import UserTreesList from '@/components/Dashboard/UserTreesList';

export default function IndividualTransactionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-2 text-gray-600">
            View your transaction history and financial details
          </p>
        </div>
      </div>

      {/* Transactions List Component - Show only transactions tab */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
          <UserTreesList userType="individual" />
        </div>
      </div>
    </div>
  );
}
