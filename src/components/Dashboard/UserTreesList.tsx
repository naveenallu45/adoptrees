'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  GiftIcon,
  HeartIcon
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
    plantingLocation: {
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

interface UserTreesListProps {
  userType: 'individual' | 'company';
}

export default function UserTreesList({ userType }: UserTreesListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const isTransactionsPage = pathname.includes('/transactions');

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      const result = await response.json();
      
      if (result.success) {
        console.log('Orders data:', result.data);
        setOrders(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const getStatusColor = (order: Order) => {
    // Check if order has wellwisher tasks
    if (order.wellwisherTasks && order.wellwisherTasks.length > 0) {
      const allTasksCompleted = order.wellwisherTasks.every(task => task.status === 'completed');
      const anyTaskInProgress = order.wellwisherTasks.some(task => task.status === 'in_progress');
      
      if (allTasksCompleted) {
        return 'bg-green-100 text-green-800';
      } else if (anyTaskInProgress) {
        return 'bg-blue-100 text-blue-800';
      } else {
        return 'bg-yellow-100 text-yellow-800';
      }
    }
    
    // Fallback to order status
    switch (order.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'planted':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (order: Order) => {
    // Check if order has wellwisher tasks
    if (order.wellwisherTasks && order.wellwisherTasks.length > 0) {
      const allTasksCompleted = order.wellwisherTasks.every(task => task.status === 'completed');
      const anyTaskInProgress = order.wellwisherTasks.some(task => task.status === 'in_progress');
      
      if (allTasksCompleted) {
        return 'Tree Planted Successfully';
      } else if (anyTaskInProgress) {
        return 'Well-wisher Planting Your Tree';
      } else {
        return 'Well-wisher to Plant Your Tree';
      }
    }
    
    // Fallback to order status
    return order.status.charAt(0).toUpperCase() + order.status.slice(1);
  };

  const calculateStats = () => {
    const totalTrees = orders.reduce((total, order) => 
      total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0), 0
    );
    
    const totalOxygen = orders.reduce((total, order) => 
      total + order.items.reduce((itemTotal, item) => 
        itemTotal + (item.oxygenKgs * item.quantity), 0), 0
    );
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthOrders = orders.filter(order => 
      new Date(order.createdAt) >= thisMonth
    );
    
    const thisMonthTrees = thisMonthOrders.reduce((total, order) => 
      total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0), 0
    );

    return {
      totalTrees,
      totalOxygen,
      thisMonthTrees
    };
  };

  const stats = calculateStats();

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

      {/* Stats Cards - Only show if not on transactions page */}
      {!isTransactionsPage && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 pb-2">
        <motion.div
          className="bg-white rounded-lg shadow p-4 sm:p-5 lg:p-6 flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2 bg-green-100 rounded-lg mb-2">
              <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
            </div>
            <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600 mb-1 sm:mb-2">Total Trees</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.totalTrees}</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-lg shadow p-4 sm:p-5 lg:p-6 flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2 bg-blue-100 rounded-lg mb-2">
              <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600 mb-1 sm:mb-2">This Month</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.thisMonthTrees}</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-lg shadow p-4 sm:p-5 lg:p-6 flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2 bg-purple-100 rounded-lg mb-2">
              <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
            </div>
            <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600 mb-1 sm:mb-2">Oxygen Produced</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.totalOxygen.toFixed(1)} kg</p>
          </div>
        </motion.div>
        </div>
      )}

      {/* Content - Show trees if not on transactions page, otherwise show transactions */}
      {!isTransactionsPage ? (
        <motion.div
          className="bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {userType === 'individual' ? 'Your Adopted Trees' : 'Company Adopted Trees'}
            </h2>
          
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No trees adopted yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {userType === 'individual' 
                    ? 'Get started by adopting your first tree to make a positive impact on the environment.'
                    : 'Start your company\'s environmental journey by adopting trees for your team.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.flatMap((order, orderIndex) => 
                  order.items.map((item, itemIndex) => (
                    <motion.div
                      key={`${order._id}-${itemIndex}`}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * (orderIndex + itemIndex) }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.treeImageUrl ? (
                            <Image
                              src={item.treeImageUrl}
                              alt={item.treeName}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Image load error:', e);
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-500 text-sm">No Image</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-xl font-semibold text-gray-900 mb-2">{item.treeName}</h4>
                              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-2">
                                <span>Quantity: {item.quantity}</span>
                                <span className="text-green-600 font-medium">
                                  {item.oxygenKgs} kg/year oxygen
                                </span>
                              </div>
                              
                              {item.adoptionType === 'gift' && (
                                <div className="flex items-center text-sm text-purple-600 mb-2">
                                  <GiftIcon className="h-4 w-4 mr-1" />
                                  <span>Gift for: {item.recipientName}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end space-y-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order)}`}>
                                {getStatusText(order)}
                              </span>
                              <span className="text-sm text-gray-500">
                                Adopted: {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order)}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Order #{order.orderId || order._id.slice(-8)}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order)}`}>
                          {getStatusText(order)}
                        </span>
                        {order.isGift && (
                          <span className="flex items-center text-xs text-purple-600">
                            <GiftIcon className="h-4 w-4 mr-1" />
                            Gift
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                            {item.treeImageUrl ? (
                              <Image
                                src={item.treeImageUrl}
                                alt={item.treeName}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Image load error:', e);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{item.treeName}</h4>
                            <p className="text-xs text-gray-500">
                              Quantity: {item.quantity} • ₹{item.price} each
                            </p>
                            <p className="text-xs text-green-600">
                              {item.oxygenKgs} kg/year oxygen
                            </p>
                            {item.adoptionType === 'gift' && (
                              <p className="text-xs text-purple-600">
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
