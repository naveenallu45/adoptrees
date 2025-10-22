'use client';

import { motion } from 'framer-motion';
import { 
  ClockIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  HeartIcon 
} from '@heroicons/react/24/outline';

export default function WellWisherDashboard() {
  const stats = [
    {
      name: 'Upcoming Tasks',
      value: '12',
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Ongoing Tasks',
      value: '8',
      icon: ArrowPathIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      name: 'Completed Tasks',
      value: '45',
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Trees Helped',
      value: '156',
      icon: HeartIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

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
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bgColor} rounded-xl p-6 shadow-sm border border-gray-100`}
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
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Tree #1234 maintenance completed</p>
              <p className="text-sm text-gray-600">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-yellow-50 rounded-lg">
            <ArrowPathIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-gray-900">Tree #1235 watering in progress</p>
              <p className="text-sm text-gray-600">4 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
            <ClockIcon className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Tree #1236 scheduled for tomorrow</p>
              <p className="text-sm text-gray-600">1 day ago</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
