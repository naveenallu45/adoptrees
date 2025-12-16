'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  SparklesIcon,
  CloudIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import PlantingLocationMap from '@/components/Dashboard/PlantingLocationMap';
import TreeImageModal from '@/components/Dashboard/TreeImageModal';

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
  userId?: string;
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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      
      let foundOrder: Order | null = null;
      
      if (publicId) {
        // Public access - use public API endpoint
        // URL-encode publicId to handle special characters
        const encodedPublicId = encodeURIComponent(publicId);
        const response = await fetch(`/api/public/users/${encodedPublicId}/orders/${orderId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[TreeDetail] API error:', response.status, errorText);
          setError(`Failed to load tree details: ${response.status}`);
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          const order = result.data;
          if (order.items[itemIndex] && order.paymentStatus === 'paid') {
            foundOrder = order;
            // Set user image from API response if available
            if (result.user?.image) {
              setUserImage(result.user.image);
            }
            // Ensure order has userName for display (should be set by API, but fallback if missing)
            if (!order.userName && result.user?.name) {
              order.userName = result.user.name;
            }
          } else {
            setError('Tree item not found or order not paid');
            return;
          }
        } else {
          console.error('[TreeDetail] API returned error:', result.error);
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
        
        // Fetch user image (for authenticated access only, public access handled above)
        if (!publicId && foundOrder.userId) {
          // Authenticated access - use regular API endpoint
          try {
            const userResponse = await fetch(`/api/users/${foundOrder.userId}`);
            if (userResponse.ok) {
              const userResult = await userResponse.json();
              if (userResult.success && userResult.data?.image) {
                setUserImage(userResult.data.image);
              }
            }
          } catch (_err) {
            // Silently fail - will use initials
          }
        }
        
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


  const [downloadingCertificate, setDownloadingCertificate] = useState(false);

  const handleDownloadCertificate = async (orderId: string) => {
    if (downloadingCertificate) return; // Prevent multiple clicks
    
    setDownloadingCertificate(true);
    try {
      // Use public endpoint if publicId is present, otherwise use authenticated endpoint
      const endpoint = publicId 
        ? `/api/public/users/${publicId}/orders/${orderId}/certificate`
        : `/api/certificates/${orderId}`;
      
      const response = await fetch(endpoint);
      
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
    } finally {
      setDownloadingCertificate(false);
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
              router.push(`/dashboard/company/trees?publicId=${publicId}`);
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>{currentOxygen.toFixed(2)} kg/year O₂</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white font-medium text-sm">
                  <CloudIcon className="w-4 h-4" />
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
              </div>
            </div>

            {/* My Connections */}
            {order.userName && (
              <div>
                <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200 shadow-lg">
                  <p className="text-green-800 font-semibold mb-2">
                    {order.isGift && order.giftRecipientName ? 'Recipient Name *' : 'Adopted by'}
                  </p>
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

            {/* Download Certificate Button - Hidden for public users */}
            {!publicId && order.paymentStatus === 'paid' && order.orderId && (
              <div>
                <button
                  onClick={() => handleDownloadCertificate(order.orderId!)}
                  disabled={downloadingCertificate}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  type="button"
                >
                  {downloadingCertificate ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating Certificate...</span>
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      <span>Download Certificate</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Planting Location */}
            {completedTask?.plantingDetails?.plantingLocation?.coordinates && (
              <div>
                <h3 className="text-white font-semibold mb-3 text-lg">Planting Location</h3>
                <div className="bg-white rounded-2xl p-5 border-2 border-green-200 shadow-lg">
                  <p className="text-green-800 font-semibold mb-3">Tree Location</p>
                      <PlantingLocationMap
                        latitude={completedTask.plantingDetails.plantingLocation.coordinates[1]}
                        longitude={completedTask.plantingDetails.plantingLocation.coordinates[0]}
                        treeName={item.treeName}
                        userName={order.userName}
                        userImage={userImage}
                        className="w-full h-64 rounded-lg border border-green-200/50 shadow-sm"
                        showOpenInMaps={true}
                      />
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
          className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 mb-8 sm:mb-12"
        >
          {/* Oxygen Production */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 md:p-8 border border-gray-200 relative">
            {/* Icon - Top Right */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 text-emerald-600" />
              </div>
            </div>
            <div className="pr-8 sm:pr-16 md:pr-24">
              <h3 className="text-xs sm:text-base md:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 md:mb-4">Oxygen Production</h3>
              
              <div className="mb-2 sm:mb-4 md:mb-6">
                <div className="flex items-baseline gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{currentOxygen.toFixed(2)}</span>
                  <span className="text-xs sm:text-sm md:text-lg text-gray-600 font-medium">kg/year</span>
                </div>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">Annual production rate</p>
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-5 border border-emerald-100">
              <p className="text-[9px] sm:text-xs md:text-sm text-gray-700 leading-relaxed">
                This tree produces <span className="font-semibold text-emerald-700">{currentOxygen.toFixed(2)} kg</span> of oxygen annually, equivalent to <span className="font-semibold text-emerald-700">{Math.round(currentOxygen * 2.2)}</span> people&apos;s annual oxygen needs, contributing to cleaner air and healthier environment.
              </p>
            </div>
          </div>

          {/* CO2 Absorption */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 md:p-8 border border-gray-200 relative">
            {/* Icon - Top Right */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                <CloudIcon className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 text-cyan-600" />
              </div>
            </div>
            <div className="pr-8 sm:pr-16 md:pr-24">
              <h3 className="text-xs sm:text-base md:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 md:mb-4">CO₂ Absorption</h3>
              
              <div className="mb-2 sm:mb-4 md:mb-6">
                <div className="flex items-baseline gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">-{currentCO2Absorption.toFixed(2)}</span>
                  <span className="text-xs sm:text-sm md:text-lg text-gray-600 font-medium">kg/year</span>
                </div>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">Annual absorption rate</p>
              </div>
            </div>
            
            <div className="bg-cyan-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-5 border border-cyan-100">
              <p className="text-[9px] sm:text-xs md:text-sm text-gray-700 leading-relaxed">
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
                      setSelectedImageIndex(idx);
                    }}
                  >
                    <Image
                      src={img.url}
                      alt={img.caption || 'Tree photo'}
                      fill
                      className="object-cover group-hover:brightness-110 transition-all duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
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
          <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-100">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">My Benefits</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
            {/* Food Security */}
            {treeData?.foodSecurity !== undefined && (
              <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg">
                <div className="flex items-center justify-center mb-2 sm:mb-3">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 96 96" preserveAspectRatio="xMidYMid meet">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-amber-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${(treeData.foodSecurity / 10) * 251.2} 251.2`}
                        className="text-amber-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs md:text-base lg:text-xl font-bold text-amber-900">{treeData.foodSecurity * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs sm:text-sm md:text-base lg:text-xl font-bold text-amber-900 mb-1 sm:mb-1.5">Food Security</h3>
                <p className="text-amber-800 text-[9px] sm:text-xs md:text-sm">
                  The trees will bear fruits, some that will be edible immediately and others that can become edible through processing, ensuring food resources over time.
                </p>
              </div>
            )}

            {/* Economic Development */}
            {treeData?.economicDevelopment !== undefined && (
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg">
                <div className="flex items-center justify-center mb-2 sm:mb-3">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 96 96" preserveAspectRatio="xMidYMid meet">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-orange-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${(treeData.economicDevelopment / 10) * 251.2} 251.2`}
                        className="text-orange-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs md:text-base lg:text-xl font-bold text-orange-900">{treeData.economicDevelopment * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs sm:text-sm md:text-base lg:text-xl font-bold text-orange-900 mb-1 sm:mb-1.5">Economic Development</h3>
                <p className="text-orange-800 text-[9px] sm:text-xs md:text-sm">
                  The trees&apos; fruits and the products derived from their transformation can be traded in local networks, offering income opportunities.
                </p>
              </div>
            )}

            {/* CO₂ Absorption */}
            {treeData?.co2Absorption !== undefined && (
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg">
                <div className="flex items-center justify-center mb-2 sm:mb-3">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 96 96" preserveAspectRatio="xMidYMid meet">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-yellow-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${(treeData.co2Absorption / 10) * 251.2} 251.2`}
                        className="text-yellow-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs md:text-base lg:text-xl font-bold text-yellow-900">{treeData.co2Absorption * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs sm:text-sm md:text-base lg:text-xl font-bold text-yellow-900 mb-1 sm:mb-1.5">CO₂ Absorption</h3>
                <p className="text-yellow-800 text-[9px] sm:text-xs md:text-sm">
                  During its life cycle, each tree will absorb CO₂. The trees you plant can offset your emissions.
                </p>
              </div>
            )}

            {/* Environmental Protection */}
            {treeData?.environmentalProtection !== undefined && (
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg">
                <div className="flex items-center justify-center mb-2 sm:mb-3">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 96 96" preserveAspectRatio="xMidYMid meet">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-green-300"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${(treeData.environmentalProtection / 10) * 251.2} 251.2`}
                        className="text-green-800"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs md:text-base lg:text-xl font-bold text-green-900">{treeData.environmentalProtection * 10}%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs sm:text-sm md:text-base lg:text-xl font-bold text-green-900 mb-1 sm:mb-1.5">Environmental Protection</h3>
                <p className="text-green-800 text-[9px] sm:text-xs md:text-sm">
                  The trees are planted in agroforestry systems that favor the virtuous interaction between the different species and their positive impact on the environment and on the land.
                </p>
              </div>
            )}
          </div>
          </div>
        </motion.section>
      </div>

      {/* Image Modal */}
      <TreeImageModal
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        images={allImages}
        currentIndex={selectedImageIndex ?? 0}
        onNavigate={(index) => setSelectedImageIndex(index)}
      />

    </div>
  );
}


