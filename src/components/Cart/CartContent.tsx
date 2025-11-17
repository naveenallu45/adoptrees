'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import AdoptionDetails from './AdoptionDetails';
import PaymentDialog, { PaymentStatus } from './SuccessDialog';

export default function CartContent() {
  const { cartItems, updateQuantity, removeFromCart, updateCartItem, getTotalPrice, clearCart } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('success');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    totalAmount: number;
    itemsCount: number;
  } | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState(false);

  const subtotal = getTotalPrice();
  const total = subtotal;

  // Multiple Razorpay loading strategies
  useEffect(() => {
    const checkRazorpay = () => {
      if (typeof window !== 'undefined' && window.Razorpay && typeof window.Razorpay === 'function') {
        setRazorpayLoaded(true);
        setScriptLoadError(false);
        return true;
      }
      return false;
    };

    // Try multiple loading methods
    const tryLoadRazorpay = () => {
      if (checkRazorpay()) return;
      
      // Remove any existing scripts
      const existingScripts = document.querySelectorAll('script[src*="razorpay"]');
      existingScripts.forEach(script => script.remove());

      // Try manual script loading
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setTimeout(() => {
          if (checkRazorpay()) return;
        }, 200);
      };
        script.onerror = () => {
        // Try alternative CDN
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdn.razorpay.com/v1/checkout.js';
        fallbackScript.async = true;
        fallbackScript.onload = () => {
          setTimeout(() => {
            if (checkRazorpay()) return;
            setScriptLoadError(true);
          }, 500);
        };
        fallbackScript.onerror = () => {
          setScriptLoadError(true);
        };
        document.head.appendChild(fallbackScript);
      };
      
      document.head.appendChild(script);
    };

    // Start loading immediately, then try again after delay
    tryLoadRazorpay();
    
    const timer = setTimeout(() => {
      if (!checkRazorpay()) {
        tryLoadRazorpay();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const retryRazorpayLoad = () => {
    setScriptLoadError(false);
    setRazorpayLoaded(false);
    
    // Remove all existing scripts
    const existingScripts = document.querySelectorAll('script[src*="razorpay"]');
    existingScripts.forEach(script => script.remove());
    
    // Try direct script injection
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.Razorpay && typeof window.Razorpay === 'function') {
          setRazorpayLoaded(true);
          setScriptLoadError(false);
        } else {
          setScriptLoadError(true);
        }
      }, 300);
    };
    script.onerror = () => {
      setScriptLoadError(true);
    };
    
    document.head.appendChild(script);
  };

  const handlePlaceTree = async () => {
    // Prevent multiple simultaneous order placements
    if (isPlacingOrder) {
      return;
    }

    if (!session) {
      router.push('/login?redirect=/cart');
      return;
    }

    if (!razorpayLoaded) {
      retryRazorpayLoad();
      // Wait a moment and try again
      setTimeout(() => {
        if (window.Razorpay && typeof window.Razorpay === 'function') {
          handlePlaceTree();
        } else {
          setPaymentStatus('failed');
          setPaymentMessage('Payment gateway failed to load. Please try refreshing the page.');
          setShowPaymentDialog(true);
        }
      }, 2000);
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

      // Create Razorpay order
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create order';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        setPaymentStatus('failed');
        setPaymentMessage(errorMessage);
        setShowPaymentDialog(true);
        setIsPlacingOrder(false);
        return;
      }

      const result = await response.json();

      if (!result.success) {
        setPaymentStatus('failed');
        setPaymentMessage('Failed to create order: ' + (result.error || 'Unknown error'));
        setShowPaymentDialog(true);
        setIsPlacingOrder(false);
        return;
      }

      const { razorpayOrderId, orderId, amount, currency, razorpayKeyId } = result.data;

      // Check if Razorpay is properly loaded
      if (!window.Razorpay || typeof window.Razorpay !== 'function') {
        alert('Payment gateway not properly loaded. Please refresh the page and try again.');
        setIsPlacingOrder(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: razorpayKeyId,
        amount: amount,
        currency: currency,
        name: 'Adoptrees',
        description: `Order for ${cartItems.length} tree(s)`,
        order_id: razorpayOrderId,
        prefill: {
          name: session.user?.name || 'Customer',
          email: session.user?.email || '',
        },
        theme: {
          color: '#22c55e', // Green color
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Handle payment success
          try {
            const verifyResponse = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderId,
              }),
            });

            if (!verifyResponse.ok) {
              let errorMessage = 'Payment verification failed';
              try {
                const errorData = await verifyResponse.json();
                errorMessage = errorData.error || errorMessage;
              } catch {
                errorMessage = `Server error: ${verifyResponse.status} ${verifyResponse.statusText}`;
              }
              setPaymentStatus('failed');
              setPaymentMessage(errorMessage);
              setShowPaymentDialog(true);
              setIsPlacingOrder(false);
              return;
            }

            const verifyResult = await verifyResponse.json();

            if (verifyResult.success) {
              setOrderDetails({
                orderId: verifyResult.data.orderId,
                totalAmount: verifyResult.data.totalAmount,
                itemsCount: verifyResult.data.items
              });
              clearCart();
              setPaymentStatus('success');
              setShowPaymentDialog(true);
            } else {
              setPaymentStatus('failed');
              setPaymentMessage('Payment verification failed: ' + (verifyResult.error || 'Unknown error'));
              setShowPaymentDialog(true);
            }
          } catch (_error) {
            console.error('Payment verification error:', _error);
            setPaymentStatus('failed');
            setPaymentMessage('Failed to verify payment. Please contact support with your order ID: ' + orderId);
            setShowPaymentDialog(true);
          } finally {
            setIsPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the payment modal
            setIsPlacingOrder(false);
            setPaymentStatus('failed');
            setPaymentMessage('Payment was cancelled or dismissed. You can try again anytime.');
            setShowPaymentDialog(true);
          },
        },
        notes: {
          orderId: orderId,
        },
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (_error) {
        setPaymentStatus('failed');
        setPaymentMessage('Failed to open payment gateway. Please try again.');
        setShowPaymentDialog(true);
        setIsPlacingOrder(false);
      }
    } catch (_error) {
      setPaymentStatus('failed');
      setPaymentMessage('Failed to place order. Please try again.');
      setShowPaymentDialog(true);
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentDialogClose = () => {
    setShowPaymentDialog(false);
    setOrderDetails(null);
    setPaymentMessage('');
    // Redirect to appropriate dashboard only on success
    if (paymentStatus === 'success') {
      if (session?.user?.userType === 'individual') {
        router.push('/dashboard/individual/trees');
      } else if (session?.user?.userType === 'company') {
        router.push('/dashboard/company/trees');
      }
    }
  };

  const handleRetryPayment = () => {
    setShowPaymentDialog(false);
    setPaymentMessage('');
    handlePlaceTree();
  };

  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-16">
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
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-20 sm:top-24 md:top-28 lg:top-32 xl:top-36">
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
                    <>
                      <button 
                        onClick={handlePlaceTree}
                        disabled={isPlacingOrder}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-300 text-sm sm:text-base"
                      >
                        {isPlacingOrder ? 'Processing...' : razorpayLoaded ? 'Place Tree' : 'Place Tree (Retry Loading)'}
                      </button>
                      
                      {scriptLoadError && (
                        <div className="space-y-2">
                          <button 
                            onClick={retryRazorpayLoad}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-300 text-sm sm:text-base"
                          >
                            🔄 Retry Loading Payment Gateway
                          </button>
                          <div className="text-xs text-gray-600 text-center">
                            <p><strong>Payment gateway failed to load.</strong></p>
                            <p className="mt-1">Common causes:</p>
                            <ul className="list-disc list-inside mt-1">
                              <li>Ad blocker blocking the script</li>
                              <li>Network connectivity issues</li>
                              <li>Corporate firewall restrictions</li>
                            </ul>
                            <p className="mt-2"><strong>Solutions:</strong></p>
                            <ul className="list-disc list-inside">
                              <li>Disable ad blockers</li>
                              <li>Try incognito mode</li>
                              <li>Check network connection</li>
                              <li>Refresh the page</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
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
      
      {/* Unified Payment Dialog */}
      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={handlePaymentDialogClose}
        status={paymentStatus}
        orderDetails={orderDetails}
        errorMessage={paymentMessage}
        onRetry={handleRetryPayment}
      />
    </div>
  );
}
