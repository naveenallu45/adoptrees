'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ClockIcon, 
  MapPinIcon, 
  CalendarIcon, 
  GiftIcon, 
  HeartIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  SparklesIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
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
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    if (!isOnline()) {
      toast.error('You are offline. Please check your internet connection.', {
        duration: 4000,
      });
      return;
    }

    setUpdatingTasks(prev => new Set(prev).add(taskId));
    
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
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
        setTasks(prev => prev.filter(t => t.id !== taskId));
        fetchTasks();
      } else {
        setTasks(prev => [...prev, taskToUpdate].sort((a, b) => 
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        ));
        toast.error(result.error || 'Failed to start task. Please try again.', {
          duration: 4000,
        });
      }
    } catch (error) {
      toast.dismiss(toastId);
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

  const getDaysUntil = (scheduledDate: string) => {
    const scheduled = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduled.setHours(0, 0, 0, 0);
    const diffTime = scheduled.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading upcoming tasks...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Tasks</h1>
            <p className="text-gray-600">Tasks scheduled for the upcoming days</p>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1 text-lg">Error Loading Tasks</h3>
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <SparklesIcon className="h-10 w-10 text-blue-600" />
              Upcoming Tasks
            </h1>
            <p className="text-lg text-gray-600">Tasks scheduled for the upcoming days - Start when ready</p>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh tasks"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-medium">Refresh</span>
          </button>
        </div>
      </motion.div>

      {tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <ClockIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No upcoming tasks</h3>
          <p className="text-gray-600 text-lg">You don&apos;t have any pending tasks at the moment.</p>
          <p className="text-sm text-gray-500 mt-2">New tasks will appear here when assigned to you.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task, index) => {
            const daysUntil = getDaysUntil(task.scheduledDate);
            const isToday = daysUntil === 0;
            const isTomorrow = daysUntil === 1;
            const isPastDate = daysUntil < 0;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Task Header */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <ClockIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{task.task}</h3>
                          {task.priority && task.priority !== 'low' && (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Order: <span className="font-mono font-semibold">{task.orderId}</span></p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{task.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="h-4 w-4" />
                            <span className={isPastDate ? 'text-orange-600 font-semibold' : isToday ? 'text-green-600 font-semibold' : ''}>
                              {isPastDate 
                                ? `Scheduled ${Math.abs(daysUntil)} day${Math.abs(daysUntil) > 1 ? 's' : ''} ago`
                                : isToday 
                                ? 'Scheduled Today'
                                : isTomorrow
                                ? 'Scheduled Tomorrow'
                                : `Scheduled in ${daysUntil} days`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border-2 border-blue-200 shadow-sm">
                      Scheduled
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <p className="text-gray-700 leading-relaxed">{task.description}</p>
                  </div>

                  {/* Scheduled Date Card */}
                  <div className={`rounded-xl p-4 border-2 ${
                    isPastDate 
                      ? 'bg-orange-50 border-orange-200' 
                      : isToday 
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Scheduled Date</h4>
                        <p className={`text-lg font-semibold ${
                          isPastDate 
                            ? 'text-orange-700' 
                            : isToday 
                            ? 'text-green-700'
                            : 'text-blue-700'
                        }`}>
                          {new Date(task.scheduledDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <CalendarIcon className={`h-8 w-8 ${
                        isPastDate 
                          ? 'text-orange-600' 
                          : isToday 
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`} />
                    </div>
                  </div>

                  {/* Order Details Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Trees to Plant
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.orderDetails.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <span className="font-medium text-gray-900">{item.treeName}</span>
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-semibold">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gift Information */}
                  {task.orderDetails.isGift && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <GiftIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-purple-900 mb-1 flex items-center gap-2">
                            <HeartIcon className="h-4 w-4" />
                            Gift Order
                          </h4>
                          <p className="text-sm font-semibold text-purple-800 mb-2">
                            For: {task.orderDetails.giftRecipientName}
                          </p>
                          {task.orderDetails.giftMessage && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-purple-200">
                              <p className="text-xs text-purple-700 italic">
                                &ldquo;{task.orderDetails.giftMessage}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleStartTask(task.id, task.orderId)}
                      disabled={updatingTasks.has(task.id)}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {updatingTasks.has(task.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-5 w-5" />
                          <span>Start Task</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Click to move this task to &quot;Ongoing Tasks&quot; and begin planting
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
