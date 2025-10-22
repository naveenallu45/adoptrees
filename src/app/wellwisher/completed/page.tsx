'use client';

import { motion } from 'framer-motion';
import { CheckCircleIcon, MapPinIcon, CalendarIcon, StarIcon } from '@heroicons/react/24/outline';

export default function CompletedPage() {
  const completedTasks = [
    {
      id: 1,
      treeId: 'TREE-007',
      location: 'Central Park, New York',
      task: 'Watering and fertilization',
      completedAt: '2024-01-13 16:30',
      duration: '2.5 hours',
      rating: 5,
      description: 'Successfully completed deep watering and organic fertilizer application.',
      notes: 'Tree showed excellent response to treatment. Soil moisture levels optimal.',
    },
    {
      id: 2,
      treeId: 'TREE-008',
      location: 'Riverside Park, New York',
      task: 'Pruning and shaping',
      completedAt: '2024-01-12 14:15',
      duration: '3 hours',
      rating: 4,
      description: 'Professional pruning to improve tree structure and health.',
      notes: 'Removed dead branches and improved overall tree shape.',
    },
    {
      id: 3,
      treeId: 'TREE-009',
      location: 'Brooklyn Bridge Park, New York',
      task: 'Pest control treatment',
      completedAt: '2024-01-11 11:45',
      duration: '1.5 hours',
      rating: 5,
      description: 'Applied eco-friendly pest control solution to affected areas.',
      notes: 'No adverse effects observed. Pest population significantly reduced.',
    },
    {
      id: 4,
      treeId: 'TREE-010',
      location: 'High Line, New York',
      task: 'Soil testing and analysis',
      completedAt: '2024-01-10 09:30',
      duration: '2 hours',
      rating: 4,
      description: 'Comprehensive soil analysis to determine nutrient requirements.',
      notes: 'Soil pH levels optimal. Minor nitrogen deficiency identified and addressed.',
    },
  ];

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Completed Tasks</h1>
        <p className="text-gray-600">Tasks that have been successfully completed</p>
      </motion.div>

      <div className="grid gap-6">
        {completedTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.task}</h3>
                  <p className="text-sm text-gray-600">Tree ID: {task.treeId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {getRatingStars(task.rating)}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Completed
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4" />
                <span>{task.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4" />
                <span>Completed: {task.completedAt}</span>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{task.description}</p>

            {task.notes && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes:</h4>
                <p className="text-sm text-gray-700">{task.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Duration: {task.duration}
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  View Report
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  Add Notes
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
