'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowPathIcon, 
  MapPinIcon, 
  ClockIcon, 
  CameraIcon, 
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
  const [selectedTask, setSelectedTask] = useState<WellwisherTask | null>(null);
  const [showPlantingModal, setShowPlantingModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [plantingForm, setPlantingForm] = useState({
    latitude: '',
    longitude: '',
    plantingNotes: '',
    images: [] as File[]
  });

  useEffect(() => {
    fetchTasks();
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
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handlePlantingSubmit = async () => {
    if (!selectedTask) return;

    if (!plantingForm.latitude || !plantingForm.longitude) {
      toast.error('Please provide GPS coordinates');
      return;
    }

    if (plantingForm.images.length === 0) {
      toast.error('Please upload at least one planting image');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('taskId', selectedTask.id);
      formData.append('orderId', selectedTask.orderId);
      formData.append('latitude', plantingForm.latitude);
      formData.append('longitude', plantingForm.longitude);
      formData.append('plantingNotes', plantingForm.plantingNotes);
      
      plantingForm.images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/wellwisher/planting', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Planting details uploaded successfully!');
        setShowPlantingModal(false);
        setPlantingForm({
          latitude: '',
          longitude: '',
          plantingNotes: '',
          images: []
        });
        fetchTasks(); // Refresh tasks
      } else {
        toast.error(result.error || 'Failed to upload planting details');
      }
    } catch (error) {
      console.error('Error uploading planting details:', error);
      toast.error('Failed to upload planting details');
    } finally {
      setUploading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPlantingForm(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          toast.success('Location detected!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get location. Please enter manually.');
        }
      );
    } else {
      toast.error('Geolocation not supported by this browser.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setPlantingForm(prev => ({ ...prev, images: files }));
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
                <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {task.orderDetails.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.treeName} x{item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1 font-medium">
                    Total: ₹{task.orderDetails.totalAmount}
                  </div>
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

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setShowPlantingModal(true);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <CameraIcon className="h-4 w-4" />
                  <span>Upload Planting Details</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Planting Details Modal */}
      {showPlantingModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Upload Planting Details</h2>
                <button
                  onClick={() => setShowPlantingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* GPS Coordinates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GPS Coordinates *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={plantingForm.latitude}
                        onChange={(e) => setPlantingForm(prev => ({ ...prev, latitude: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={plantingForm.longitude}
                        onChange={(e) => setPlantingForm(prev => ({ ...prev, longitude: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    onClick={getCurrentLocation}
                    className="mt-2 text-sm text-green-600 hover:text-green-700"
                  >
                    📍 Use Current Location
                  </button>
                </div>

                {/* Planting Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planting Images * (Max 5)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {plantingForm.images.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Selected {plantingForm.images.length} image(s)
                      </p>
                    </div>
                  )}
                </div>

                {/* Planting Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planting Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the planting process, soil condition, weather, etc."
                    value={plantingForm.plantingNotes}
                    onChange={(e) => setPlantingForm(prev => ({ ...prev, plantingNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowPlantingModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePlantingSubmit}
                    disabled={uploading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {uploading ? (
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
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
