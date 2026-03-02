'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon, MapPinIcon, CameraIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';

interface HockeyIndiaOrder {
  _id: string;
  orderId: string;
  userName: string;
  userEmail: string;
  items: Array<{
    treeName: string;
    quantity: number;
    treeId: string;
  }>;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  assignedWellwisher?: string;
  wellwisherTasks?: Array<{
    taskId: string;
    status: string;
    plantingDetails?: {
      plantingLocation?: {
        coordinates: [number, number];
      };
      plantingImages?: Array<{ url: string }>;
    };
  }>;
  plantingDetails?: {
    plantingLocation?: {
      coordinates: [number, number];
    };
    plantingImages?: Array<{ url: string }> | string[];
    plantingNotes?: string;
  };
}

async function fetchHockeyIndiaOrders(): Promise<HockeyIndiaOrder[]> {
  const response = await fetch('/api/admin/hockey-india/orders');
  if (!response.ok) {
    throw new Error('Failed to fetch Hockey India orders');
  }
  const data = await response.json();
  return data.success ? data.data : [];
}

export default function AdminHockeyIndiaPage() {
  const { data: orders = [], isLoading, refetch } = useQuery<HockeyIndiaOrder[]>({
    queryKey: ['admin', 'hockey-india', 'orders'],
    queryFn: fetchHockeyIndiaOrders,
    staleTime: 0,
    refetchOnMount: true,
  });

  const [selectedOrder, setSelectedOrder] = useState<HockeyIndiaOrder | null>(null);
  const [showPlantingForm, setShowPlantingForm] = useState(false);
  const [plantingData, setPlantingData] = useState({
    latitude: '',
    longitude: '',
    notes: '',
    images: [] as File[],
  });
  const [uploading, setUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setPlantingData(prev => ({ ...prev, images: validFiles }));
    
    // Create previews
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    setPlantingData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePlantTree = async (order: HockeyIndiaOrder) => {
    if (!plantingData.images.length) {
      toast.error('Please upload at least one planting image');
      return;
    }

    if (!plantingData.latitude || !plantingData.longitude) {
      toast.error('Please provide planting location coordinates');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('orderId', order._id);
      formData.append('latitude', plantingData.latitude);
      formData.append('longitude', plantingData.longitude);
      formData.append('notes', plantingData.notes);
      plantingData.images.forEach(image => {
        formData.append('images', image);
      });

      const response = await fetch('/api/admin/hockey-india/plant', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Planting failed:', {
          status: response.status,
          error: result.error,
          details: result.details,
        });
        throw new Error(result.error || 'Failed to plant trees');
      }

      toast.success('Planting request sent to wellwisher! 🎉');
      setShowPlantingForm(false);
      setSelectedOrder(null);
      setPlantingData({ latitude: '', longitude: '', notes: '', images: [] });
      setImagePreviews([]);
      refetch();
    } catch (error) {
      console.error('Error planting trees:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to plant trees');
    } finally {
      setUploading(false);
    }
  };

  const totalTrees = orders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  const plantedOrders = orders.filter(order => order.status === 'planted' || order.status === 'completed').length;

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrophyIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Hockey India</h1>
              <p className="text-gray-600 mt-1">Manage tree plantings for Hockey India orders</p>
            </div>
          </div>
          
          {/* Plant a Tree Quick Action */}
          <button
            onClick={() => {
              // Find first unpaid or pending order, or show order selection
              const availableOrder = orders.find(
                order => order.paymentStatus === 'paid' && 
                order.status !== 'planted' && 
                order.status !== 'completed'
              );
              
              if (availableOrder) {
                setSelectedOrder(availableOrder);
                setShowPlantingForm(true);
              } else if (orders.length > 0) {
                // Show first order if no unpaid/pending found
                setSelectedOrder(orders[0]);
                setShowPlantingForm(true);
              } else {
                toast.error('No orders available for planting');
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
          >
            <CameraIcon className="h-5 w-5" />
            Plant a Tree
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Trees</p>
            <p className="text-3xl font-bold text-green-600">{totalTrees}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Planted</p>
            <p className="text-3xl font-bold text-blue-600">{plantedOrders}</p>
          </div>
        </div>
      </motion.div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-gray-600">Hockey India orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">{order.userName}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {order.status}
                    </span>
                    {order.status === 'planted' || order.status === 'completed' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : null}
                    {order.assignedWellwisher && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        Wellwisher Assigned
                      </span>
                    )}
                    {order.wellwisherTasks && order.wellwisherTasks.length > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {order.wellwisherTasks.filter(t => t.status === 'completed').length}/{order.wellwisherTasks.length} Tasks
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Order ID: {order.orderId}</p>
                  <p className="text-sm text-gray-600 mb-3">{order.userEmail}</p>
                  
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Trees:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                          {item.quantity}x {item.treeName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {order.plantingDetails?.plantingLocation?.coordinates && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span>
                        Planted at: {order.plantingDetails.plantingLocation.coordinates[1].toFixed(6)}, {order.plantingDetails.plantingLocation.coordinates[0].toFixed(6)}
                      </span>
                    </div>
                  )}

                  {order.plantingDetails?.plantingNotes && (
                    <p className="text-sm text-gray-600 mb-2 italic">
                      Notes: {order.plantingDetails.plantingNotes}
                    </p>
                  )}

                  {order.plantingDetails?.plantingImages && Array.isArray(order.plantingDetails.plantingImages) && order.plantingDetails.plantingImages.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {order.plantingDetails.plantingImages.slice(0, 3).map((img: string | { url: string; publicId?: string }, idx: number) => {
                        const imgUrl = typeof img === 'string' ? img : img.url;
                        return (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            <Image src={imgUrl} alt={`Planting ${idx + 1}`} fill className="object-cover" />
                          </div>
                        );
                      })}
                      {order.plantingDetails.plantingImages.length > 3 && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-semibold">
                            +{order.plantingDetails.plantingImages.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {order.status !== 'planted' && order.status !== 'completed' && order.paymentStatus === 'paid' && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowPlantingForm(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <CameraIcon className="h-5 w-5" />
                    Plant Trees
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Planting Form Modal */}
      {showPlantingForm && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Plant Trees for {selectedOrder.userName}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Planting Location - Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={plantingData.latitude}
                    onChange={(e) => setPlantingData(prev => ({ ...prev, latitude: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 17.3850"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Planting Location - Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={plantingData.longitude}
                    onChange={(e) => setPlantingData(prev => ({ ...prev, longitude: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 78.4867"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Planting Notes (Optional)
                  </label>
                  <textarea
                    value={plantingData.notes}
                    onChange={(e) => setPlantingData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add any notes about the planting..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Planting Images (Required, Max 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <Image src={preview} alt={`Preview ${idx + 1}`} fill className="object-cover" />
                          </div>
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowPlantingForm(false);
                      setSelectedOrder(null);
                      setPlantingData({ latitude: '', longitude: '', notes: '', images: [] });
                      imagePreviews.forEach(url => URL.revokeObjectURL(url));
                      setImagePreviews([]);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePlantTree(selectedOrder)}
                    disabled={uploading || !plantingData.images.length || !plantingData.latitude || !plantingData.longitude}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Planting...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        Confirm Planting
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
