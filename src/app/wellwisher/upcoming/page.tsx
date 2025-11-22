'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, MapPinIcon, CalendarIcon, GiftIcon, HeartIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { isOnline, getNetworkErrorMessage, retryWithBackoff } from '@/lib/utils/wellwisher';

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
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async (showRetryToast = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!isOnline()) {
        setError('You are offline. Please check your internet connection.');
        return;
      }

      const result = await retryWithBackoff(async () => {
        const response = await fetch('/api/wellwisher/tasks?status=pending', {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      });
      
      if (result.success) {
        setTasks(result.data || []);
        if (showRetryToast) {
          toast.success('Tasks refreshed successfully', { duration: 2000 });
        }
      } else {
        setError(result.error || 'Failed to fetch tasks');
        if (showRetryToast) {
          toast.error(result.error || 'Failed to refresh tasks');
        }
      }
    } catch (error) {
      const errorMessage = getNetworkErrorMessage(error);
      setError(errorMessage);
      if (showRetryToast) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: string, orderId: string) => {
    // Optimistic update - remove task immediately from UI
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    if (!isOnline()) {
      toast.error('You are offline. Please check your internet connection.', {
        duration: 4000,
      });
      return;
    }

    setUpdatingTasks(prev => new Set(prev).add(taskId));
    
    // Remove task from UI instantly
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Show success toast immediately
    const toastId = toast.loading('Starting task...', {
      duration: 3000,
    });

    try {
      const result = await retryWithBackoff(async () => {
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      });

      toast.dismiss(toastId);
      
      if (result.success) {
        toast.success('Task started! Moving to ongoing tasks...', {
          icon: '✅',
          duration: 2000,
        });
        // Remove task from upcoming list and refresh to ensure UI is up to date
        setTasks(prev => prev.filter(t => t.id !== taskId));
        fetchTasks();
      } else {
        // Rollback on error - add task back to list
        setTasks(prev => [...prev, taskToUpdate].sort((a, b) => 
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        ));
        toast.error(result.error || 'Failed to start task. Please try again.', {
          duration: 4000,
        });
      }
    } catch (error) {
      toast.dismiss(toastId);
      // Rollback on error - add task back to list
      setTasks(prev => [...prev, taskToUpdate].sort((a, b) => 
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      ));
      const errorMessage = getNetworkErrorMessage(error);
      toast.error(errorMessage, {
        duration: 4000,
      });
    } finally {
      setUpdatingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
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

  if (error && !loading) {
    return (
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
          <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">Error Loading Tasks</h3>
              <p className="text-red-700">{error}</p>
              {!isOnline() && (
                <p className="text-red-600 text-sm mt-2">
                  💡 Tip: Check your internet connection and try again.
                </p>
              )}
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
        className="mb-8 flex items-center justify-between"
      >
        <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
        <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
        </div>
        <button
          onClick={() => fetchTasks(true)}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh tasks"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
        <div className="grid gap-4">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{task.task}</h3>
                    <p className="text-xs text-gray-600">Task ID: {task.id}</p>
                    {task.orderDetails.isGift && (
                      <div className="flex items-center text-xs text-purple-600 mt-0.5">
                        <GiftIcon className="h-3 w-3 mr-1" />
                        <span>Gift for: {task.orderDetails.giftRecipientName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  <span>{task.location}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{task.description}</p>

              {task.orderDetails.isGift && task.orderDetails.giftMessage && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center mb-1.5">
                    <HeartIcon className="h-3.5 w-3.5 text-purple-600 mr-1.5" />
                    <span className="text-xs font-medium text-purple-800">Gift Message</span>
                  </div>
                  <p className="text-xs text-purple-700 italic">&ldquo;{task.orderDetails.giftMessage}&rdquo;</p>
                </div>
              )}

              <div className="flex space-x-2">
                <button 
                  onClick={() => handleStartTask(task.id, task.orderId)}
                  disabled={updatingTasks.has(task.id)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  {updatingTasks.has(task.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <span>Start Task</span>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
