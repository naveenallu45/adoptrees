'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ClockIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { isOnline, getNetworkErrorMessage, retryWithBackoff } from '@/lib/utils/wellwisher';

interface DashboardStats {
  upcomingTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  updatingTasks: number;
  treesHelped: number;
  recentActivity: Array<{
    id: string;
    task: string;
    status: 'pending' | 'in_progress' | 'completed';
    orderId: string;
    timeAgo: string;
    timestamp: Date;
  }>;
}

export default function WellWisherDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (showToast = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!isOnline()) {
        setError('You are offline. Please check your internet connection.');
        return;
      }

      const result = await retryWithBackoff(async () => {
        const response = await fetch('/api/wellwisher/stats', {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      });

      if (result.success) {
        setStats(result.data);
        if (showToast) {
          toast.success('Dashboard refreshed', { duration: 2000 });
        }
      } else {
        setError(result.error || 'Failed to load dashboard');
        if (showToast) {
          toast.error(result.error || 'Failed to refresh dashboard');
        }
      }
    } catch (error) {
      const errorMessage = getNetworkErrorMessage(error);
      setError(errorMessage);
      if (showToast) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircleIcon;
      case 'in_progress':
        return ArrowPathIcon;
      case 'pending':
        return ClockIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: 'text-green-600', bg: 'bg-green-50' };
      case 'in_progress':
        return { icon: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'pending':
        return { icon: 'text-blue-600', bg: 'bg-blue-50' };
      default:
        return { icon: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'in_progress':
        return 'in progress';
      case 'pending':
        return 'scheduled';
      default:
        return status;
    }
  };

  const statCards = stats ? [
    {
      name: 'Upcoming Tasks',
      value: stats.upcomingTasks.toString(),
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/wellwisher/upcoming',
    },
    {
      name: 'Ongoing Tasks',
      value: stats.ongoingTasks.toString(),
      icon: ArrowPathIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/wellwisher/ongoing',
    },
    {
      name: 'Completed Tasks',
      value: stats.completedTasks.toString(),
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/wellwisher/completed',
    },
    {
      name: 'Trees Helped',
      value: stats.treesHelped.toString(),
      icon: HeartIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/wellwisher/completed', // Show completed tasks for trees helped
    },
  ] : [];

  if (loading && !stats) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Well-Wisher Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s an overview of your activities.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Well-Wisher Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here&apos;s an overview of your activities.</p>
          </div>
          <button
            onClick={() => fetchStats(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshIcon className="h-5 w-5" />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">Error Loading Dashboard</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Well-Wisher Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s an overview of your activities.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => stat.href && router.push(stat.href)}
              className={`${stat.bgColor} rounded-xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all hover:scale-105`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {stats && stats.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => {
              const StatusIcon = getStatusIcon(activity.status);
              const colors = getStatusColor(activity.status);
              
              // Determine which page to navigate to based on status
              const getActivityHref = (status: string) => {
                switch (status) {
                  case 'pending':
                    return '/wellwisher/upcoming';
                  case 'in_progress':
                    return '/wellwisher/ongoing';
                  case 'completed':
                    return '/wellwisher/completed';
                  default:
                    return '/wellwisher/upcoming';
                }
              };
              
              return (
                <div
                  key={activity.id}
                  onClick={() => router.push(getActivityHref(activity.status))}
                  className={`flex items-center space-x-4 p-4 ${colors.bg} rounded-lg transition-all hover:shadow-md cursor-pointer hover:scale-[1.02]`}
                >
                  <StatusIcon className={`h-6 w-6 ${colors.icon}`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.task}</p>
                    <p className="text-sm text-gray-600">
                      {getStatusText(activity.status)} • {activity.timeAgo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent activity</p>
            <p className="text-sm text-gray-500 mt-1">Your recent tasks will appear here</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
