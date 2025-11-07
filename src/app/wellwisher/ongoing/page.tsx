'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowPathIcon, 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
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

export default function OngoingPage() {
  const [tasks, setTasks] = useState<WellwisherTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null); // Track which task is uploading
  const [taskImages, setTaskImages] = useState<Record<string, File[]>>({}); // Store images per task
  const previewUrlsRef = useRef<Record<string, string>>({}); // Store preview URLs for cleanup
  const [fastMode] = useState<boolean>(true); // Faster location with lower accuracy
  const [prewarmedLocation, setPrewarmedLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    timestamp?: number;
    source?: string;
  } | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Pre-warm a quick location fix on page load or when fast mode toggles
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) return;

    // Skip if permission is explicitly denied
    (navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then(res => {
        if (res && 'state' in res && res.state === 'denied') return;

        if (!navigator.geolocation) return;
        // Fast, low-power get; allow cached location
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPrewarmedLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude ?? null,
              altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ?? null,
              timestamp: pos.timestamp,
              source: 'prewarm'
            });
          },
          () => {
            // ignore prewarm errors
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 1800000 }
        );
      })
      .catch(() => {
        // ignore
      }));
  }, [fastMode]);

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
      const response = await fetch('/api/wellwisher/tasks?status=in_progress');
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

    // Clean up old preview URLs for this task
    const oldImages = taskImages[taskId];
    if (oldImages) {
      oldImages.forEach(() => {
        // URL was created when displaying, we'll clean it up properly in the component
      });
    }
    
    setTaskImages(prev => ({
      ...prev,
      [taskId]: files
    }));
  };

  const removeImage = (taskId: string, index: number) => {
    const images = taskImages[taskId];
    if (images && images[index]) {
      // Clean up the preview URL for this image
      const urlKey = `${taskId}-${index}`;
      if (previewUrlsRef.current[urlKey]) {
        URL.revokeObjectURL(previewUrlsRef.current[urlKey]);
        delete previewUrlsRef.current[urlKey];
      }
      
      // Remove the image from the array
      const newImages = images.filter((_, i) => i !== index);
      
      // Recreate preview URLs for remaining images with new indices
      // Clean up all URLs for this task
      Object.keys(previewUrlsRef.current).forEach(key => {
        if (key.startsWith(`${taskId}-`)) {
          URL.revokeObjectURL(previewUrlsRef.current[key]);
          delete previewUrlsRef.current[key];
        }
      });
      // Create new URLs for remaining images
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

  const handleCompletePlanting = async (task: WellwisherTask) => {
    const images = taskImages[task.id] || [];
    
    if (images.length === 0) {
      toast.error('Please upload at least one planting image');
      return;
    }

    // Get current device location using Google Geolocation API first, browser as fallback
    const getLocation = (): Promise<{ 
      latitude: number; 
      longitude: number; 
      accuracy?: number; 
      altitude?: number | null; 
      altitudeAccuracy?: number | null; 
      heading?: number | null; 
      speed?: number | null; 
      timestamp?: number; 
      source?: string;
    }> => {
      return new Promise((resolve) => {
        (async () => {
          try {
            const res = await fetch('/api/geolocation/google', { method: 'POST' });
            const data = await res.json();
            if (data?.success && typeof data?.data?.latitude === 'number' && typeof data?.data?.longitude === 'number') {
              return resolve({
                latitude: data.data.latitude,
                longitude: data.data.longitude,
                accuracy: data.data.accuracy,
                source: 'google_geolocation_api',
                timestamp: Date.now(),
              });
            }
          } catch (_e) {
            // No network/browser fallback right now
          }

          // Temporary bypass: allow submission without location
          return resolve({
            latitude: 0,
            longitude: 0,
            accuracy: undefined,
            source: 'bypass_no_location',
            timestamp: Date.now(),
          });
        })();
      });
    };

    try {
      setUploading(task.id);
      
      // Use prewarmed location if recent and fast mode is enabled
      const now = Date.now();
      const recentMs = 2 * 60 * 1000; // 2 minutes
      const canUsePrewarm = fastMode && prewarmedLocation && prewarmedLocation.timestamp && (now - prewarmedLocation.timestamp) <= recentMs;

      // Get current location automatically and capture permission state
      const permissionState = await (navigator.permissions?.query({ name: 'geolocation' as PermissionName })
        .then(res => (res && 'state' in res ? (res.state as 'granted'|'prompt'|'denied') : undefined))
        .catch(() => undefined));

      const location = canUsePrewarm ? prewarmedLocation! : await getLocation();
      
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('orderId', task.orderId);
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('plantingNotes', ''); // Empty notes
      if (typeof location.accuracy === 'number') formData.append('accuracy', String(location.accuracy));
      if (typeof location.altitude === 'number') formData.append('altitude', String(location.altitude));
      if (typeof location.altitudeAccuracy === 'number') formData.append('altitudeAccuracy', String(location.altitudeAccuracy));
      if (typeof location.heading === 'number') formData.append('heading', String(location.heading));
      if (typeof location.speed === 'number') formData.append('speed', String(location.speed));
      if (location.timestamp) formData.append('clientTimestamp', String(location.timestamp));
      if (location.source) formData.append('source', location.source);
      if (permissionState) formData.append('permissionState', permissionState);
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/wellwisher/planting', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Planting details uploaded successfully!');
        // Clean up preview URLs for this task
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
        fetchTasks(); // Refresh tasks
      } else {
        // Show detailed error message
        const errorMessage = result.error || 'Failed to upload planting details';
        const details = result.details ? ` - ${result.details.map((d: { message?: string }) => d.message || '').join(', ')}` : '';
        toast.error(`${errorMessage}${details}`);
        console.error('Planting upload error:', result);
      }
          } catch (error: unknown) {
            console.error('Planting upload exception:', error);
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
            
            if (errorMessage.includes('location') || errorMessage.includes('Location') || errorMessage.includes('Geolocation') || errorMessage.includes('permissions policy')) {
              // Format multi-line error messages for toast
              const formattedMessage = errorMessage.includes('\n') 
                ? errorMessage.split('\n')[0] + ' Check console for details.'
                : errorMessage;
              toast.error(formattedMessage || 'Unable to get location. Please enable location access in your browser settings.', {
                duration: 8000, // Longer duration for important messages
              });
              if (process.env.NODE_ENV !== 'production') {
                // Keep detailed logs only during development
                console.debug('Location error details:', errorMessage);
              }
            } else if (errorMessage === '[object Object]') {
              toast.error('Failed to get location. Please check your browser settings and try again.');
            } else {
              toast.error(`Failed to upload planting details: ${errorMessage}`);
            }
          } finally {
            setUploading(null);
          }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ongoing Tasks</h1>
        <p className="text-gray-600">Tasks currently in progress - Upload planting details to complete</p>
      </motion.div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <ArrowPathIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ongoing tasks</h3>
          <p className="text-gray-600">All tasks are either pending or completed</p>
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
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <ArrowPathIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{task.task}</h3>
                    <p className="text-sm text-gray-600">Order ID: {task.orderId}</p>
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
                  <span>Scheduled: {new Date(task.scheduledDate).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{task.description}</p>

              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Trees to Plant</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {task.orderDetails.items.map((item, idx) => (
                    <div key={idx}>
                      <span>{item.treeName} x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {task.orderDetails.isGift && (
                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Gift for:</strong> {task.orderDetails.giftRecipientName}
                    </p>
                    {task.orderDetails.giftMessage && (
                      <p className="text-sm text-green-700 mt-1">
                        &ldquo;{task.orderDetails.giftMessage}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Image Upload Section */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Planting Images (Max 5) - Use Camera
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => handleImageChange(task.id, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    disabled={uploading === task.id}
                  />
                  {taskImages[task.id] && taskImages[task.id].length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-green-600 mb-2">
                        {taskImages[task.id].length} image(s) selected
                      </p>
                      {/* Image Previews */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {taskImages[task.id].map((image, idx) => {
                          // Create or reuse preview URL
                          const urlKey = `${task.id}-${idx}`;
                          if (!previewUrlsRef.current[urlKey]) {
                            previewUrlsRef.current[urlKey] = URL.createObjectURL(image);
                          }
                          
                          return (
                          <div key={idx} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrlsRef.current[urlKey]}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => removeImage(task.id, idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              type="button"
                              disabled={uploading === task.id}
                              title="Remove image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <div className="flex justify-end">
                  <button
                    onClick={() => handleCompletePlanting(task)}
                    disabled={uploading === task.id || !taskImages[task.id] || taskImages[task.id].length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading === task.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Complete Planting</span>
                      </>
                    )}
                  </button>
              </div>
            </div>
          </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
