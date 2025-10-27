'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import AdoptionDetails from './AdoptionDetails';
import SuccessDialog from './SuccessDialog';

export default function CartContent() {
  const { cartItems, updateQuantity, removeFromCart, updateCartItem, getTotalPrice, clearCart } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    totalAmount: number;
    itemsCount: number;
  } | null>(null);

  const subtotal = getTotalPrice();
  const total = subtotal;

  const handlePlaceTree = async () => {
    if (!session) {
      router.push('/login?redirect=/cart');
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      // Prepare order data
      const orderData = {
        items: cartItems.map(item => ({
          treeId: item.id,
          quantity: item.quantity,
          adoptionType: item.adoptionType || 'self',
          recipientName: item.recipientName,
          recipientEmail: item.recipientEmail,
          giftMessage: item.giftMessage
        })),
        isGift: cartItems.some(item => item.adoptionType === 'gift'),
        giftRecipientName: cartItems.find(item => item.adoptionType === 'gift')?.recipientName,
        giftRecipientEmail: cartItems.find(item => item.adoptionType === 'gift')?.recipientEmail,
        giftMessage: cartItems.find(item => item.adoptionType === 'gift')?.giftMessage
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        setOrderDetails({
          orderId: result.data.orderId,
          totalAmount: result.data.totalAmount,
          itemsCount: result.data.items
        });
        clearCart();
        setShowSuccessDialog(true);
      } else {
        alert('Failed to place order: ' + result.error);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setOrderDetails(null);
    // Redirect to appropriate dashboard
    if (session?.user?.userType === 'individual') {
      router.push('/dashboard/individual/trees');
    } else if (session?.user?.userType === 'company') {
      router.push('/dashboard/company/trees');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Your cart is empty</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-4">Start adding trees to your cart to make a difference!</p>
            <a 
              href="/individuals" 
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-300 text-sm sm:text-base"
            >
              Browse Trees
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Cart Items ({cartItems.length})</h2>
              <div className="space-y-3 sm:space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{item.name}</h3>
                        <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{item.info}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                          <p className="text-green-600 font-semibold text-sm sm:text-base">₹{item.price}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {item.oxygenKgs} kg/year oxygen
                          </span>
                          {item.packageQuantity && item.packageQuantity > 1 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Package: {item.packageQuantity} trees
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end space-x-3 sm:space-x-0 sm:space-y-2">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors duration-200"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-6 sm:w-8 text-center font-semibold text-black text-sm sm:text-base">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors duration-200"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-semibold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 text-xs sm:text-sm font-medium transition-colors duration-200"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Adoption Details for Individual Items */}
                    {item.type === 'individual' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <AdoptionDetails 
                          item={item} 
                          onUpdate={(updates) => updateCartItem(item.id, updates)} 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-20 sm:top-24">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Order Summary</h3>
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-black">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 sm:pt-3">
                    <div className="flex justify-between text-base sm:text-lg font-bold">
                      <span className="text-black">Total</span>
                      <span className="text-black">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {session ? (
                    <button 
                      onClick={handlePlaceTree}
                      disabled={isPlacingOrder}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-300 text-sm sm:text-base"
                    >
                      {isPlacingOrder ? 'Placing Tree...' : 'Place Tree'}
                    </button>
                  ) : (
                    <Link 
                      href="/login?redirect=/cart"
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center text-sm sm:text-base"
                    >
                      Login & Place Tree
                    </Link>
                  )}
                  <Link 
                    href="/individuals"
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center text-sm sm:text-base"
                  >
                    Continue Adopting
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Success Dialog */}
      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        orderDetails={orderDetails}
      />
    </div>
  );
}
