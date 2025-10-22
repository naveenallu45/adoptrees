'use client';

import { motion } from 'framer-motion';
import { ArrowPathIcon, MapPinIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function UpdatingPage() {
  const updatingTasks = [
    {
      id: 1,
      treeId: 'TREE-011',
      location: 'Prospect Park, New York',
      task: 'Watering system maintenance',
      lastUpdated: '2024-01-14 08:30',
      status: 'Needs Attention',
      priority: 'High',
      description: 'Irrigation system requires calibration and maintenance.',
      updates: [
        { date: '2024-01-14 08:30', note: 'System pressure dropped significantly' },
        { date: '2024-01-13 15:45', note: 'Initial inspection completed' },
        { date: '2024-01-13 10:20', note: 'Issue reported by park maintenance' },
      ],
    },
    {
      id: 2,
      treeId: 'TREE-012',
      location: 'Battery Park, New York',
      task: 'Soil condition monitoring',
      lastUpdated: '2024-01-14 07:15',
      status: 'In Progress',
      priority: 'Medium',
      description: 'Ongoing monitoring of soil pH and nutrient levels.',
      updates: [
        { date: '2024-01-14 07:15', note: 'pH levels showing improvement' },
        { date: '2024-01-13 16:00', note: 'Applied lime treatment' },
        { date: '2024-01-12 14:30', note: 'Soil test results received' },
      ],
    },
    {
      id: 3,
      treeId: 'TREE-013',
      location: 'High Line, New York',
      task: 'Pest management update',
      lastUpdated: '2024-01-14 06:45',
      status: 'Monitoring',
      priority: 'Low',
      description: 'Follow-up treatment for pest control effectiveness.',
      updates: [
        { date: '2024-01-14 06:45', note: 'No new pest activity detected' },
        { date: '2024-01-13 11:20', note: 'Treatment application completed' },
        { date: '2024-01-12 09:15', note: 'Pest infestation identified' },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Needs Attention':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Monitoring':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Updating Tasks</h1>
        <p className="text-gray-600">Tasks requiring updates and ongoing monitoring</p>
      </motion.div>

      <div className="grid gap-6">
        {updatingTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <ArrowPathIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.task}</h3>
                  <p className="text-sm text-gray-600">Tree ID: {task.treeId}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4" />
                <span>{task.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>Last updated: {task.lastUpdated}</span>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{task.description}</p>

            {/* Updates Timeline */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Updates:</h4>
              <div className="space-y-2">
                {task.updates.slice(0, 3).map((update, updateIndex) => (
                  <div key={updateIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{update.note}</p>
                      <p className="text-xs text-gray-500 mt-1">{update.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Requires immediate attention</span>
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                  Add Update
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                  Mark Resolved
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  View History
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
