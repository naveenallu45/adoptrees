'use client';

import { motion } from 'framer-motion';
import { UserIcon, BuildingOfficeIcon, CurrencyRupeeIcon, HeartIcon } from '@heroicons/react/24/outline';
import { SparklesIcon as TreeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAdminStats, type AdminStats } from '@/hooks/useAdminData';


export default function AdminDashboard() {
  const { data: session } = useSession();
  const { data: stats, isLoading: loading } = useAdminStats();
  
  // Type assertion to help TypeScript understand the type
  const typedStats = stats as AdminStats | undefined;

  const statCards = [
    {
      title: 'Total Trees',
      value: typedStats?.totalTrees ?? 0,
      icon: TreeIcon,
      color: 'bg-green-500',
      link: '/admin/trees',
    },
    {
      title: 'Individual Users',
      value: typedStats?.totalIndividuals ?? 0,
      icon: UserIcon,
      color: 'bg-blue-500',
      link: '/admin/users/individuals',
    },
    {
      title: 'Company Users',
      value: typedStats?.totalCompanies ?? 0,
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500',
      link: '/admin/users/companies',
    },
    {
      title: 'Well-Wishers',
      value: typedStats?.totalWellWishers ?? 0,
      icon: HeartIcon,
      color: 'bg-pink-500',
      link: '/admin/wellwishers',
    },
    {
      title: 'Total Revenue',
      value: `₹${(typedStats?.totalRevenue ?? 0).toLocaleString()}`,
      icon: CurrencyRupeeIcon,
      color: 'bg-yellow-500',
      link: '#',
    },
  ];

  if (loading && !typedStats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || 'Admin'}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link href={card.link} key={card.title}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer overflow-hidden rounded-lg bg-white shadow-lg transition-all hover:shadow-xl"
                  whileHover={{ y: -4 }}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{card.title}</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                      </div>
                      <div className={`rounded-full ${card.color} p-3`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className={`h-1 ${card.color}`}></div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Quick Actions</h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Link href="/admin/trees">
              <motion.div
                className="flex h-full min-h-[180px] cursor-pointer flex-col rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg transition-all hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <TreeIcon className="mb-4 h-10 w-10" />
                <h3 className="text-xl font-bold">Manage Trees</h3>
                <p className="mt-2 text-green-100">Add, edit, or remove trees</p>
              </motion.div>
            </Link>

            <Link href="/admin/users/individuals">
              <motion.div
                className="flex h-full min-h-[180px] cursor-pointer flex-col rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-all hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserIcon className="mb-4 h-10 w-10" />
                <h3 className="text-xl font-bold">Individual Users</h3>
                <p className="mt-2 text-blue-100">View and manage individual accounts</p>
              </motion.div>
            </Link>

            <Link href="/admin/users/companies">
              <motion.div
                className="flex h-full min-h-[180px] cursor-pointer flex-col rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg transition-all hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BuildingOfficeIcon className="mb-4 h-10 w-10" />
                <h3 className="text-xl font-bold">Company Users</h3>
                <p className="mt-2 text-purple-100">View and manage company accounts</p>
              </motion.div>
            </Link>

            <Link href="/admin/wellwishers">
              <motion.div
                className="flex h-full min-h-[180px] cursor-pointer flex-col rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 p-6 text-white shadow-lg transition-all hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <HeartIcon className="mb-4 h-10 w-10" />
                <h3 className="text-xl font-bold">Well-Wishers</h3>
                <p className="mt-2 text-pink-100">Manage well-wishers and view their status</p>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Recent Activity</h2>
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <p className="text-gray-500">No recent activity to display</p>
          </div>
        </div>
      </div>
    </div>
  );
}
