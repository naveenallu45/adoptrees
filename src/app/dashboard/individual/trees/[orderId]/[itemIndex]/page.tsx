'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  XMarkIcon,
  CheckCircleIcon,
  MapPinIcon,
  SparklesIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import PlantingLocationMap from '@/components/Dashboard/PlantingLocationMap';

interface OrderItem {
  treeId: string;
  treeName: string;
  treeImageUrl?: string;
  quantity: number;
  price: number;
  oxygenKgs: number;
  adoptionType: 'self' | 'gift';
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
}

interface WellwisherTask {
  taskId: string;
  task: string;
  description: string;
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  location: string;
  plantingDetails?: {
    plantedAt: string;
    plantingLocation?: {
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
}

interface Order {
  _id: string;
  orderId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'planted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  isGift: boolean;
  userName?: string;
  giftRecipientName?: string;
  giftRecipientEmail?: string;
  giftMessage?: string;
  assignedWellwisher?: string;
  wellwisherTasks?: WellwisherTask[];
  createdAt: string;
  updatedAt: string;
}

// Scientific names mapping (fallback)
const scientificNames: Record<string, string> = {
  'banana': 'Musa x paradisiaca',
  'mango': 'Mangifera indica',
  'neem': 'Azadirachta indica',
  'banyan': 'Ficus benghalensis',
  'peepal': 'Ficus religiosa',
  'coconut': 'Cocos nucifera',
  'teak': 'Tectona grandis',
  'sandalwood': 'Santalum album',
};

export default function TreeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const itemIndex = parseInt(params.itemIndex as string, 10);
  const publicId = searchParams.get('publicId');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [treeData, setTreeData] = useState<{
    oxygenKgs?: number;
    scientificSpecies?: string;
    co2?: number;
    foodSecurity?: number;
    economicDevelopment?: number;
    co2Absorption?: number;
    environmentalProtection?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string; index?: number } | null>(null);
  const [allImagesForModal, setAllImagesForModal] = useState<Array<{ url: string; caption?: string }>>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!selectedImage || allImagesForModal.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage.index === undefined) return;

