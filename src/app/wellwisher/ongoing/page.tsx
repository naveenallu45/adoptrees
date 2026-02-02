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
  XMarkIcon,
  SparklesIcon,
  CameraIcon
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
import LocationPicker from '@/components/WellWisher/LocationPicker';

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
  const [uploading, setUploading] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [taskImages, setTaskImages] = useState<Record<string, File[]>>({});
  const [_previewUpdateTrigger, setPreviewUpdateTrigger] = useState(0);
  const previewUrlsRef = useRef<Record<string, string>>({});
  const [fastMode] = useState<boolean>(true);
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
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPickerTaskId, setLocationPickerTaskId] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState<Record<string, { latitude: number; longitude: number }>>({});

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) return;

    (navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then(res => {
        if (res && 'state' in res && res.state === 'denied') return;
        if (!navigator.geolocation) return;
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
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 1800000 }
        );
      })
      .catch(() => {}));
  }, [fastMode]);

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
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

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
        setTasks(prev => prev.map(t => 
          t.id === taskId ? taskToUpdate : t
        ));
        toast.error(result.error || 'Failed to update task status. Please try again.', {
          duration: 4000,
        });
      } else {
        if (newStatus === 'pending' || newStatus === 'completed') {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          toast.success(`Task moved to ${newStatus === 'pending' ? 'upcoming' : 'completed'} tasks`, {
            icon: '✅',
            duration: 2000,
          });
          fetchTasks();
        } else {
          toast.success(statusMessages[newStatus], {
            icon: '✅',
            duration: 2000,
          });
          fetchTasks();
        }
      }
    } catch (error) {
      toast.dismiss(toastId);
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

    const confirmed = window.confirm(
      `Are you sure you want to complete this planting task?\n\n` +
      `Task: ${task.task}\n` +
      `Images: ${images.length}\n\n` +
      `This will mark the task as completed.`
    );

    if (!confirmed) return;

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
              } catch (_e) {}
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
            } catch (_e) {}
            resolve({
              source: 'location_unavailable',
              timestamp: Date.now(),
            });
          })();
        }
      });
    };

    let progressToast: string | undefined;

    try {
      setUploading(task.id);
      
      progressToast = toast.loading('Getting location and uploading images...', {
        duration: 30000,
      });
      
      let location;
      let permissionState: string | undefined;
      
      if (manualLocation[task.id]) {
        location = {
          latitude: manualLocation[task.id].latitude,
          longitude: manualLocation[task.id].longitude,
          source: 'manual_selection',
          timestamp: Date.now()
        };
        toast.dismiss(progressToast);
        toast.loading('Uploading images...', { id: progressToast });
      } else {
        const now = Date.now();
        const recentMs = 2 * 60 * 1000;
        const canUsePrewarm = fastMode && 
          prewarmedLocation && 
          prewarmedLocation.timestamp && 
          (now - prewarmedLocation.timestamp) <= recentMs &&
          prewarmedLocation.latitude !== undefined &&
          prewarmedLocation.longitude !== undefined;

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
          location = { source: 'location_unavailable', timestamp: Date.now() };
        }
      }
      
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('orderId', task.orderId);
      formData.append('plantingNotes', '');
      
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
      }, 2, 2000);
      
      toast.dismiss(progressToast);
      
      if (result.success) {
        toast.success('Planting details uploaded successfully! 🎉', {
          icon: '✅',
          duration: 3000,
        });
        
        setTasks(prev => prev.filter(t => t.id !== task.id));
        fetchTasks();
        
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
        
        fetchTasks();
      } else {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ongoing Tasks</h1>
            <p className="text-gray-600">Tasks currently in progress</p>
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
              Ongoing Tasks
            </h1>
            <p className="text-lg text-gray-600">Upload planting details to complete your tasks</p>
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
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No ongoing tasks</h3>
          <p className="text-gray-600 text-lg">All tasks are either pending or completed</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task, index) => (
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
                      <ArrowPathIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{task.task}</h3>
                      <p className="text-sm text-gray-600 mb-2">Order: <span className="font-mono font-semibold">{task.orderId}</span></p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4" />
                          <span>{task.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="h-4 w-4" />
                          <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border-2 border-yellow-200 shadow-sm">
                    In Progress
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <p className="text-gray-700 leading-relaxed">{task.description}</p>
                </div>

                {/* Order Details Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
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
                  {task.orderDetails.isGift && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        🎁 Gift for: {task.orderDetails.giftRecipientName}
                      </p>
                      {task.orderDetails.giftMessage && (
                        <p className="text-sm text-green-800 italic">
                          &ldquo;{task.orderDetails.giftMessage}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Location Selection */}
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    📍 Planting Location
                  </label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {manualLocation[task.id] ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-semibold border-2 border-green-300 shadow-sm">
                        <MapPinIcon className="h-4 w-4" />
                        <span>Location Selected</span>
                        <button
                          onClick={() => {
                            setManualLocation(prev => {
                              const updated = { ...prev };
                              delete updated[task.id];
                              return updated;
                            });
                          }}
                          className="ml-2 text-green-700 hover:text-green-900 transition-colors"
                          type="button"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setLocationPickerTaskId(task.id);
                          setShowLocationPicker(true);
                        }}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        type="button"
                      >
                        <MapPinIcon className="h-4 w-4" />
                        <span>Select Location on Map</span>
                      </button>
                    )}
                    <p className="text-xs text-gray-600">
                      {manualLocation[task.id] 
                        ? 'Location will be used when completing planting'
                        : 'Optional: Select location manually or use device location automatically'}
                    </p>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      📸 Upload Planting Images
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
                            ? 'border-green-400 bg-green-50 hover:bg-green-100'
                            : 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 hover:border-green-400'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {taskImages[task.id] && taskImages[task.id].length > 0 ? (
                            <>
                              <CameraIcon className={`w-10 h-10 mb-2 ${uploading === task.id ? 'text-gray-400' : 'text-green-600'}`} />
                              <p className={`text-base font-semibold ${uploading === task.id ? 'text-gray-400' : 'text-green-700'}`}>
                                {taskImages[task.id].length}/5 images selected
                              </p>
                              <p className={`text-sm mt-1 ${uploading === task.id ? 'text-gray-400' : 'text-green-600'}`}>
                                Click to add more images
                              </p>
                            </>
                          ) : (
                            <>
                              <PhotoIcon className={`w-12 h-12 mb-3 ${uploading === task.id ? 'text-gray-400' : 'text-green-600'}`} />
                              <p className={`text-lg font-bold ${uploading === task.id ? 'text-gray-400' : 'text-green-700'}`}>
                                Click to upload or use camera
                              </p>
                              <p className={`text-sm mt-2 ${uploading === task.id ? 'text-gray-400' : 'text-green-600'}`}>
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
                          <p className="text-sm font-semibold text-green-700">
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
                                <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-green-400 transition-colors shadow-sm">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={previewUrl}
                                    alt={`Preview ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('Preview image failed to load:', urlKey);
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
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
                                  <XMarkIcon className="w-4 h-4" />
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

                  {/* Action Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleCompletePlanting(task)}
                      disabled={uploading === task.id || !taskImages[task.id] || taskImages[task.id].length === 0}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {uploading === task.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-5 w-5" />
                          <span>Complete Planting</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Please upload at least one image to complete this task
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => {
          setShowLocationPicker(false);
          setLocationPickerTaskId(null);
        }}
        onSelect={(latitude, longitude) => {
          if (locationPickerTaskId) {
            setManualLocation(prev => ({
              ...prev,
              [locationPickerTaskId]: { latitude, longitude }
            }));
          }
          setShowLocationPicker(false);
          setLocationPickerTaskId(null);
        }}
        initialLatitude={locationPickerTaskId && manualLocation[locationPickerTaskId]?.latitude ? manualLocation[locationPickerTaskId].latitude : undefined}
        initialLongitude={locationPickerTaskId && manualLocation[locationPickerTaskId]?.longitude ? manualLocation[locationPickerTaskId].longitude : undefined}
      />
    </div>
  );
}
