'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

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

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wellwisher/tasks?status=completed');
      const result = await response.json();
      
      if (result.success) {
        setTasks(result.data);
      } else {
        setError(result.error);
      }
    } catch (_error) {
      setError('Failed to fetch completed tasks');
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Completed Tasks</h1>
        <p className="text-gray-600">Tasks that have been successfully completed with planting details</p>
      </motion.div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No completed tasks</h3>
          <p className="text-gray-600">Completed tasks will appear here once you finish planting</p>
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
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{task.task}</h3>
                    <p className="text-sm text-gray-600">Order ID: {task.orderId}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{task.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Completed: {task.plantingDetails?.completedAt ? new Date(task.plantingDetails.completedAt).toLocaleDateString() : 'N/A'}</span>
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

              {/* Planting Details */}
              {task.plantingDetails && (
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">Planting Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-800">Planted At:</span>
                      <p className="text-green-700">{new Date(task.plantingDetails.plantedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Location:</span>
                      <p className="text-green-700">
                        {task.plantingDetails.plantingLocation.coordinates[1].toFixed(6)}, {task.plantingDetails.plantingLocation.coordinates[0].toFixed(6)}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-green-800">Images:</span>
                      <p className="text-green-700">{task.plantingDetails.plantingImages.length} photo(s) uploaded</p>
                    </div>
                    {task.plantingDetails.plantingNotes && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-green-800">Notes:</span>
                        <p className="text-green-700 mt-1">{task.plantingDetails.plantingNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Priority: {task.priority}
                </div>
                <div className="flex space-x-3">
                  {task.plantingDetails?.plantingImages && task.plantingDetails.plantingImages.length > 0 && (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2">
                      <CameraIcon className="h-4 w-4" />
                      <span>View Photos</span>
                    </button>
                  )}
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                    View Details
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
