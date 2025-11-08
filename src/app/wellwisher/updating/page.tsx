'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowPathIcon, 
  MapPinIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CameraIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface WellwisherTask {
  id: string;
  orderId: string;
  task: string;
  description: string;
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  location: string;
  nextGrowthUpdateDue?: string;
  growthUpdates?: Array<{
    updateId: string;
    uploadedAt: string;
    images: Array<{
      url: string;
      publicId: string;
      caption?: string;
      uploadedAt: string;
    }>;
    notes?: string;
    daysSincePlanting: number;
  }>;
  plantingDetails?: {
    completedAt: string;
  };
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

export default function UpdatingPage() {
  const [tasks, setTasks] = useState<WellwisherTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [taskImages, setTaskImages] = useState<Record<string, File[]>>({});
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    fetchTasks();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    const currentUrls = previewUrlsRef.current;
    return () => {
      Object.values(currentUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wellwisher/tasks?needsGrowthUpdate=true');
      const result = await response.json();
      
      if (result.success) {
        setTasks(result.data);
      } else {
        setError(result.error);
      }
    } catch (_error) {
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    setTaskImages(prev => ({
      ...prev,
      [taskId]: files
    }));

    // Create preview URLs
    files.forEach((file, index) => {
      const urlKey = `${taskId}-${index}`;
      previewUrlsRef.current[urlKey] = URL.createObjectURL(file);
    });
  };

  const removeImage = (taskId: string, index: number) => {
    const images = taskImages[taskId];
    if (images && images[index]) {
      // Clean up preview URL
      const urlKey = `${taskId}-${index}`;
      if (previewUrlsRef.current[urlKey]) {
        URL.revokeObjectURL(previewUrlsRef.current[urlKey]);
        delete previewUrlsRef.current[urlKey];
      }
      
      // Remove image and recreate preview URLs
      const newImages = images.filter((_, i) => i !== index);
      Object.keys(previewUrlsRef.current).forEach(key => {
        if (key.startsWith(`${taskId}-`)) {
          URL.revokeObjectURL(previewUrlsRef.current[key]);
          delete previewUrlsRef.current[key];
        }
      });
      
      newImages.forEach((img, newIdx) => {
        const newKey = `${taskId}-${newIdx}`;
        previewUrlsRef.current[newKey] = URL.createObjectURL(img);
      });
      
      setTaskImages(prev => ({
        ...prev,
        [taskId]: newImages
      }));
    }
  };

  const handleUploadGrowthUpdate = async (task: WellwisherTask) => {
    const images = taskImages[task.id] || [];
    
    if (images.length === 0) {
      toast.error('Please upload at least one growth image');
      return;
    }

    try {
      setUploading(task.id);
      
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('orderId', task.orderId);
      formData.append('notes', taskNotes[task.id] || '');
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/wellwisher/growth-update', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Growth update uploaded successfully!');
        // Clean up preview URLs
        Object.keys(previewUrlsRef.current).forEach(key => {
          if (key.startsWith(`${task.id}-`)) {
            URL.revokeObjectURL(previewUrlsRef.current[key]);
            delete previewUrlsRef.current[key];
          }
        });
        setTaskImages(prev => {
          const updated = { ...prev };
          delete updated[task.id];
          return updated;
        });
        setTaskNotes(prev => {
          const updated = { ...prev };
          delete updated[task.id];
          return updated;
        });
        fetchTasks(); // Refresh tasks
      } else {
        toast.error(result.error || 'Failed to upload growth update');
      }
    } catch (error: unknown) {
      console.error('Growth update upload error:', error);
      toast.error('Failed to upload growth update. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const getDaysOverdue = (dueDate?: string) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusColor = (daysOverdue: number) => {
    if (daysOverdue > 7) return 'bg-red-100 text-red-800 border-red-200';
    if (daysOverdue > 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Growth Update Tasks</h1>
        <p className="text-gray-600">Upload growth images for completed tasks every 30 days</p>
      </motion.div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks need growth updates</h3>
          <p className="text-gray-600">All completed tasks are up to date</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task, index) => {
            const daysOverdue = getDaysOverdue(task.nextGrowthUpdateDue);
            const lastUpdate = task.growthUpdates && task.growthUpdates.length > 0 
              ? task.growthUpdates[task.growthUpdates.length - 1]
              : null;

            return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-purple-50 rounded-lg">
                      <ArrowPathIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                      <h3 className="text-base font-semibold text-gray-900">{task.task}</h3>
                      <p className="text-xs text-gray-600">Order ID: {task.orderId}</p>
                      {task.plantingDetails?.completedAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Completed: {new Date(task.plantingDetails.completedAt).toLocaleDateString()}
                        </p>
                      )}
                </div>
              </div>
                  <div className="flex flex-col items-end space-y-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(daysOverdue)}`}>
                      {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Due today'}
                </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              </div>
            </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                    <MapPinIcon className="h-3.5 w-3.5" />
                <span>{task.location}</span>
              </div>
                  <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                    <ClockIcon className="h-3.5 w-3.5" />
                    <span>
                      Next update due: {task.nextGrowthUpdateDue 
                        ? new Date(task.nextGrowthUpdateDue).toLocaleDateString()
                        : 'N/A'}
                    </span>
              </div>
            </div>

                <p className="text-sm text-gray-700 mb-3">{task.description}</p>

                {/* Previous Growth Updates */}
                {lastUpdate && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-medium text-gray-900 mb-1.5">Last Growth Update</h4>
                    <div className="text-xs text-gray-600">
                      <p>Uploaded: {new Date(lastUpdate.uploadedAt).toLocaleDateString()}</p>
                      <p>Days since planting: {lastUpdate.daysSincePlanting}</p>
                      {lastUpdate.notes && (
                        <p className="mt-1.5 italic">&ldquo;{lastUpdate.notes}&rdquo;</p>
                      )}
                      {lastUpdate.images.length > 0 && (
                        <p className="mt-0.5">{lastUpdate.images.length} image(s) uploaded</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Image Upload Section */}
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Upload Growth Images (Max 5) - Use Camera
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => handleImageChange(task.id, e)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                      disabled={uploading === task.id}
                    />
                    {taskImages[task.id] && taskImages[task.id].length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-purple-600 mb-1.5">
                          {taskImages[task.id].length} image(s) selected
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {taskImages[task.id].map((image, idx) => {
                            const urlKey = `${task.id}-${idx}`;
                            return (
                              <div key={idx} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrlsRef.current[urlKey]}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-16 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => removeImage(task.id, idx)}
                              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              type="button"
                              disabled={uploading === task.id}
                              title="Remove image"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
              </div>
                      </div>
                    )}
            </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={taskNotes[task.id] || ''}
                      onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder="Add any notes about the growth progress..."
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                      rows={2}
                      maxLength={500}
                      disabled={uploading === task.id}
                    />
              </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleUploadGrowthUpdate(task)}
                      disabled={uploading === task.id || !taskImages[task.id] || taskImages[task.id].length === 0}
                      className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading === task.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <CameraIcon className="h-3.5 w-3.5" />
                          <span>Upload Growth Update</span>
                        </>
                      )}
                </button>
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
