'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowPathIcon, 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  XMarkIcon
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
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set()); // Track tasks with status updates
  const [taskImages, setTaskImages] = useState<Record<string, File[]>>({}); // Store images per task
  const [_previewUpdateTrigger, setPreviewUpdateTrigger] = useState(0); // Force re-render when previews change
  const previewUrlsRef = useRef<Record<string, string>>({}); // Store preview URLs for cleanup
  const [fastMode] = useState<boolean>(true); // Faster location with lower accuracy
  const [prewarmedLocation, setPrewarmedLocation] = useState<{
    latitude?: number;
    longitude?: number;
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

  const fetchTasks = async (showRetryToast = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!isOnline()) {
        setError('You are offline. Please check your internet connection.');
        return;
      }

      const result = await retryWithBackoff(async () => {
        const response = await fetch('/api/wellwisher/tasks?status=in_progress', {
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

  const handleStatusChange = async (taskId: string, orderId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    if (!isOnline()) {
      toast.error('You are offline. Please check your internet connection.', {
        duration: 4000,
      });
      return;
    }

    setUpdatingStatus(prev => new Set(prev).add(taskId));

    // Optimistic update - update status immediately
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    // Show toast based on status
    const statusMessages = {
      pending: 'Task moved back to pending',
      in_progress: 'Task status updated to in progress',
      completed: 'Task marked as completed'
    };
    
    const toastId = toast.loading('Updating task status...', { duration: 3000 });

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
            status: newStatus
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      });
      
      toast.dismiss(toastId);
      
      if (!result.success) {
        // Rollback on error
        setTasks(prev => prev.map(t => 
          t.id === taskId ? taskToUpdate : t
        ));
        toast.error(result.error || 'Failed to update task status. Please try again.', {
          duration: 4000,
        });
      } else {
        // If moved to pending or completed, remove from ongoing list
        if (newStatus === 'pending' || newStatus === 'completed') {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          toast.success(`Task moved to ${newStatus === 'pending' ? 'upcoming' : 'completed'} tasks`, {
            icon: '✅',
            duration: 2000,
          });
        } else {
          toast.success(statusMessages[newStatus], {
            icon: '✅',
            duration: 2000,
          });
        }
      }
    } catch (error) {
      toast.dismiss(toastId);
      // Rollback on error
      setTasks(prev => prev.map(t => 
        t.id === taskId ? taskToUpdate : t
      ));
      const errorMessage = getNetworkErrorMessage(error);
      toast.error(errorMessage, {
        duration: 4000,
      });
    } finally {
      setUpdatingStatus(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleImageChange = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validate images
    const validation = validateWellWisherImages(files);
    
    if (!validation.valid) {
      validation.errors.forEach(error => {
        toast.error(error, { duration: 4000 });
      });
      // Reset input
      e.target.value = '';
      return;
    }

    // Show loading toast for compression
    const compressToast = toast.loading('Processing images...', { duration: 5000 });

    try {
      // Compress images if needed (in parallel)
      const compressedFiles = await Promise.all(
        validation.validFiles.map(file => compressImage(file, 2)) // Max 2MB per image
      );

      toast.dismiss(compressToast);

    // Clean up old preview URLs for this task
      Object.keys(previewUrlsRef.current).forEach(key => {
        if (key.startsWith(`${taskId}-`)) {
          URL.revokeObjectURL(previewUrlsRef.current[key]);
          delete previewUrlsRef.current[key];
        }
      });

      // Create preview URLs for new images
      compressedFiles.forEach((file, index) => {
        const urlKey = `${taskId}-${index}`;
        previewUrlsRef.current[urlKey] = URL.createObjectURL(file);
      });
    
      setTaskImages(prev => ({
        ...prev,
        [taskId]: compressedFiles
      }));
      
      // Force re-render to show previews
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
      
      // Force re-render to update previews
      setPreviewUpdateTrigger(prev => prev + 1);
    }
  };

  const handleCompletePlanting = async (task: WellwisherTask) => {
    const images = taskImages[task.id] || [];
    
    if (images.length === 0) {
      toast.error('Please upload at least one planting image', {
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

    // Show confirmation
    const confirmed = window.confirm(
      `Are you sure you want to complete this planting task?\n\n` +
      `Task: ${task.task}\n` +
      `Images: ${images.length}\n\n` +
      `This will mark the task as completed.`
    );

    if (!confirmed) return;

    // Get current device location using browser geolocation API, Google API as fallback
    // Location is optional - if all methods fail, submission can proceed without location
    const getLocation = (): Promise<{ 
      latitude?: number; 
      longitude?: number; 
      accuracy?: number; 
      altitude?: number | null; 
      altitudeAccuracy?: number | null; 
      heading?: number | null; 
      speed?: number | null; 
      timestamp?: number; 
      source?: string;
    }> => {
      return new Promise((resolve) => {
        // Try browser geolocation first (most accurate)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude ?? null,
                altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
                heading: position.coords.heading ?? null,
                speed: position.coords.speed ?? null,
                timestamp: position.timestamp,
                source: 'browser_geolocation'
              });
            },
            async () => {
              // Browser geolocation failed, try Google API
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
                // Google API also failed
              }
              // All location methods failed - allow submission without location
              resolve({
                source: 'location_unavailable',
                timestamp: Date.now(),
              });
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          // Browser geolocation not available, try Google API
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
              // Google API failed
            }
            // All location methods failed - allow submission without location
            resolve({
              source: 'location_unavailable',
              timestamp: Date.now(),
            });
          })();
        }
      });
    };

    // Declare progressToast outside try block so it's accessible in catch
    let progressToast: string | undefined;

    try {
      setUploading(task.id);
      
      // Show progress toast
      progressToast = toast.loading('Getting location and uploading images...', {
        duration: 30000,
      });
      
      // Use prewarmed location if recent and fast mode is enabled and has valid coordinates
      const now = Date.now();
      const recentMs = 2 * 60 * 1000; // 2 minutes
      const canUsePrewarm = fastMode && 
        prewarmedLocation && 
        prewarmedLocation.timestamp && 
        (now - prewarmedLocation.timestamp) <= recentMs &&
        prewarmedLocation.latitude !== undefined &&
        prewarmedLocation.longitude !== undefined;

      // Get current location automatically
      let location;
      let permissionState: string | undefined;
      try {
        permissionState = await (navigator.permissions?.query({ name: 'geolocation' as PermissionName })
        .then(res => (res && 'state' in res ? (res.state as 'granted'|'prompt'|'denied') : undefined))
        .catch(() => undefined));

        location = canUsePrewarm ? prewarmedLocation! : await getLocation();
        
        if (location.latitude && location.longitude) {
          toast.dismiss(progressToast);
          toast.loading('Uploading images...', { id: progressToast });
        }
      } catch (_locationError) {
        // Continue without location
        location = { source: 'location_unavailable', timestamp: Date.now() };
      }
      
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('orderId', task.orderId);
      formData.append('plantingNotes', ''); // Empty notes
      
      // Only add location data if available
      if (location.latitude !== undefined && location.longitude !== undefined) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
        if (typeof location.accuracy === 'number') formData.append('accuracy', String(location.accuracy));
        if (typeof location.altitude === 'number') formData.append('altitude', String(location.altitude));
        if (typeof location.altitudeAccuracy === 'number') formData.append('altitudeAccuracy', String(location.altitudeAccuracy));
        if (typeof location.heading === 'number') formData.append('heading', String(location.heading));
        if (typeof location.speed === 'number') formData.append('speed', String(location.speed));
        if (location.timestamp) formData.append('clientTimestamp', String(location.timestamp));
        if (location.source) formData.append('source', location.source);
        if (permissionState) formData.append('permissionState', permissionState);
      } else {
        // Log that location is not available but submission will proceed
        console.log('Location not available, proceeding without location data');
        if (location.source) formData.append('source', location.source);
      }
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const result = await retryWithBackoff(async () => {
      const response = await fetch('/api/wellwisher/planting', {
        method: 'POST',
        body: formData,
      });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }, 2, 2000); // 2 retries with 2s initial delay
      
      toast.dismiss(progressToast);
      
      if (result.success) {
        toast.success('Planting details uploaded successfully! 🎉', {
          icon: '✅',
          duration: 3000,
        });
        
        // Optimistically remove task from UI
        setTasks(prev => prev.filter(t => t.id !== task.id));
        
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
        
        // Refresh tasks in background
        fetchTasks();
      } else {
        // Show detailed error message
        const errorMessage = result.error || 'Failed to upload planting details';
        const details = result.details ? ` - ${result.details.map((d: { message?: string }) => d.message || '').join(', ')}` : '';
        toast.error(`${errorMessage}${details}`, {
          duration: 5000,
        });
        console.error('Planting upload error:', result);
      }
    } catch (_error: unknown) {
      if (progressToast) {
        toast.dismiss(progressToast);
      }
      const errorMessage = getNetworkErrorMessage(_error);
      toast.error(`Failed to upload: ${errorMessage}`, {
        duration: 5000,
      });
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

  if (error && !loading) {
    return (
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ongoing Tasks</h1>
            <p className="text-gray-600">Tasks currently in progress</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ongoing Tasks</h1>
        <p className="text-gray-600">Tasks currently in progress - Upload planting details to complete</p>
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
          <ArrowPathIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ongoing tasks</h3>
          <p className="text-gray-600">All tasks are either pending or completed</p>
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
                  <div className="p-1.5 bg-yellow-50 rounded-lg">
                    <ArrowPathIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{task.task}</h3>
                    <p className="text-xs text-gray-600">Order ID: {task.orderId}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  In Progress
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  <span>{task.location}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <ClockIcon className="h-3.5 w-3.5" />
                  <span>Scheduled: {new Date(task.scheduledDate).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{task.description}</p>

              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <h4 className="text-sm font-medium text-gray-900 mb-1.5">Trees to Plant</h4>
                <div className="space-y-0.5 text-xs text-gray-600">
                  {task.orderDetails.items.map((item, idx) => (
                    <div key={idx}>
                      <span>{item.treeName} x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {task.orderDetails.isGift && (
                  <div className="mt-1.5 p-1.5 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-green-800">
                      <strong>Gift for:</strong> {task.orderDetails.giftRecipientName}
                    </p>
                    {task.orderDetails.giftMessage && (
                      <p className="text-xs text-green-700 mt-0.5">
                        &ldquo;{task.orderDetails.giftMessage}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Switcher - Only show valid transitions */}
              <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Quick Status Change
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleStatusChange(task.id, task.orderId, 'completed')}
                    disabled={updatingStatus.has(task.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    title="Mark as completed (without uploading images)"
                  >
                    {updatingStatus.has(task.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-green-800"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-3 w-3" />
                        <span>Mark Complete</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Or upload images below to complete with planting details
                </p>
              </div>

              {/* Image Upload Section */}
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Upload Planting Images (Max 5)
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
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        uploading === task.id
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          : 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <PhotoIcon className={`w-8 h-8 mb-2 ${uploading === task.id ? 'text-gray-400' : 'text-green-600'}`} />
                        <p className={`text-sm font-medium ${uploading === task.id ? 'text-gray-400' : 'text-green-700'}`}>
                          {taskImages[task.id] && taskImages[task.id].length > 0
                            ? `Click to add more images (${taskImages[task.id].length}/5)`
                            : 'Click to upload or use camera'}
                        </p>
                        <p className={`text-xs mt-1 ${uploading === task.id ? 'text-gray-400' : 'text-green-600'}`}>
                          PNG, JPG, WEBP up to 5MB each
                        </p>
                      </div>
                    </label>
                  </div>

                  {taskImages[task.id] && taskImages[task.id].length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-green-600 font-semibold">
                        {taskImages[task.id].length} image(s) selected
                      </p>
                        <p className="text-xs text-gray-500">
                          Total: {formatFileSize(taskImages[task.id].reduce((sum, file) => sum + file.size, 0))}
                        </p>
                      </div>
                      {/* Image Previews */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {taskImages[task.id].map((image, idx) => {
                          // Create or reuse preview URL
                          const urlKey = `${task.id}-${idx}`;
                          if (!previewUrlsRef.current[urlKey]) {
                            previewUrlsRef.current[urlKey] = URL.createObjectURL(image);
                          }
                          const previewUrl = previewUrlsRef.current[urlKey];
                          
                          return (
                          <div key={idx} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-20 object-cover rounded-lg border-2 border-gray-200 group-hover:border-green-400 transition-colors"
                              onError={(e) => {
                                // Fallback if image fails to load
                                console.error('Preview image failed to load:', urlKey);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => removeImage(task.id, idx)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-20"
                              type="button"
                              disabled={uploading === task.id}
                              title="Remove image"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg">
                              {formatFileSize(image.size)}
                            </div>
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
                    className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading === task.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-3.5 w-3.5" />
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
