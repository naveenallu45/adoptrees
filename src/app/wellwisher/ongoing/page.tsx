'use client';

import { motion } from 'framer-motion';
import { ArrowPathIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function OngoingPage() {
  const ongoingTasks = [
    {
      id: 1,
      treeId: 'TREE-004',
      location: 'Prospect Park, New York',
      task: 'Watering in progress',
      startedAt: '2024-01-14 09:00',
      estimatedDuration: '2 hours',
      progress: 65,
      description: 'Deep watering session for mature oak tree. Currently 65% complete.',
    },
    {
      id: 2,
      treeId: 'TREE-005',
      location: 'High Line, New York',
      task: 'Soil analysis',
      startedAt: '2024-01-14 10:30',
      estimatedDuration: '1.5 hours',
      progress: 40,
      description: 'Comprehensive soil testing and analysis for nutrient levels.',
    },
    {
      id: 3,
      treeId: 'TREE-006',
      location: 'Battery Park, New York',
      task: 'Pest inspection',
      startedAt: '2024-01-14 11:15',
      estimatedDuration: '3 hours',
      progress: 25,
      description: 'Thorough inspection for signs of pest infestation and disease.',
    },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ongoing Tasks</h1>
        <p className="text-gray-600">Tasks currently in progress</p>
      </motion.div>

      <div className="grid gap-6">
        {ongoingTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <ArrowPathIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.task}</h3>
                  <p className="text-sm text-gray-600">Tree ID: {task.treeId}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                In Progress
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4" />
                <span>{task.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>Started: {task.startedAt}</span>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{task.description}</p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className="bg-yellow-500 h-2 rounded-full"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Estimated duration: {task.estimatedDuration}
              </span>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                  Update Progress
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
