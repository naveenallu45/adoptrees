'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

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
  const orderId = params.orderId as string;
  const itemIndex = parseInt(params.itemIndex as string, 10);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string; index?: number } | null>(null);
  const [allImagesForModal, setAllImagesForModal] = useState<Array<{ url: string; caption?: string }>>([]);
  const [wellwisherName, setWellwisherName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for real-time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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
      const response = await fetch('/api/orders');
      const result = await response.json();
      
      if (result.success) {
        const foundOrder = result.data.find((o: Order) => 
          (o.orderId === orderId || o._id === orderId) && 
          o.items[itemIndex]
        );
        
        if (foundOrder && foundOrder.items[itemIndex]) {
          setOrder(foundOrder);
          
          // Fetch wellwisher name if assigned
          if (foundOrder.assignedWellwisher) {
            try {
              const wellwisherResponse = await fetch(`/api/admin/users/${foundOrder.assignedWellwisher}`);
              const wellwisherResult = await wellwisherResponse.json();
              if (wellwisherResult.success && wellwisherResult.data) {
                setWellwisherName(wellwisherResult.data.name || wellwisherResult.data.email || 'Wellwisher');
              }
            } catch (_err) {
              // If fetching wellwisher fails, just use default
              setWellwisherName('Wellwisher');
            }
          }
        } else {
          setError('Tree not found');
        }
      } else {
        setError(result.error);
      }
    } catch (_error) {
      setError('Failed to fetch tree details');
    } finally {
      setLoading(false);
    }
  }, [orderId, itemIndex]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
  const scientificName = scientificNames[treeNameLower] || `${item.treeName} sp.`;
  
  // Calculate real-time oxygen and CO2 based on planting date
  const completedTask = order.wellwisherTasks?.find(task => 
    task.status === 'completed' && task.plantingDetails?.plantedAt
  );
  
  let currentOxygen = item.oxygenKgs;
  let currentCO2 = parseFloat((item.oxygenKgs * 0.7).toFixed(2));
  
  if (completedTask?.plantingDetails?.plantedAt) {
    const plantedDate = new Date(completedTask.plantingDetails.plantedAt);
    const daysSincePlanting = Math.floor((currentTime.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
    const yearsSincePlanting = daysSincePlanting / 365;
    
    // Trees start producing less oxygen when young and reach full capacity around 5-10 years
    // For real-time calculation: scale based on tree age
    // Young trees (0-2 years): 20-60% capacity
    // Mature trees (2-5 years): 60-100% capacity
    // Full capacity (5+ years): 100%
    let ageMultiplier = 1;
    if (yearsSincePlanting < 2) {
      ageMultiplier = 0.2 + (yearsSincePlanting / 2) * 0.4; // 20% to 60%
    } else if (yearsSincePlanting < 5) {
      ageMultiplier = 0.6 + ((yearsSincePlanting - 2) / 3) * 0.4; // 60% to 100%
    }
    
    // Current annual rate based on age
    currentOxygen = item.oxygenKgs * ageMultiplier;
    currentCO2 = parseFloat((currentOxygen * 0.7).toFixed(2));
  }
  
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
          type="button"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">Back to Trees</span>
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {/* Left Side - Tree Photo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-center lg:justify-start"
          >
            <div className="relative w-full max-w-xs">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-xl">
                {item.treeImageUrl ? (
                  <Image
                    src={item.treeImageUrl}
                    alt={item.treeName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-500">No Image</span>
                  </div>
                )}
              </div>
              {/* Adopted Name/ID */}
              <div className="mt-2.5 bg-green-800 text-white text-center py-2 px-4 rounded-lg">
                <span className="font-mono text-sm font-semibold">
                  {order.orderId ? order.orderId.slice(-8).toUpperCase() : order._id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Tree Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            {/* Header with Share Button */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1.5 drop-shadow-lg">
                  {item.treeName}
                </h1>
                <p className="text-xl sm:text-2xl text-green-100 italic font-light">
                  {scientificName}
                </p>
              </div>
              <button
                className="bg-green-700 hover:bg-green-600 text-white p-3 rounded-lg shadow-lg transition-colors"
                type="button"
                title="Share"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>

            {/* My Connections */}
            {order.assignedWellwisher && (
              <div className="bg-green-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-white font-semibold mb-2.5">My connections</h3>
                <div className="bg-green-900 rounded-lg p-3">
                  <p className="text-green-100 text-sm mb-1.5">Planted by</p>
                  <div className="flex items-center">
                    <div className="bg-white rounded-lg p-2 mr-3">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{wellwisherName || 'Wellwisher'}</p>
                    </div>
                  </div>
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
          className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10"
        >
          {/* Oxygen Production */}
          <div className="bg-amber-50 rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Oxygen Production</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="transform -rotate-90 w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-green-100"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Math.min((currentOxygen / 50) * 427.3, 427.3)} 427.3`}
                    className="text-green-600"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{currentOxygen.toFixed(2)}</span>
                  <span className="text-base text-gray-900 font-medium">kg/year</span>
                </div>
              </div>
            </div>
            <p className="text-center text-gray-900 mt-3 text-sm">
              This tree produces {currentOxygen.toFixed(2)} kg of oxygen annually, contributing to cleaner air.
            </p>
          </div>

          {/* CO2 Absorption */}
          <div className="bg-amber-50 rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">CO₂ Absorption</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="transform -rotate-90 w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-blue-100"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Math.min((currentCO2 / 35) * 427.3, 427.3)} 427.3`}
                    className="text-blue-600"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{currentCO2.toFixed(2)}</span>
                  <span className="text-base text-gray-900 font-medium">kg/year</span>
                </div>
              </div>
            </div>
            <p className="text-center text-gray-900 mt-3 text-sm">
              This tree absorbs {currentCO2.toFixed(2)} kg of CO₂ annually, helping combat climate change.
            </p>
          </div>
        </motion.div>

        {/* Tree Gallery */}
        {allImages.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-5">Tree Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group shadow-md"
                  onClick={() => {
                    setAllImagesForModal(allImages);
                    setSelectedImage({ url: img.url, caption: img.caption, index: idx });
                  }}
                >
                  <Image
                    src={img.url}
                    alt={img.caption || 'Tree photo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                  {img.type === 'planting' && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Planting
                    </div>
                  )}
                  {img.type === 'growth' && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      Growth
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Tree Benefits */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-5">My Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Food Security */}
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
                      strokeDasharray="251.2 251.2"
                      className="text-amber-800"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-900">100%</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-1.5">Food Security</h3>
              <p className="text-amber-800 text-sm">
                The trees will bear fruits, some that will be edible immediately and others that can become edible through processing, ensuring food resources over time.
              </p>
            </div>

            {/* Economic Development */}
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
                      strokeDasharray="200.96 251.2"
                      className="text-orange-800"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-orange-900">80%</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-orange-900 mb-1.5">Economic Development</h3>
              <p className="text-orange-800 text-sm">
                The trees&apos; fruits and the products derived from their transformation can be traded in local networks, offering income opportunities.
              </p>
            </div>

            {/* CO₂ Absorption */}
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
                      strokeDasharray="25.12 251.2"
                      className="text-yellow-800"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-yellow-900">10%</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-yellow-900 mb-1.5">CO₂ Absorption</h3>
              <p className="text-yellow-800 text-sm">
                During its life cycle, each tree will absorb CO₂. The trees you plant can offset your emissions.
              </p>
            </div>

            {/* Environmental Protection */}
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
                      strokeDasharray="25.12 251.2"
                      className="text-green-800"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-900">10%</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-green-900 mb-1.5">Environmental Protection</h3>
              <p className="text-green-800 text-sm">
                The trees are planted in agroforestry systems that favor the virtuous interaction between the different species and their positive impact on the environment and on the land.
              </p>
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

