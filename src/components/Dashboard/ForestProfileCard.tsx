'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { 
  SparklesIcon as TreeIcon,
  CloudArrowUpIcon as CloudIcon,
  MapPinIcon as MapIcon,
  GlobeAltIcon,
  BoltIcon as ImpactIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

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

interface Order {
  _id: string;
  orderId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'planted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  isGift: boolean;
  createdAt: string;
  updatedAt: string;
  wellwisherTasks?: Array<{
    status: 'pending' | 'in_progress' | 'completed';
    location?: string;
    plantingDetails?: {
      plantedAt: string;
      plantingLocation?: {
        type: string;
        coordinates: [number, number];
      };
    };
  }>;
}

interface ForestStats {
  treesPlanted: number;
  co2Absorbed: number; // in tonnes
  lastPlanting: Date | null;
  forests: number;
  countries: number;
  impacts: number;
}

interface ForestProfileCardProps {
  userType: 'individual' | 'company';
  publicId?: string;
}

export default function ForestProfileCard({ userType, publicId }: ForestProfileCardProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ForestStats>({
    treesPlanted: 0,
    co2Absorbed: 0,
    lastPlanting: null,
    forests: 0,
    countries: 1, // Default to 1 for India
    impacts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [publicUserName, setPublicUserName] = useState<string | null>(null);
  const [publicUserImage, setPublicUserImage] = useState<string | null>(null);

  const calculateStats = useCallback((ordersData: Order[]) => {
    let totalTrees = 0;
    let totalOxygen = 0; // in kg
    let lastPlantingDate: Date | null = null;
    const uniqueLocations = new Set<string>();
    const uniqueCountries = new Set<string>();
    let completedOrdersCount = 0;

    ordersData.forEach((order) => {
      // Count trees from confirmed/paid orders (adopted trees)
      // Also count planted/completed orders
      const hasCompletedPlanting = order.wellwisherTasks?.some(
        task => task.status === 'completed' && task.plantingDetails?.plantedAt
      );
      
      // Include confirmed orders (adopted trees) and planted/completed orders
      const isAdoptedOrPlanted = order.paymentStatus === 'paid' && (
        order.status === 'confirmed' || 
        order.status === 'planted' || 
        order.status === 'completed' || 
        hasCompletedPlanting
      );

      if (isAdoptedOrPlanted) {
        // Only count as "completed" for impacts if actually planted
        const isActuallyPlanted = order.status === 'planted' || 
                                  order.status === 'completed' || 
                                  hasCompletedPlanting;
        
        if (isActuallyPlanted) {
          completedOrdersCount++;
        }
        
        order.items.forEach((item) => {
          totalTrees += item.quantity;
          // Only count oxygen/CO2 for actually planted trees
          if (isActuallyPlanted) {
            totalOxygen += item.oxygenKgs * item.quantity;
          }
        });

        // Find the latest planting date and collect location data
        if (order.wellwisherTasks) {
          order.wellwisherTasks.forEach((task) => {
            if (task.plantingDetails?.plantedAt) {
              const plantingDate = new Date(task.plantingDetails.plantedAt);
              if (!lastPlantingDate || plantingDate > lastPlantingDate) {
                lastPlantingDate = plantingDate;
              }

              // Collect unique locations
              if (task.location) {
                uniqueLocations.add(task.location);
              } else if (task.plantingDetails?.plantingLocation?.coordinates) {
                // Use coordinates as location identifier (rounded to ~1km precision)
                const [lng, lat] = task.plantingDetails.plantingLocation.coordinates;
                const locationKey = `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
                uniqueLocations.add(locationKey);
              }

              // For countries, we'll use a simple heuristic based on coordinates
              // India is roughly between 6.5°N to 35.5°N and 68°E to 97°E
              if (task.plantingDetails?.plantingLocation?.coordinates) {
                const [lng, lat] = task.plantingDetails.plantingLocation.coordinates;
                // Simple country detection based on coordinates
                if (lat >= 6.5 && lat <= 35.5 && lng >= 68 && lng <= 97) {
                  uniqueCountries.add('India');
                } else if (lat >= 24 && lat <= 36 && lng >= -125 && lng <= -66) {
                  uniqueCountries.add('USA');
                } else if (lat >= 35 && lat <= 72 && lng >= -10 && lng <= 40) {
                  uniqueCountries.add('Europe');
                } else {
                  // Default to a generic country identifier
                  uniqueCountries.add('Other');
                }
              }
            }
          });
        }
      }
    });

    // Convert oxygen to CO2 absorbed
    // Approximate conversion: 1 kg O2 produced ≈ 0.715 kg CO2 absorbed
    // Converting to tonnes (divide by 1000)
    const co2Absorbed = (totalOxygen * 0.715) / 1000;

    // Calculate forests (unique locations)
    const forestsCount = uniqueLocations.size > 0 ? uniqueLocations.size : 0;

    // Calculate countries (default to 1 for India if no location data)
    const countriesCount = uniqueCountries.size > 0 ? uniqueCountries.size : 1;

    // Calculate impacts (number of completed orders)
    const impactsCount = completedOrdersCount;

    setStats({
      treesPlanted: totalTrees,
      co2Absorbed: co2Absorbed,
      lastPlanting: lastPlantingDate,
      forests: forestsCount,
      countries: countriesCount,
      impacts: impactsCount,
    });
  }, []);

  useEffect(() => {
    const fetchUserOrders = async () => {
      try {
        setLoading(true);
        const endpoint = publicId ? `/api/public/users/${publicId}/orders` : '/api/orders';
        const response = await fetch(endpoint);
        const result = await response.json();
        
        if (result.success) {
          const ordersData = publicId ? result.data.orders : result.data;
          calculateStats(ordersData);
          
          // Store public user name and image if viewing public profile
          if (publicId && result.data?.user) {
            if (result.data.user.name) {
              setPublicUserName(result.data.user.name);
            }
            if (result.data.user.image) {
              setPublicUserImage(result.data.user.image);
            }
          }
        }
      } catch (_error) {
        console.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [calculateStats, publicId]);

  const getUserDisplayName = () => {
    // If viewing public profile, use the public user name
    if (publicId && publicUserName) {
      return publicUserName;
    }
    // Otherwise use session data
    if (!session?.user) return 'User';
    return session.user.name || (userType === 'company' ? 'Company' : 'Individual');
  };

  const getProfileImage = () => {
    // If viewing public profile, use the public user image
    if (publicId && publicUserImage) {
      console.log('ForestProfileCard: Using public user image:', publicUserImage);
      return publicUserImage;
    }
    // Otherwise use session image
    const sessionImage = session?.user?.image || null;
    console.log('ForestProfileCard: Session image:', sessionImage, 'Session user:', session?.user);
    return sessionImage;
  };

  // Debug: Log when session image changes
  useEffect(() => {
    console.log('ForestProfileCard: Session changed', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userName: session?.user?.name,
      userImage: session?.user?.image,
      publicId,
      publicUserImage
    });
  }, [session?.user?.image, session?.user?.id, publicId, publicUserImage]);

  const getForestName = () => {
    const name = getUserDisplayName();
    // Capitalize first letter dynamically
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getLastPlantingText = () => {
    if (!stats.lastPlanting) {
      return 'No plantings yet';
    }

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - stats.lastPlanting.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
      return `Last planting: ${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    } else if (diffMonths > 0) {
      return `Last planting: ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `Last planting: ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return 'Last planting: today';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg shadow-xl p-6 animate-pulse">
        <div className="h-32 bg-green-700 rounded mb-4"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg shadow-xl overflow-hidden w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-4 sm:p-5 md:p-6 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Profile Image - circular */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-green-300">
              {getProfileImage() ? (
                <Image
                  key={`profile-${getProfileImage()}-${session?.user?.id || publicId || 'default'}`}
                  src={getProfileImage() || ''}
                  alt={getUserDisplayName()}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 48px, (max-width: 768px) 56px, 64px"
                  unoptimized
                  priority
                />
              ) : (
                <span className="text-green-800 font-bold text-[10px] sm:text-xs text-center px-1 sm:px-2">
                  {getUserDisplayName()
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1">{getForestName()}</h2>
              <p className="text-green-200 text-xs sm:text-sm">{getLastPlantingText()}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 sm:mb-6 text-green-100 text-xs sm:text-sm leading-relaxed">
          <p>
            Every adoption contributes to environmental sustainability and helps restore our planet. 
            Together we are planting trees and making a positive impact on our environment.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-row overflow-x-auto gap-2 sm:gap-3 md:gap-4 sm:grid sm:grid-cols-3 md:grid-cols-5 mt-4 sm:mt-6 scrollbar-hide pb-2 sm:pb-0">
          {/* Trees Planted */}
          <div className="text-center flex-shrink-0 min-w-[70px] sm:min-w-0 px-1">
            <div className="flex justify-center mb-1 sm:mb-2">
              <TreeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-300" />
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">{stats.treesPlanted}</div>
            <div className="text-[10px] sm:text-xs text-green-200">Trees planted</div>
          </div>

          {/* CO2 Absorbed */}
          <div className="text-center flex-shrink-0 min-w-[70px] sm:min-w-0 px-1">
            <div className="flex justify-center mb-1 sm:mb-2">
              <CloudIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-300" />
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">
              {stats.co2Absorbed.toFixed(2)} t*
            </div>
            <div className="text-[10px] sm:text-xs text-green-200">CO₂ absorbed</div>
          </div>

          {/* Forests */}
          <div className="hidden sm:block text-center flex-shrink-0 min-w-[70px] sm:min-w-0 px-1">
            <div className="flex justify-center mb-1 sm:mb-2">
              <MapIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-300" />
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">{stats.forests}</div>
            <div className="text-[10px] sm:text-xs text-green-200">Forests</div>
          </div>

          {/* Countries */}
          <div className="text-center flex-shrink-0 min-w-[70px] sm:min-w-0 px-1">
            <div className="flex justify-center mb-1 sm:mb-2">
              <GlobeAltIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-300" />
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">{stats.countries}</div>
            <div className="text-[10px] sm:text-xs text-green-200">Countries</div>
          </div>

          {/* Impacts */}
          <div className="text-center flex-shrink-0 min-w-[70px] sm:min-w-0 px-1">
            <div className="flex justify-center mb-1 sm:mb-2">
              <ImpactIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-300" />
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">{stats.impacts}</div>
            <div className="text-[10px] sm:text-xs text-green-200">Impacts</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

