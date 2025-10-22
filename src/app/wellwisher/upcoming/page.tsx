'use client';

import { motion } from 'framer-motion';
import { ClockIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function UpcomingPage() {
  const upcomingTasks = [
    {
      id: 1,
      treeId: 'TREE-001',
      location: 'Central Park, New York',
      task: 'Watering and soil check',
      scheduledDate: '2024-01-15',
      priority: 'High',
      description: 'Regular watering and soil moisture check for newly planted oak tree.',
    },
    {
      id: 2,
      treeId: 'TREE-002',
      location: 'Riverside Park, New York',
      task: 'Fertilizer application',
      scheduledDate: '2024-01-16',
      priority: 'Medium',
      description: 'Apply organic fertilizer to promote healthy growth.',
    },
    {
      id: 3,
      treeId: 'TREE-003',
      location: 'Brooklyn Bridge Park, New York',
      task: 'Pruning and maintenance',
      scheduledDate: '2024-01-18',
      priority: 'Low',
      description: 'Light pruning to remove dead branches and shape the tree.',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
        <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
      </motion.div>

      <div className="grid gap-6">
        {upcomingTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.task}</h3>
                  <p className="text-sm text-gray-600">Tree ID: {task.treeId}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4" />
                <span>{task.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4" />
                <span>{task.scheduledDate}</span>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{task.description}</p>

            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                Start Task
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                View Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
