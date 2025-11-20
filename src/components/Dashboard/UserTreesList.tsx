'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  GiftIcon,
  HeartIcon,
  MapPinIcon,
  DocumentArrowDownIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import PlantingLocationMap from './PlantingLocationMap';

function LocationToggle({ latitude, longitude, treeName }: { latitude: number; longitude: number; treeName: string }) {
  const [show, setShow] = useState(true); // Show map by default when dropdown is opened

  return (
    <div>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
      >
        <MapPinIcon className="h-4 w-4 flex-shrink-0" />
        <span>{show ? 'Hide location' : 'View location'}</span>
      </button>
      {show && (
        <div className="mt-3">
          <PlantingLocationMap
            latitude={latitude}
            longitude={longitude}
            treeName={treeName}
            className="w-full h-64 rounded-lg border border-green-200/50 shadow-sm"
            showOpenInMaps={true}
          />
        </div>
      )}
    </div>
  );
}

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

interface UserTreesListProps {
  userType: 'individual' | 'company';
  publicId?: string;
}

export default function UserTreesList({ userType, publicId }: UserTreesListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingCertificate, setDownloadingCertificate] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isTransactionsPage = pathname.includes('/transactions');

  const formatAdoptedDate = (isoDateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(isoDateString));
  };

  useEffect(() => {
    fetchUserOrders();
  }, [publicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter orders based on page type
  const displayedOrders = useMemo(() => {
    if (isTransactionsPage) {
      // On transactions page: exclude pending payment status
      return orders.filter(order => order.paymentStatus !== 'pending');
    }
    // On trees page: only show paid orders (handled in groupedTrees)
    return orders;
  }, [orders, isTransactionsPage]);

  // Memoize tree list computation - show each adoption separately
  const groupedTrees = useMemo(() => {
    if (isTransactionsPage || orders.length === 0) {
      return [];
    }

    // Filter to only show successfully paid orders (exclude pending and failed)
    const paidOrders = orders.filter(order => order.paymentStatus === 'paid');

    // Show each adoption separately - don't group by treeId
    const treeList: Array<{
      item: OrderItem;
      totalQuantity: number;
      orders: Order[];
      earliestDate: Date;
      firstOrderIndex: number;
      firstItemIndex: number;
    }> = [];

    paidOrders.forEach((order, orderIndex) => {
      order.items.forEach((item, itemIndex) => {
        // For each item, create separate entries for each quantity
        // This ensures each adoption is shown separately
        for (let qty = 0; qty < item.quantity; qty++) {
          treeList.push({
            item: {
              ...item,
              quantity: 1, // Each entry represents one tree adoption
            },
            totalQuantity: 1, // Each entry is a single tree
            orders: [order],
            earliestDate: new Date(order.createdAt),
            firstOrderIndex: orderIndex,
            firstItemIndex: itemIndex
          });
        }
      });
    });

    // Sort by date (newest first)
    return treeList.sort((a, b) => b.earliestDate.getTime() - a.earliestDate.getTime());
  }, [orders, isTransactionsPage]);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const endpoint = publicId ? `/api/public/users/${publicId}/orders` : '/api/orders';
      
      // Add cache-busting and ensure fresh data
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
        console.log('[UserTreesList] Received orders:', ordersData.length, 'for publicId:', publicId || 'current user');
        if (ordersData.length > 0) {
          console.log('[UserTreesList] Sample order userId:', ordersData[0].userId);
        }
        
        // Server already handles deduplication, so we can use data directly
        setOrders(ordersData);
      } else {
        setError(result.error);
      }
    } catch (_error) {
      console.error('[UserTreesList] Error fetching orders:', _error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (order: Order) => {
    // Check if order has wellwisher tasks
    if (order.wellwisherTasks && order.wellwisherTasks.length > 0) {
      const allTasksCompleted = order.wellwisherTasks.every(task => task.status === 'completed');
      const anyTaskInProgress = order.wellwisherTasks.some(task => task.status === 'in_progress');
      
      if (allTasksCompleted) {
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      } else if (anyTaskInProgress) {
        return <ClockIcon className="h-5 w-5 text-blue-600" />;
      } else {
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      }
    }
    
    // Fallback to order status
    switch (order.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'planted':
        return <CheckCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'confirmed':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (order: Order) => {
    // Business rule: Certificate available without wellwisher confirmation
    if (
      order.paymentStatus === 'paid' ||
      order.status === 'confirmed' ||
      order.status === 'planted' ||
      order.status === 'completed'
    ) {
      return 'Certificate';
    }
    // No other statuses needed in UI
    return '';
  };

  const handleDownloadCertificate = async (orderId: string) => {
    if (downloadingCertificate) return; // Prevent multiple clicks
    
    setDownloadingCertificate(orderId);
    try {
      const response = await fetch(`/api/certificates/${orderId}`);
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to download certificate');
        return;
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate');
    } finally {
      setDownloadingCertificate(null);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Content - Show trees if not on transactions page, otherwise show transactions */}
      {!isTransactionsPage ? (
        <motion.div
          className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 rounded-lg shadow-sm border border-green-100/50 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent text-center sm:text-left">
                  {userType === 'individual' ? 'Your Adopted Trees' : 'Company Adopted Trees'}
                </h2>
              </div>
              {!publicId && orders.length > 0 && (
                <motion.button
                  onClick={() => router.push(userType === 'individual' ? '/individuals' : '/companies')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base w-full sm:w-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PlusCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Adopt New Tree</span>
                </motion.button>
              )}
            </div>
          
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <HeartIcon className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="mt-2 text-base font-semibold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">No trees adopted yet</h3>
                <p className="mt-1 text-sm text-gray-600 mb-6">
                  {userType === 'individual' 
                    ? 'Get started by adopting your first tree to make a positive impact on the environment.'
                    : 'Start your company\'s environmental journey by adopting trees for your team.'
                  }
                </p>
                {!publicId && (
                  <motion.button
                    onClick={() => router.push(userType === 'individual' ? '/individuals' : '/companies')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    <span>Adopt Your First Tree</span>
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {groupedTrees.map((treeData, treeIndex) => {
                    const { item, orders: treeOrders, earliestDate, firstOrderIndex: _firstOrderIndex, firstItemIndex } = treeData;
                    const primaryOrder = treeOrders[0]; // Use first order for navigation
                    
                    // Create unique key for each adoption
                    const uniqueKey = `${primaryOrder._id}-${firstItemIndex}-${treeIndex}`;
                    
                    return (
                      <motion.div
                        key={uniqueKey}
                        className="bg-gradient-to-br from-green-100/80 via-emerald-100/60 to-green-100/70 border border-green-300/80 rounded-lg p-3 sm:p-4 md:p-5 hover:shadow-lg hover:border-green-400 hover:from-green-100 hover:via-emerald-100/80 hover:to-green-100/90 transition-all duration-300 w-full backdrop-blur-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * treeIndex }}
                      >
                        <div className="flex flex-row gap-3 sm:gap-4">
                          {/* Tree Image */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg overflow-hidden flex-shrink-0 border border-green-200/50 shadow-sm">
                            {item.treeImageUrl ? (
                              <Image
                                src={item.treeImageUrl}
                                alt={item.treeName}
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                                onError={(_e) => {
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                                <span className="text-green-600 text-xs font-medium">No Image</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Content Section with Buttons on Right */}
                          <div className="flex-1 min-w-0 flex flex-row items-start gap-3 sm:gap-4">
                            {/* Left: Tree Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-start gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-medium rounded-full border border-green-200/50 text-xs whitespace-nowrap">
                                  <SparklesIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                  {item.oxygenKgs} kg/year O₂
                                </span>
                                {item.adoptionType === 'gift' && (
                                  <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-purple-50 text-purple-700 font-medium rounded-full border border-purple-200 text-xs whitespace-nowrap">
                                    <GiftIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                    Gift for {item.recipientName}
                                  </span>
                                )}
                              </div>
                              {/* Adoption Date */}
                              <div className="flex items-center justify-start gap-1.5 text-xs text-gray-500">
                                <ClockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                <span>Adopted on {formatAdoptedDate(earliestDate.toISOString())}</span>
                              </div>
                            </div>
                            
                            {/* Right: Action Buttons */}
                            <div className="flex flex-col items-end justify-end gap-2 sm:gap-3 flex-shrink-0">
                              <button
                                onClick={() => {
                                  const basePath = userType === 'individual' ? '/dashboard/individual/trees' : '/dashboard/company/trees';
                                  router.push(`${basePath}/${primaryOrder.orderId || primaryOrder._id}/${firstItemIndex}`);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                                type="button"
                              >
                                View More
                                <ArrowRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                              {!isTransactionsPage && getStatusText(primaryOrder) === 'Certificate' && primaryOrder.orderId && (
                                <button
                                  onClick={() => handleDownloadCertificate(primaryOrder.orderId!)}
                                  disabled={downloadingCertificate === primaryOrder.orderId}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 transition-all border border-green-200/50 shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                  type="button"
                                >
                                  {downloadingCertificate === primaryOrder.orderId ? (
                                    <>
                                      <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                  <DocumentArrowDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  Certificate
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Planting location (show by default) */}
                        {(() => {
                          // Check only the primary order for this specific tree adoption's planting location
                          const completedTask = primaryOrder.wellwisherTasks?.find(task => 
                            task.status === 'completed' && task.plantingDetails?.plantingLocation?.coordinates
                          );
                          if (completedTask?.plantingDetails?.plantingLocation) {
                            const coords = completedTask.plantingDetails.plantingLocation.coordinates;
                            return (
                              <div className="mt-1 pt-1.5 border-t border-green-100/50" key={`location-${uniqueKey}`}>
                                <LocationToggle
                                  latitude={coords[1]}
                                  longitude={coords[0]}
                                  treeName={item.treeName}
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </motion.div>
                    );
                  })
                }
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
            
            {displayedOrders.length === 0 ? (
              <div className="text-center py-12">
                <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your transaction history will appear here after you place your first order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOrders.map((order, orderIndex) => (
                  <motion.div
                    key={order._id}
                    className="border border-gray-200 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * orderIndex }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order)}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Order #{order.orderId || order._id.slice(-8)}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Adopted on {formatAdoptedDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        {/* Payment Status Badge - Only show on transactions page and exclude pending */}
                        {isTransactionsPage && order.paymentStatus && order.paymentStatus !== 'pending' && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            order.paymentStatus === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : order.paymentStatus === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : order.paymentStatus === 'refunded'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.paymentStatus === 'paid' && '✓ Paid'}
                            {order.paymentStatus === 'failed' && '✗ Failed'}
                            {order.paymentStatus === 'refunded' && '↻ Refunded'}
                            {order.paymentStatus !== 'paid' && order.paymentStatus !== 'failed' && order.paymentStatus !== 'refunded' && order.paymentStatus}
                          </span>
                        )}
                        {!isTransactionsPage && getStatusText(order) === 'Certificate' && order.orderId && (
                          <button
                            onClick={() => handleDownloadCertificate(order.orderId!)}
                            disabled={downloadingCertificate === order.orderId}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                          >
                            {downloadingCertificate === order.orderId ? (
                              <>
                                <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                              </>
                            ) : (
                              <>
                            <DocumentArrowDownIcon className="h-3 w-3 mr-1" />
                            Certificate
                              </>
                            )}
                          </button>
                        )}
                        {order.isGift && (
                          <span className="flex items-center text-xs text-purple-600">
                            <GiftIcon className="h-4 w-4 mr-1" />
                            Gift
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      {order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.treeImageUrl ? (
                              <Image
                                src={item.treeImageUrl}
                                alt={item.treeName}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                                onError={(_e) => {
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{item.treeName}</h4>
                            <p className="text-xs text-gray-500">
                              ₹{item.price.toLocaleString()} each
                            </p>
                            <p className="text-xs text-green-600">
                              {item.oxygenKgs} kg/year O₂
                            </p>
                            {item.adoptionType === 'gift' && (
                              <p className="text-xs text-purple-600 truncate">
                                Gift for: {item.recipientName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        Total: ₹{order.totalAmount.toLocaleString()}
                      </span>
                      {order.isGift && order.giftMessage && (
                        <p className="text-xs text-gray-600 italic">
                          &ldquo;{order.giftMessage}&rdquo;
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