      if (e.key === 'ArrowLeft' && selectedImage.index > 0) {
        e.preventDefault();
        const prevIndex = selectedImage.index - 1;
        setSelectedImage({ 
          url: allImagesForModal[prevIndex].url, 
          caption: allImagesForModal[prevIndex].caption,
          index: prevIndex
        });
      } else if (e.key === 'ArrowRight' && selectedImage.index < allImagesForModal.length - 1) {
        e.preventDefault();
        const nextIndex = selectedImage.index + 1;
        setSelectedImage({ 
          url: allImagesForModal[nextIndex].url, 
          caption: allImagesForModal[nextIndex].caption,
          index: nextIndex
        });
      } else if (e.key === 'Escape') {
        setSelectedImage(null);
        setAllImagesForModal([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, allImagesForModal]);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      
      let foundOrder: Order | null = null;
      
      if (publicId) {
        // Public access - use public API endpoint
        const response = await fetch(`/api/public/users/${publicId}/orders/${orderId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const order = result.data;
          if (order.items[itemIndex] && order.paymentStatus === 'paid') {
            foundOrder = order;
          }
        } else {
          setError(result.error || 'Tree not found');
          return;
        }
      } else {
        // Authenticated access - use regular API endpoint
        const response = await fetch('/api/orders');
        const result = await response.json();
        
        if (result.success) {
          const order = result.data.find((o: Order) => 
            (o.orderId === orderId || o._id === orderId) && 
            o.items[itemIndex] &&
            o.paymentStatus === 'paid'
          );
          
          if (order && order.items[itemIndex] && order.paymentStatus === 'paid') {
            foundOrder = order;
          }
        } else {
          setError(result.error);
          return;
        }
      }
      
      if (foundOrder && foundOrder.items[itemIndex] && foundOrder.paymentStatus === 'paid') {
        setOrder(foundOrder);
        
        // Fetch tree data using treeId
        const treeId = foundOrder.items[itemIndex].treeId;
        if (treeId) {
          try {
            const treeResponse = await fetch(`/api/trees/${treeId}`);
            const treeResult = await treeResponse.json();
            if (treeResult.success && treeResult.data) {
              setTreeData({
                oxygenKgs: treeResult.data.oxygenKgs,
                scientificSpecies: treeResult.data.scientificSpecies,
                co2: treeResult.data.co2,
                foodSecurity: treeResult.data.foodSecurity,
                economicDevelopment: treeResult.data.economicDevelopment,
                co2Absorption: treeResult.data.co2Absorption,
                environmentalProtection: treeResult.data.environmentalProtection,
              });
            }
          } catch (_err) {
            // If fetching tree fails, continue without tree data
            console.error('Failed to fetch tree data:', _err);
          }
        }
      } else {
        setError('Tree not found');
      }
    } catch (_error) {
      setError('Failed to fetch tree details');
    } finally {
      setLoading(false);
    }
  }, [orderId, itemIndex, publicId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Reset location dropdown when navigating to a different tree
  useEffect(() => {
    setShowLocationDropdown(false);
  }, [orderId, itemIndex]);

  const _handleDownloadCertificate = async (orderId: string) => {
    try {
      const response = await fetch(`/api/certificates/${orderId}`);
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to download certificate');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-100"></div>
        </div>
      </div>
    );
  }

  if (error || !order || !order.items[itemIndex]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-8">
        <div className="text-center">
          <p className="text-red-300">{error || 'Tree not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const item = order.items[itemIndex];
  const treeNameLower = item.treeName.toLowerCase();
  // Use tree data scientificSpecies if available, otherwise fallback to mapping
  const scientificName = treeData?.scientificSpecies || scientificNames[treeNameLower] || `${item.treeName} sp.`;
  
  // Calculate real-time oxygen and CO2 based on planting date
  const completedTask = order.wellwisherTasks?.find(task => 
    task.status === 'completed' && task.plantingDetails?.plantedAt
  );
  
  // Use EXACT same values as tree info page - match exactly what's displayed there
  // Tree info page shows: Oxygen = tree.oxygenKgs, CO2 = tree.co2 if available, otherwise calculateCO2(oxygenKgs)
  const baseOxygen = treeData?.oxygenKgs !== undefined ? treeData.oxygenKgs : item.oxygenKgs;
  
  // Same calculation as tree info page: calculateCO2 = oxygenKgs * 1.4 * 10 (10 years estimate)
  const calculateCO2 = (oxygenKgs: number): number => {
    return Math.round(oxygenKgs * 1.4 * 10); // 10 years estimate - same as tree info page
  };
  
  // CO2 calculation matches tree info page exactly
  const co2Absorbed = treeData?.co2 !== undefined ? Math.abs(treeData.co2) : calculateCO2(baseOxygen);
  
  // Display exact same values as tree info page (no age multipliers - show base values)
  const currentOxygen = baseOxygen;
  const currentCO2Absorption = co2Absorbed;
  
  // Collect all images from completed tasks
  const allImages: Array<{ url: string; caption?: string; type: 'planting' | 'growth'; date: string }> = [];
  
  order.wellwisherTasks?.forEach(task => {
    if (task.status === 'completed') {
      if (task.plantingDetails?.plantingImages) {
        task.plantingDetails.plantingImages.forEach(img => {
          allImages.push({
            url: img.url,
            caption: img.caption || `Planting - ${new Date(task.plantingDetails!.plantedAt).toLocaleDateString()}`,
            type: 'planting',
            date: task.plantingDetails!.plantedAt
          });
        });
      }
      
      if (task.growthUpdates) {
        task.growthUpdates.forEach(update => {
          update.images.forEach(img => {
            allImages.push({
              url: img.url,
              caption: img.caption || `Growth Update - Day ${update.daysSincePlanting} (${new Date(update.uploadedAt).toLocaleDateString()})`,
              type: 'growth',
              date: update.uploadedAt
            });
          });
        });
      }
    }
  });
  
  allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Back Button */}
        <button
          onClick={() => {
            if (publicId) {
              router.push(`/dashboard/individual/trees?publicId=${publicId}`);
            } else {
              router.back();
            }
          }}
          className="mb-6 inline-flex items-center bg-green-700 hover:bg-green-600 text-white border-2 border-green-600 px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md font-medium"
          type="button"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          <span>Back to Trees</span>
        </button>
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Left Side - Tree Photo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-center lg:justify-start"
          >
            <div className="relative w-full max-w-sm">
              <div className="bg-amber-50 rounded-2xl p-3 border-2 border-amber-200 shadow-xl">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-white">
                  {item.treeImageUrl ? (
                    <Image
                      src={item.treeImageUrl}
                      alt={item.treeName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                </div>
                {/* Tree ID */}
                <div className="mt-3 text-center">
                  <p className="text-green-800 font-semibold text-sm">
                    ID: {order.orderId ? order.orderId.slice(-8).toUpperCase() : order._id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Tree Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 flex flex-col justify-center"
          >
            {/* Header */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 drop-shadow-lg">
                {item.treeName}
              </h1>
              <p className="text-xl sm:text-2xl text-green-100 italic font-light mb-4">
                {scientificName}
              </p>
              
              {/* Tree Info Badges */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white font-medium text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>{currentOxygen.toFixed(2)} kg/year O₂</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white font-medium text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>-{currentCO2Absorption.toFixed(2)} kg/year CO₂</span>
                </div>
              </div>
              
              {/* Pill Tags */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="bg-green-800 rounded-full px-4 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-white text-sm font-medium">Photo</span>
                </div>
                <div className="bg-green-800 rounded-full px-4 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-white text-sm font-medium">Location</span>
                </div>
                <div className="bg-green-800 rounded-full px-4 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <span className="text-white text-sm font-medium">Weather</span>
                </div>
              </div>
            </div>

            {/* My Connections */}
            {order.userName && (
              <div>
                <h3 className="text-white font-semibold mb-3 text-lg">My connections</h3>
                <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200 shadow-lg">
                  <p className="text-green-800 font-semibold mb-2">Adopted by</p>
                  <div className="flex items-center">
                    <div className="bg-white rounded-xl p-3 mr-4 shadow-md">
                      <CheckCircleIcon className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <p className="text-green-800 font-bold text-lg">
                        {order.isGift && order.giftRecipientName 
                          ? order.giftRecipientName 
                          : order.userName || 'User'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Planting Location */}
            {completedTask?.plantingDetails?.plantingLocation?.coordinates && (
              <div>
                <h3 className="text-white font-semibold mb-3 text-lg">Planting Location</h3>
                <div className="bg-white rounded-2xl p-5 border-2 border-green-200 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-green-800 font-semibold">Tree Location</p>
                    <button
                      onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
                      type="button"
                    >
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <span>{showLocationDropdown ? 'Hide location' : 'View location'}</span>
                    </button>
                  </div>
                  {showLocationDropdown && (
                    <div className="mt-3">
                      <PlantingLocationMap
                        latitude={completedTask.plantingDetails.plantingLocation.coordinates[1]}
                        longitude={completedTask.plantingDetails.plantingLocation.coordinates[0]}
                        treeName={item.treeName}
                        className="w-full h-64 rounded-lg border border-green-200/50 shadow-sm"
                        showOpenInMaps={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Oxygen and CO2 Circles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {/* Oxygen Production */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 relative">
            {/* Icon - Top Right */}
            <div className="absolute top-6 right-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <SparklesIcon className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <div className="pr-24">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Oxygen Production</h3>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">{currentOxygen.toFixed(2)}</span>
                  <span className="text-lg text-gray-600 font-medium">kg/year</span>
                </div>
                <p className="text-sm text-gray-500">Annual production rate</p>
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                This tree produces <span className="font-semibold text-emerald-700">{currentOxygen.toFixed(2)} kg</span> of oxygen annually, equivalent to <span className="font-semibold text-emerald-700">{Math.round(currentOxygen * 2.2)}</span> people&apos;s annual oxygen needs, contributing to cleaner air and healthier environment.
              </p>
            </div>
          </div>

          {/* CO2 Absorption */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 relative">
            {/* Icon - Top Right */}
            <div className="absolute top-6 right-6">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                <CloudIcon className="h-8 w-8 text-cyan-600" />
              </div>
            </div>
            <div className="pr-24">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">CO₂ Absorption</h3>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">-{currentCO2Absorption.toFixed(2)}</span>
                  <span className="text-lg text-gray-600 font-medium">kg/year</span>
                </div>
                <p className="text-sm text-gray-500">Annual absorption rate</p>
              </div>
            </div>
            
            <div className="bg-cyan-50 rounded-xl p-5 border border-cyan-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                This tree absorbs <span className="font-semibold text-cyan-700">{currentCO2Absorption.toFixed(2)} kg</span> of CO₂ annually, offsetting emissions from <span className="font-semibold text-cyan-700">{Math.round(currentCO2Absorption / 4.6)}</span> cars per year, helping combat climate change and reduce carbon footprint.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Your Trees Gallery */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Your Trees Gallery</h2>
                <p className="text-gray-600 text-lg">
                  {allImages.length > 0 
                    ? `Photos uploaded by your wellwisher (${allImages.length} ${allImages.length === 1 ? 'photo' : 'photos'})`
                    : 'No photos uploaded yet. Your wellwisher will share updates here soon!'
                  }
                </p>
              </div>
            </div>
            
            {allImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allImages.map((img, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 group shadow-lg hover:shadow-2xl"
                    onClick={() => {
                      setAllImagesForModal(allImages);
                      setSelectedImage({ url: img.url, caption: img.caption, index: idx });
                    }}
                  >
                    <Image
                      src={img.url}
                      alt={img.caption || 'Tree photo'}
                      fill
                      className="object-cover group-hover:brightness-110 transition-all duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        {img.caption && (
                          <p className="text-white text-xs font-medium truncate">{img.caption}</p>
                        )}
                      </div>
                    </div>
                    {img.type === 'planting' && (
                      <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                        🌱 Planting
                      </div>
                    )}
                    {img.type === 'growth' && (
                      <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                        📸 Growth Update
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-dashed border-green-200">
                <p className="text-gray-600 text-lg font-medium">Gallery will appear here</p>
                <p className="text-gray-500 text-sm mt-2">Your wellwisher will upload photos of your tree&apos;s journey</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Tree Benefits */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">My Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Food Security */}
            {treeData?.foodSecurity !== undefined && (
              <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-24 h-24">
                    <svg className="transform -rotate-90 w-24 h-24">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-amber-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(treeData.foodSecurity / 10) * 251.2} 251.2`}
                        className="text-amber-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-amber-900">{treeData.foodSecurity * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-amber-900 mb-1.5">Food Security</h3>
                <p className="text-amber-800 text-sm">
                  The trees will bear fruits, some that will be edible immediately and others that can become edible through processing, ensuring food resources over time.
                </p>
              </div>
            )}

            {/* Economic Development */}
            {treeData?.economicDevelopment !== undefined && (
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-24 h-24">
                    <svg className="transform -rotate-90 w-24 h-24">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-orange-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(treeData.economicDevelopment / 10) * 251.2} 251.2`}
                        className="text-orange-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-orange-900">{treeData.economicDevelopment * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-orange-900 mb-1.5">Economic Development</h3>
                <p className="text-orange-800 text-sm">
                  The trees&apos; fruits and the products derived from their transformation can be traded in local networks, offering income opportunities.
                </p>
              </div>
            )}

            {/* CO₂ Absorption */}
            {treeData?.co2Absorption !== undefined && (
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-24 h-24">
                    <svg className="transform -rotate-90 w-24 h-24">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-yellow-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(treeData.co2Absorption / 10) * 251.2} 251.2`}
                        className="text-yellow-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-yellow-900">{treeData.co2Absorption * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-yellow-900 mb-1.5">CO₂ Absorption</h3>
                <p className="text-yellow-800 text-sm">
                  During its life cycle, each tree will absorb CO₂. The trees you plant can offset your emissions.
                </p>
              </div>
            )}

