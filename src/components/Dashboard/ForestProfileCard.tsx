'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ShareIcon,
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
        }
      } catch (_error) {
        console.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [calculateStats, publicId]);

  // QR code state
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  useEffect(() => {
    const initQr = async () => {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        let id = publicId;
        if (!id) {
          const res = await fetch('/api/users/public-id');
          const data = await res.json();
          if (data?.success) id = data.data.publicId;
        }
        if (id) {
          const viewUrl = `${origin}/u/${id}`;
          const QRCode = (await import('qrcode')).default as any;
          const dataUrl = await QRCode.toDataURL(viewUrl, { width: 320, margin: 1 });
          setQrUrl(dataUrl);
        }
      } catch (_e) {
        // ignore
      }
    };
    initQr();
  }, [publicId]);

  const getUserDisplayName = () => {
    if (!session?.user) return 'User';
    return session.user.name || (userType === 'company' ? 'Company' : 'Individual');
  };

  const getForestName = () => {
    const name = getUserDisplayName();
    return `${name} Forest`;
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
          <button className="p-2 hover:bg-green-700 rounded-lg transition-colors" onClick={() => setQrVisible(true)}>
            <ShareIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-6 text-green-100 text-sm leading-relaxed">
          <p>
            Every adoption contributes to environmental sustainability and helps restore our planet. 
            Together we are planting trees and making a positive impact on our environment.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6">
          {/* Trees Planted */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <TreeIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.treesPlanted}</div>
            <div className="text-xs text-green-200">Trees planted</div>
          </div>

          {/* CO2 Absorbed */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <CloudIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {stats.co2Absorbed.toFixed(2)} t*
            </div>
            <div className="text-xs text-green-200">CO₂ absorbed</div>
          </div>

          {/* Forests */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <MapIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.forests}</div>
            <div className="text-xs text-green-200">Forests</div>
          </div>

          {/* Countries */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <GlobeAltIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.countries}</div>
            <div className="text-xs text-green-200">Countries</div>
          </div>

          {/* Impacts */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <ImpactIcon className="h-6 w-6 text-green-300" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.impacts}</div>
            <div className="text-xs text-green-200">Impacts</div>
          </div>
        </div>
      </div>
      {qrVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-80 text-center">
            <h3 className="text-lg font-semibold mb-3">Your public forest QR</h3>
            {qrUrl ? (
              <img src={qrUrl} alt="QR code" className="mx-auto w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-gray-200 animate-pulse mx-auto rounded" />
            )}
            <div className="mt-4 flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                onClick={() => setQrVisible(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                onClick={async () => {
                  const origin = window.location.origin;
                  try {
                    const res = await fetch('/api/users/public-id');
                    const data = await res.json();
                    const id = publicId || data?.data?.publicId;
                    if (id) await navigator.clipboard.writeText(`${origin}/u/${id}`);
                  } catch {}
                }}
              >
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

