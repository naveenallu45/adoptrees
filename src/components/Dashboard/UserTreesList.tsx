'use client';

import { useState, useEffect } from 'react';
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
  const [show, setShow] = useState(false);
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
          />
          <p className="mt-2 text-xs text-gray-500 text-center">
            Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
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

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const endpoint = publicId ? `/api/public/users/${publicId}/orders` : '/api/orders';
      const response = await fetch(endpoint);
      const result = await response.json();
      
      if (result.success) {
        const ordersData = publicId ? result.data.orders : result.data;
        setOrders(ordersData);
      } else {
        setError(result.error);
      }
    } catch (_error) {
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
          className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 rounded-lg shadow-sm border border-green-100/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                  {userType === 'individual' ? 'Your Adopted Trees' : 'Company Adopted Trees'}
                </h2>
              </div>
              {!publicId && (
                <motion.button
                  onClick={() => router.push(userType === 'individual' ? '/individuals' : '/companies')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PlusCircleIcon className="h-5 w-5" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.flatMap((order, orderIndex) => 
                  order.items.map((item, itemIndex) => (
                    <motion.div
                      key={`${order._id}-${itemIndex}`}
                      className="bg-gradient-to-br from-green-100/80 via-emerald-100/60 to-green-100/70 border border-green-300/80 rounded-lg p-5 hover:shadow-lg hover:border-green-400 hover:from-green-100 hover:via-emerald-100/80 hover:to-green-100/90 transition-all duration-300 w-full backdrop-blur-sm"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * (orderIndex + itemIndex) }}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Tree Image */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg overflow-hidden flex-shrink-0 border border-green-200/50 shadow-sm">
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
                        
                        {/* Content Section */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* Top Section: Tree Name and Stats */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-800 to-emerald-800 bg-clip-text text-transparent mb-2">
                                {item.treeName}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-medium rounded-full border border-green-200/50 text-xs sm:text-sm whitespace-nowrap">
                                  <SparklesIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                  {item.oxygenKgs} kg/year oxygen
                                </span>
                                {item.adoptionType === 'gift' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 font-medium rounded-full border border-purple-200 text-xs sm:text-sm whitespace-nowrap">
                                    <GiftIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    Gift for {item.recipientName}
                                  </span>
                                )}
                              </div>
                              {/* Adoption Date - Moved here, closer to stats */}
                              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                                <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Adopted on {formatAdoptedDate(order.createdAt)}</span>
                              </div>
                            </div>
                            
                            {/* Action Buttons - Stacked vertically */}
                            <div className="flex flex-col items-end gap-3 flex-shrink-0">
                              <button
                                onClick={() => {
                                  const basePath = userType === 'individual' ? '/dashboard/individual/trees' : '/dashboard/company/trees';
                                  router.push(`${basePath}/${order.orderId || order._id}/${itemIndex}`);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap w-full sm:w-auto"
                                type="button"
                              >
                                View More
                                <ArrowRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                              {getStatusText(order) === 'Certificate' && order.orderId && (
                                <button
                                  onClick={() => handleDownloadCertificate(order.orderId!)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 transition-all border border-green-200/50 shadow-sm whitespace-nowrap w-full sm:w-auto"
                                  type="button"
                                >
                                  <DocumentArrowDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  Certificate
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Planting location (collapsed by default) */}
                      {order.wellwisherTasks?.some(task => 
                        task.status === 'completed' && task.plantingDetails?.plantingLocation?.coordinates
                      ) && (() => {
                        const completedTask = order.wellwisherTasks?.find(task => 
                          task.status === 'completed' && task.plantingDetails?.plantingLocation?.coordinates
                        );
                        if (completedTask?.plantingDetails?.plantingLocation) {
                          const coords = completedTask.plantingDetails.plantingLocation.coordinates;
                          return (
                            <div className="mt-1 pt-1.5 border-t border-green-100/50">
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
                  ))
                )}
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
            
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your transaction history will appear here after you place your first order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order, orderIndex) => (
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
                      <div className="flex items-center space-x-2">
                        {getStatusText(order) === 'Certificate' && order.orderId && (
                          <button
                            onClick={() => handleDownloadCertificate(order.orderId!)}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                            type="button"
                          >
                            <DocumentArrowDownIcon className="h-3 w-3 mr-1" />
                            Certificate
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
                              ₹{item.price} each
                            </p>
                            <p className="text-xs text-green-600">
                              {item.oxygenKgs} kg/year oxygen
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
                        Total: ₹{order.totalAmount.toFixed(2)}
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