            {/* Environmental Protection */}
            {treeData?.environmentalProtection !== undefined && (
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-24 h-24">
                    <svg className="transform -rotate-90 w-24 h-24">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-green-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(treeData.environmentalProtection / 10) * 251.2} 251.2`}
                        className="text-green-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-green-900">{treeData.environmentalProtection * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-1.5">Environmental Protection</h3>
                <p className="text-green-800 text-sm">
                  The trees are planted in agroforestry systems that favor the virtuous interaction between the different species and their positive impact on the environment and on the land.
                </p>
              </div>
            )}
          </div>
          </div>
        </motion.section>
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImage && allImagesForModal.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedImage(null);
              setAllImagesForModal([]);
            }
          }}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => {
                setSelectedImage(null);
                setAllImagesForModal([]);
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
              type="button"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            
            {selectedImage.index !== undefined && selectedImage.index > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const prevIndex = selectedImage.index! - 1;
                  setSelectedImage({ 
                    url: allImagesForModal[prevIndex].url, 
                    caption: allImagesForModal[prevIndex].caption,
                    index: prevIndex
                  });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all z-10"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            {selectedImage.index !== undefined && selectedImage.index < allImagesForModal.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIndex = selectedImage.index! + 1;
                  setSelectedImage({ 
                    url: allImagesForModal[nextIndex].url, 
                    caption: allImagesForModal[nextIndex].caption,
                    index: nextIndex
                  });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all z-10"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            
            <div className="bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-full aspect-video bg-black">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.caption || 'Tree photo'}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedImage.index !== undefined && `${selectedImage.index + 1} of ${allImagesForModal.length}`}
                  </p>
                </div>
                {selectedImage.caption && (
                  <p className="text-sm text-gray-700">{selectedImage.caption}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

