'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, MapPinIcon, CalendarIcon, GiftIcon, HeartIcon } from '@heroicons/react/24/outline';

interface WellwisherTask {
  id: string;
  orderId: string;
  task: string;
  description: string;
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  location: string;
  orderDetails: {
    isGift: boolean;
    giftRecipientName?: string;
    giftRecipientEmail?: string;
    giftMessage?: string;
    totalAmount: number;
    items: Array<{
      treeName: string;
      quantity: number;
      price: number;
    }>;
  };
}

export default function UpcomingPage() {
  const [tasks, setTasks] = useState<WellwisherTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wellwisher/tasks?status=pending');
      const result = await response.json();
      
      if (result.success) {
        setTasks(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: string, orderId: string) => {
    try {
      const response = await fetch('/api/wellwisher/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          orderId,
          status: 'in_progress'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh tasks
        fetchTasks();
      } else {
        alert('Failed to start task: ' + result.error);
      }
    } catch (error) {
      console.error('Error starting task:', error);
      alert('Failed to start task. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
          <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
          <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
        <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
      </motion.div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming tasks</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don&apos;t have any pending tasks at the moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tasks.map((task, index) => (
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
                    <p className="text-sm text-gray-600">Task ID: {task.id}</p>
                    {task.orderDetails.isGift && (
                      <div className="flex items-center text-sm text-purple-600 mt-1">
                        <GiftIcon className="h-4 w-4 mr-1" />
                        <span>Gift for: {task.orderDetails.giftRecipientName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{task.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{task.description}</p>

              {task.orderDetails.isGift && task.orderDetails.giftMessage && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <HeartIcon className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-800">Gift Message</span>
                  </div>
                  <p className="text-sm text-purple-700 italic">&ldquo;{task.orderDetails.giftMessage}&rdquo;</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button 
                  onClick={() => handleStartTask(task.id, task.orderId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Start Task
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
