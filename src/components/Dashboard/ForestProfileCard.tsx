'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
    plantingDetails?: {
      plantedAt: string;
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

  const calculateStats = useCallback((ordersData: Order[]) => {
    let totalTrees = 0;
    let totalOxygen = 0; // in kg
    let lastPlantingDate: Date | null = null;

    ordersData.forEach((order) => {
      // Count trees from completed/planted orders or orders with completed planting tasks
      const hasCompletedPlanting = order.wellwisherTasks?.some(
        task => task.status === 'completed' && task.plantingDetails?.plantedAt
      );
      
      const isPlanted = order.status === 'planted' || 
                       order.status === 'completed' || 
                       hasCompletedPlanting;

      if (isPlanted) {
        order.items.forEach((item) => {
          totalTrees += item.quantity;
          totalOxygen += item.oxygenKgs * item.quantity;
        });

        // Find the latest planting date
        if (order.wellwisherTasks) {
          order.wellwisherTasks.forEach((task) => {
            if (task.plantingDetails?.plantedAt) {
              const plantingDate = new Date(task.plantingDetails.plantedAt);
              if (!lastPlantingDate || plantingDate > lastPlantingDate) {
                lastPlantingDate = plantingDate;
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

    setStats({
      treesPlanted: totalTrees,
      co2Absorbed: co2Absorbed,
      lastPlanting: lastPlantingDate,
      forests: 0, // Can be calculated based on location clusters in future
      countries: 1, // Default to 1 for now
      impacts: 0, // Can be calculated based on impact metrics in future
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
          
          // Store public user name if viewing public profile
          if (publicId && result.data?.user?.name) {
            setPublicUserName(result.data.user.name);
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
      className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Logo placeholder - circular */}
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-800 font-bold text-xs text-center px-2">
                {getUserDisplayName()
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{getForestName()}</h2>
              <p className="text-green-200 text-sm">{getLastPlantingText()}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6 text-green-100 text-sm leading-relaxed">
          <p>
            Every adoption contributes to environmental sustainability and helps restore our planet. 
            Together we are planting trees and making a positive impact on our environment.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-row overflow-x-auto gap-3 sm:gap-4 sm:grid sm:grid-cols-3 md:grid-cols-5 mt-6 scrollbar-hide">
          {/* Trees Planted */}
          <div className="text-center flex-shrink-0 min-w-[80px] sm:min-w-0">
            <div className="flex justify-center mb-2">
              <TreeIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-1">{stats.treesPlanted}</div>
            <div className="text-xs text-green-200">Trees planted</div>
          </div>

          {/* CO2 Absorbed */}
          <div className="text-center flex-shrink-0 min-w-[80px] sm:min-w-0">
            <div className="flex justify-center mb-2">
              <CloudIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-1">
              {stats.co2Absorbed.toFixed(2)} t*
            </div>
            <div className="text-xs text-green-200">CO₂ absorbed</div>
          </div>

          {/* Forests */}
          <div className="text-center flex-shrink-0 min-w-[80px] sm:min-w-0">
            <div className="flex justify-center mb-2">
              <MapIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-1">{stats.forests}</div>
            <div className="text-xs text-green-200">Forests</div>
          </div>

          {/* Countries */}
          <div className="text-center flex-shrink-0 min-w-[80px] sm:min-w-0">
            <div className="flex justify-center mb-2">
              <GlobeAltIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-1">{stats.countries}</div>
            <div className="text-xs text-green-200">Countries</div>
          </div>

          {/* Impacts */}
          <div className="text-center flex-shrink-0 min-w-[80px] sm:min-w-0">
            <div className="flex justify-center mb-2">
              <ImpactIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-1">{stats.impacts}</div>
            <div className="text-xs text-green-200">Impacts</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

