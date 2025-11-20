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
  const [userImage, setUserImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date()); // For real-time updates
  const [ordersData, setOrdersData] = useState<Order[]>([]); // Store orders to check planting status

  const calculateStats = useCallback((ordersData: Order[]) => {
    // Reset stats
    let totalTrees = 0;
    let totalOxygen = 0; // in kg
    let lastPlantingDate: Date | null = null;
    const uniqueLocations = new Set<string>();
    const uniqueCountries = new Set<string>();
    let completedOrdersCount = 0;

    // Debug: Log calculation start
    console.log('[ForestProfileCard] Calculating stats from', ordersData.length, 'orders');

    // Filter to only include successfully paid orders (exclude pending and failed)
    const paidOrders = ordersData.filter(order => order.paymentStatus === 'paid');

    paidOrders.forEach((order) => {
      // Count trees from paid orders (adopted trees)
      // Also count planted/completed orders
      const hasCompletedPlanting = order.wellwisherTasks?.some(
        task => task.status === 'completed' && task.plantingDetails?.plantedAt
      );
      
      // Include confirmed/planted/completed orders
      const isAdoptedOrPlanted = order.status === 'confirmed' || 
        order.status === 'planted' || 
        order.status === 'completed' || 
        hasCompletedPlanting;

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
          // Count oxygen/CO2 for all adopted trees (not just planted ones)
          // This shows the potential CO2 absorption even before planting
          const itemOxygen = (item.oxygenKgs || 0) * item.quantity;
          totalOxygen += itemOxygen;
          
          // Debug: Log oxygen calculation
          if (itemOxygen > 0) {
            console.log('[ForestProfileCard] Item oxygen:', {
              treeName: item.treeName,
              quantity: item.quantity,
              oxygenKgs: item.oxygenKgs,
              totalOxygen: itemOxygen
            });
          }
        });

        // Find the latest date - use planting date if available, otherwise use order creation date
        // This shows "Last adoption" for newly adopted trees that haven't been planted yet
        const orderDate = new Date(order.createdAt);
        if (!lastPlantingDate || orderDate > lastPlantingDate) {
          lastPlantingDate = orderDate;
        }

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
    
    // Debug: Log CO2 calculation
    console.log('[ForestProfileCard] CO2 calculation:', {
      totalOxygen,
      co2Absorbed,
      totalTrees
    });

    // Calculate forests (unique locations)
    const forestsCount = uniqueLocations.size > 0 ? uniqueLocations.size : 0;

    // Calculate countries (default to 1 for India if no location data)
    const countriesCount = uniqueCountries.size > 0 ? uniqueCountries.size : 1;

    // Calculate impacts (number of completed orders)
    const impactsCount = completedOrdersCount;

    // Debug: Log calculated stats
    console.log('[ForestProfileCard] Calculated stats:', {
      treesPlanted: totalTrees,
      co2Absorbed: co2Absorbed,
      forests: forestsCount,
      countries: countriesCount,
      impacts: impactsCount,
      lastPlanting: lastPlantingDate
    });

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
        
        // Add cache-busting and ensure fresh data for each user
        const response = await fetch(endpoint, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        const result = await response.json();
        
        if (result.success) {
          const ordersData = publicId ? result.data.orders : result.data;
          
          // Debug: Log what we received
          console.log('[ForestProfileCard] Fetched orders for:', publicId || 'current user', 'Count:', ordersData.length);
          if (ordersData.length > 0) {
            console.log('[ForestProfileCard] Sample order userId:', ordersData[0].userId, 'userEmail:', ordersData[0].userEmail);
            console.log('[ForestProfileCard] Current session userId:', session?.user?.id, 'userEmail:', session?.user?.email);
          }
          
          setOrdersData(ordersData); // Store orders for checking planting status
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
        } else {
          console.error('[ForestProfileCard] Failed to fetch orders:', result.error);
        }
      } catch (_error) {
        console.error('[ForestProfileCard] Error fetching orders:', _error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserImage = async () => {
      // Fetch user image from database to ensure it's up-to-date
      // Only fetch if not viewing public profile
      if (!publicId && session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.image) {
              setUserImage(result.data.image);
            } else if (result.success) {
              // Clear image if user doesn't have one
              setUserImage(null);
            }
          }
        } catch (_error) {
          // Silently fail - will use session image or initials
        }
      }
    };

    fetchUserOrders();
    fetchUserImage();
  }, [calculateStats, publicId, session?.user?.id, session?.user?.email, session?.user?.name, session?.user?.image]);

  const getUserDisplayName = () => {
    // If viewing public profile, use the public user name
    if (publicId && publicUserName) {
      return publicUserName;
    }
    // Otherwise use session data (which should be updated after profile changes)
    if (!session?.user) return 'User';
    // Use name from session, which should be updated via updateSession
    return session.user.name || (userType === 'company' ? 'Company' : 'Individual');
  };

  const getProfileImage = () => {
    // Priority: public user image > fetched user image > session image
    if (publicId && publicUserImage) {
      return publicUserImage;
    }
    // Use fetched user image if available (more up-to-date than session)
    if (userImage) {
      return userImage;
    }
    // Fallback to session image
    return session?.user?.image || null;
  };

  // Update user image when session image changes
  useEffect(() => {
    if (session?.user?.image && !publicId) {
      setUserImage(session.user.image);
    }
  }, [session?.user?.image, publicId]);

  // Update current time for real-time "last planting" display
  useEffect(() => {
    // Update immediately on mount
    setCurrentTime(new Date());
    
    // Update every 30 seconds for more responsive real-time updates
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getForestName = () => {
    const name = getUserDisplayName();
    // Capitalize first letter dynamically
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getLastPlantingText = () => {
    if (!stats.lastPlanting) {
      return 'No adoptions yet';
    }

    // Use currentTime state for real-time updates
    const now = currentTime;
    const diffTime = Math.abs(now.getTime() - stats.lastPlanting.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    // Check if the lastPlanting date matches an actual planting date (plantedAt)
    // If not, it's from order creation date (adoption)
    const isActualPlanting = ordersData.some(order => 
      order.wellwisherTasks?.some(task => 
        task.plantingDetails?.plantedAt && 
        Math.abs(new Date(task.plantingDetails.plantedAt).getTime() - stats.lastPlanting!.getTime()) < 1000 // Within 1 second
      )
    );

    const prefix = isActualPlanting ? 'Last planting' : 'Last adoption';

    // Show more granular time for recent adoptions/plantings
    if (diffYears > 0) {
      return `${prefix}: ${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    } else if (diffMonths > 0) {
      return `${prefix}: ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${prefix}: ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${prefix}: ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${prefix}: ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return `${prefix}: just now`;
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

