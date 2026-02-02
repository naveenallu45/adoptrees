'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowPathIcon, 
  MapPinIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CameraIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { 
  validateWellWisherImages, 
  formatFileSize, 
  isOnline, 
  getNetworkErrorMessage, 
  retryWithBackoff,
  compressImage 
} from '@/lib/utils/wellwisher';

interface WellwisherTask {
  id: string;
  orderId: string;
  task: string;
  description: string;
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'updating';
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
  const [_previewUpdateTrigger, setPreviewUpdateTrigger] = useState(0);
  const previewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    const currentUrls = previewUrlsRef.current;
    return () => {
      Object.values(currentUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
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
        const response = await fetch('/api/wellwisher/tasks?needsGrowthUpdate=true', {
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

  const handleImageChange = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    const validation = validateWellWisherImages(files);
    
    if (!validation.valid) {
      validation.errors.forEach(error => {
        toast.error(error, { duration: 4000 });
      });
      e.target.value = '';
      return;
    }
    
    const compressToast = toast.loading('Processing images...', { duration: 5000 });

    try {
      const compressedFiles = await Promise.all(
        validation.validFiles.map(file => compressImage(file, 2))
      );

      toast.dismiss(compressToast);

      Object.keys(previewUrlsRef.current).forEach(key => {
        if (key.startsWith(`${taskId}-`)) {
          URL.revokeObjectURL(previewUrlsRef.current[key]);
          delete previewUrlsRef.current[key];
        }
      });

      compressedFiles.forEach((file, index) => {
        const urlKey = `${taskId}-${index}`;
        previewUrlsRef.current[urlKey] = URL.createObjectURL(file);
      });
      
      setTaskImages(prev => ({
        ...prev,
        [taskId]: compressedFiles
      }));
      
      setPreviewUpdateTrigger(prev => prev + 1);

      const totalSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      toast.success(
        `${compressedFiles.length} image(s) ready (${formatFileSize(totalSize)})`,
        { duration: 2000 }
      );
    } catch (_error) {
      toast.dismiss(compressToast);
      toast.error('Failed to process images. Please try again.', { duration: 4000 });
      e.target.value = '';
    }
  };

  const removeImage = (taskId: string, index: number) => {
    const images = taskImages[taskId];
    if (images && images[index]) {
      const urlKey = `${taskId}-${index}`;
      if (previewUrlsRef.current[urlKey]) {
        URL.revokeObjectURL(previewUrlsRef.current[urlKey]);
        delete previewUrlsRef.current[urlKey];
      }
      
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
      
      setPreviewUpdateTrigger(prev => prev + 1);
    }
  };

  const handleUploadGrowthUpdate = async (task: WellwisherTask) => {
    const images = taskImages[task.id] || [];
    
    if (images.length === 0) {
      toast.error('Please upload at least one growth image', {
        duration: 4000,
        icon: '📷',
      });
      return;
    }

    if (!isOnline()) {
      toast.error('You are offline. Please check your internet connection.', {
        duration: 4000,
      });
      return;
    }

    try {
      setUploading(task.id);
      
      const progressToast = toast.loading('Uploading growth update...', {
        duration: 30000,
      });
      
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('orderId', task.orderId);
      formData.append('notes', taskNotes[task.id] || '');
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const result = await retryWithBackoff(async () => {
      const response = await fetch('/api/wellwisher/growth-update', {
        method: 'POST',
        body: formData,
      });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }, 2, 2000);
      
      toast.dismiss(progressToast);
      
      if (result.success) {
        toast.success('Growth update uploaded successfully! 🌱', {
          icon: '✅',
          duration: 3000,
        });
        
        setTasks(prev => prev.filter(t => t.id !== task.id));
        
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
        
        fetchTasks();
      } else {
        toast.error(result.error || 'Failed to upload growth update', {
          duration: 5000,
        });
      }
    } catch (_error: unknown) {
      const errorMessage = getNetworkErrorMessage(_error);
      toast.error(`Failed to upload: ${errorMessage}`, {
        duration: 5000,
      });
    } finally {
      setUploading(null);
    }
  };

  const getDaysPastDue = (dueDate?: string) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusColor = (daysPastDue: number) => {
    if (daysPastDue > 7) return 'bg-red-100 text-red-800 border-red-300';
    if (daysPastDue > 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading growth update tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Growth Update Tasks</h1>
            <p className="text-gray-600">Upload growth images for completed tasks</p>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
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
              <SparklesIcon className="h-10 w-10 text-purple-600" />
              Growth Update Tasks
            </h1>
            <p className="text-lg text-gray-600">Upload growth images for completed tasks every 30 days</p>
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-6">
            <CheckCircleIcon className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No tasks need growth updates</h3>
          <p className="text-gray-600 text-lg">All completed tasks are up to date</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task, index) => {
            const daysPastDue = getDaysPastDue(task.nextGrowthUpdateDue);
            const lastUpdate = task.growthUpdates && task.growthUpdates.length > 0 
              ? task.growthUpdates[task.growthUpdates.length - 1]
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
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <ArrowPathIcon className="h-6 w-6 text-purple-600" />
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
                              <ClockIcon className="h-4 w-4" />
                              <span>Completed: {new Date(task.plantingDetails.completedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 shadow-sm ${getStatusColor(daysPastDue)}`}>
                      {daysPastDue > 0 ? `Update due ${daysPastDue} day${daysPastDue > 1 ? 's' : ''} ago` : 'Due today'}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <p className="text-gray-700 leading-relaxed">{task.description}</p>
                  </div>

                  {/* Due Date Info */}
                  {task.nextGrowthUpdateDue && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">Next Update Due</h4>
                          <p className="text-lg font-semibold text-purple-700">
                            {new Date(task.nextGrowthUpdateDue).toLocaleDateString()}
                          </p>
                        </div>
                        <ClockIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  )}

                  {/* Previous Growth Updates */}
                  {lastUpdate && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Last Growth Update
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Uploaded:</p>
                          <p className="font-semibold text-gray-900">{new Date(lastUpdate.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Days since planting:</p>
                          <p className="font-semibold text-gray-900">{lastUpdate.daysSincePlanting} days</p>
                        </div>
                        {lastUpdate.notes && (
                          <div className="sm:col-span-2">
                            <p className="text-gray-600 mb-1">Notes:</p>
                            <p className="font-medium text-gray-900 italic">&ldquo;{lastUpdate.notes}&rdquo;</p>
                          </div>
                        )}
                        {lastUpdate.images.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-gray-600 mb-1">Images uploaded:</p>
                            <p className="font-semibold text-gray-900">{lastUpdate.images.length} image(s)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image Upload Section */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-3">
                        📸 Upload Growth Images
                        <span className="text-xs font-normal text-gray-500 ml-2">(Max 5 images, up to 5MB each)</span>
                      </label>
                      
                      {/* Custom File Input */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={(e) => handleImageChange(task.id, e)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={uploading === task.id}
                          id={`file-input-${task.id}`}
                        />
                        <label
                          htmlFor={`file-input-${task.id}`}
                          className={`flex flex-col items-center justify-center w-full h-40 border-3 border-dashed rounded-xl cursor-pointer transition-all ${
                            uploading === task.id
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                              : taskImages[task.id] && taskImages[task.id].length > 0
                              ? 'border-purple-400 bg-purple-50 hover:bg-purple-100'
                              : 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 hover:border-purple-400'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {taskImages[task.id] && taskImages[task.id].length > 0 ? (
                              <>
                                <CameraIcon className={`w-10 h-10 mb-2 ${uploading === task.id ? 'text-gray-400' : 'text-purple-600'}`} />
                                <p className={`text-base font-semibold ${uploading === task.id ? 'text-gray-400' : 'text-purple-700'}`}>
                                  {taskImages[task.id].length}/5 images selected
                                </p>
                                <p className={`text-sm mt-1 ${uploading === task.id ? 'text-gray-400' : 'text-purple-600'}`}>
                                  Click to add more images
                                </p>
                              </>
                            ) : (
                              <>
                                <CameraIcon className={`w-12 h-12 mb-3 ${uploading === task.id ? 'text-gray-400' : 'text-purple-600'}`} />
                                <p className={`text-lg font-bold ${uploading === task.id ? 'text-gray-400' : 'text-purple-700'}`}>
                                  Click to upload or use camera
                                </p>
                                <p className={`text-sm mt-2 ${uploading === task.id ? 'text-gray-400' : 'text-purple-600'}`}>
                                  PNG, JPG, WEBP up to 5MB each
                                </p>
                              </>
                            )}
                          </div>
                        </label>
                      </div>

                      {/* Image Previews */}
                      {taskImages[task.id] && taskImages[task.id].length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-purple-700">
                              {taskImages[task.id].length} image(s) ready
                            </p>
                            <p className="text-xs text-gray-500">
                              Total: {formatFileSize(taskImages[task.id].reduce((sum, file) => sum + file.size, 0))}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {taskImages[task.id].map((image, idx) => {
                              const urlKey = `${task.id}-${idx}`;
                              if (!previewUrlsRef.current[urlKey]) {
                                previewUrlsRef.current[urlKey] = URL.createObjectURL(image);
                              }
                              const previewUrl = previewUrlsRef.current[urlKey];
                              
                              return (
                                <div key={idx} className="relative group">
                                  <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-purple-400 transition-colors shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={previewUrl}
                                      alt={`Preview ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(_e) => {
                                        console.error('Preview image failed to load:', urlKey);
                                      }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeImage(task.id, idx)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all z-20 flex items-center justify-center"
                                    type="button"
                                    disabled={uploading === task.id}
                                    title="Remove image"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-1 rounded-b-xl">
                                    {formatFileSize(image.size)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        📝 Notes (Optional)
                      </label>
                      <textarea
                        value={taskNotes[task.id] || ''}
                        onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                        placeholder="Add any notes about the growth progress, health of the tree, weather conditions, etc..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all"
                        rows={3}
                        maxLength={500}
                        disabled={uploading === task.id}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {taskNotes[task.id]?.length || 0}/500 characters
                      </p>
                    </div>

                    {/* Upload Button */}
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleUploadGrowthUpdate(task)}
                        disabled={uploading === task.id || !taskImages[task.id] || taskImages[task.id].length === 0}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                      >
                        {uploading === task.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <CameraIcon className="h-5 w-5" />
                            <span>Upload Growth Update</span>
                          </>
                        )}
                      </button>
                    </div>
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
