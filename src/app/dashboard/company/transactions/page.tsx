'use client';

import UserTreesList from '@/components/Dashboard/UserTreesList';
import { CreditCardIcon, CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface TransactionStats {
  totalSpent: number;
  totalOrders: number;
  totalTrees: number;
}

interface OrderItem {
  quantity: number;
  [key: string]: unknown;
}

interface Order {
  paymentStatus: string;
  totalAmount: number;
  items: OrderItem[];
  [key: string]: unknown;
}

export default function CompanyTransactionsPage() {
  const [stats, setStats] = useState<TransactionStats>({
    totalSpent: 0,
    totalOrders: 0,
    totalTrees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/orders');
        const result = await response.json();
        
        if (result.success) {
          const orders = result.data || [];
          const totalSpent = orders.reduce((sum: number, order: Order) => {
            if (order.paymentStatus === 'paid') {
              return sum + order.totalAmount;
            }
            return sum;
          }, 0);
          
          const totalTrees = orders.reduce((sum: number, order: Order) => {
            return sum + order.items.reduce((itemSum: number, item: OrderItem) => itemSum + item.quantity, 0);
          }, 0);

          setStats({
            totalSpent,
            totalOrders: orders.length,
            totalTrees,
          });
        }
      } catch (error) {
        console.error('Failed to fetch transaction stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-2 text-base text-gray-600">
            View your company&apos;s transaction history and financial details
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      {!loading && stats.totalOrders > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Trees Adopted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTrees}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCardIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List Component */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
          <p className="mt-1 text-sm text-gray-600">All your company&apos;s past orders and payments</p>
        </div>
        <div className="p-6">
          <UserTreesList userType="company" />
        </div>
      </div>
    </div>
  );
}
