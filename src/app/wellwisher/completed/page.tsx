'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon
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
                  <div className="p-1.5 bg-green-50 rounded-lg">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{task.task}</h3>
                    <p className="text-xs text-gray-600">Order ID: {task.orderId}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  <span>{task.location}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Completed: {task.plantingDetails?.completedAt ? new Date(task.plantingDetails.completedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{task.description}</p>

              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <h4 className="text-sm font-medium text-gray-900 mb-1.5">Trees Planted</h4>
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

              {/* Planting Details */}
              {task.plantingDetails && (
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-medium text-green-900 mb-1.5">Planting Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-green-800">Planted At:</span>
                      <p className="text-green-700">{new Date(task.plantingDetails.plantedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Location:</span>
                      <p className="text-green-700">
                        {task.plantingDetails.plantingLocation?.coordinates ? `${task.plantingDetails.plantingLocation.coordinates[1].toFixed(6)}, ${task.plantingDetails.plantingLocation.coordinates[0].toFixed(6)}` : 'Not available'}
                      </p>
                    </div>
                    {task.plantingDetails.plantingLocation?.coordinates && (
                      <div className="md:col-span-2">
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
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 transition-colors bg-green-100 px-2 py-1 rounded"
                          type="button"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Open in Maps</span>
                        </button>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <span className="font-medium text-green-800">Images:</span>
                      <p className="text-green-700">{task.plantingDetails.plantingImages.length} photo(s) uploaded</p>
                    </div>
                    {task.plantingDetails.plantingNotes && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-green-800">Notes:</span>
                        <p className="text-green-700 mt-0.5">{task.plantingDetails.plantingNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
