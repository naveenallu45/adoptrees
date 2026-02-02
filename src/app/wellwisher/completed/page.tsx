'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon,
  PhotoIcon,
  GlobeAltIcon
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
  plantingDetails?: {
    plantedAt: string;
    plantingLocation: {
      type: string;
      coordinates: [number, number];
    };
    plantingImages: Array<{
      url: string;
      publicId: string;
      caption?: string;
      uploadedAt: string;
    }>;
    plantingNotes?: string;
    completedAt: string;
  };
}

export default function CompletedPage() {
  const [tasks, setTasks] = useState<WellwisherTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch('/api/wellwisher/tasks?status=completed', {
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

  const getDaysSinceCompletion = (completedAt: string) => {
    const completed = new Date(completedAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    completed.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - completed.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading completed tasks...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Completed Tasks</h1>
            <p className="text-gray-600">Tasks that have been successfully completed</p>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
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
              <SparklesIcon className="h-10 w-10 text-green-600" />
              Completed Tasks
            </h1>
            <p className="text-lg text-gray-600">Tasks that have been successfully completed with planting details</p>
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No completed tasks</h3>
          <p className="text-gray-600 text-lg">Completed tasks will appear here once you finish planting</p>
          <p className="text-sm text-gray-500 mt-2">Start tasks from the &quot;Upcoming&quot; or &quot;Ongoing&quot; pages to begin</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task, index) => {
            const daysSince = task.plantingDetails?.completedAt 
              ? getDaysSinceCompletion(task.plantingDetails.completedAt)
              : null;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Task Header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{task.task}</h3>
                        <p className="text-sm text-gray-600 mb-2">Order: <span className="font-mono font-semibold">{task.orderId}</span></p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{task.location}</span>
                          </div>
                          {task.plantingDetails?.completedAt && (
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-4 w-4" />
                              <span>
                                Completed {daysSince === 0 
                                  ? 'today' 
                                  : daysSince === 1 
                                  ? 'yesterday'
                                  : `${daysSince} days ago`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800 border-2 border-green-200 shadow-sm">
                      ✓ Completed
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <p className="text-gray-700 leading-relaxed">{task.description}</p>
                  </div>

                  {/* Trees Planted Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Trees Planted
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.orderDetails.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <span className="font-medium text-gray-900">{item.treeName}</span>
                          <span className="text-sm text-gray-600 bg-green-100 px-2 py-0.5 rounded-full font-semibold text-green-800">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {task.orderDetails.isGift && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <p className="text-sm font-semibold text-purple-900 mb-1">
                          🎁 Gift for: {task.orderDetails.giftRecipientName}
                        </p>
                        {task.orderDetails.giftMessage && (
                          <p className="text-sm text-purple-800 italic">
                            &ldquo;{task.orderDetails.giftMessage}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Planting Details */}
                  {task.plantingDetails && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Planting Details
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-3 border border-green-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Planted At</p>
                            <p className="text-base font-bold text-green-700">
                              {new Date(task.plantingDetails.plantedAt).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-green-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Completed At</p>
                            <p className="text-base font-bold text-green-700">
                              {new Date(task.plantingDetails.completedAt).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Location */}
                        {task.plantingDetails.plantingLocation?.coordinates && (
                          <div className="bg-white rounded-lg p-3 border border-green-200 mb-4">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Planting Location</p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-mono text-gray-700">
                                {task.plantingDetails.plantingLocation.coordinates[1].toFixed(6)}, {task.plantingDetails.plantingLocation.coordinates[0].toFixed(6)}
                              </p>
                              <button
                                onClick={() => {
                                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                                  const lat = task.plantingDetails!.plantingLocation!.coordinates[1];
                                  const lng = task.plantingDetails!.plantingLocation!.coordinates[0];
                                  if (isIOS) {
                                    window.open(`https://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`, '_blank');
                                  } else {
                                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                                type="button"
                              >
                                <GlobeAltIcon className="h-4 w-4" />
                                <span>View on Map</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {task.plantingDetails.plantingNotes && (
                          <div className="bg-white rounded-lg p-3 border border-green-200 mb-4">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Notes</p>
                            <p className="text-sm text-gray-700 italic">{task.plantingDetails.plantingNotes}</p>
                          </div>
                        )}

                        {/* Images */}
                        {task.plantingDetails.plantingImages && task.plantingDetails.plantingImages.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                              <PhotoIcon className="h-4 w-4" />
                              Planting Images ({task.plantingDetails.plantingImages.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {task.plantingDetails.plantingImages.map((image, idx) => (
                                <div key={idx} className="relative group">
                                  <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-green-400 transition-colors shadow-sm cursor-pointer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={image.url}
                                      alt={image.caption || `Planting image ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onClick={() => window.open(image.url, '_blank')}
                                    />
                                  </div>
                                  {image.caption && (
                                    <p className="text-xs text-gray-600 mt-1 text-center truncate">{image.caption}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
