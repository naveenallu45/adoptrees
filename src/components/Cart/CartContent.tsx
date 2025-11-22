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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/80 to-green-100/90 pt-20 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-16">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-green-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl"></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        {cartItems.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 max-w-md mx-auto shadow-xl border border-green-100">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Your cart is empty</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-8 sm:mb-10 px-4">Start adding trees to your cart to make a difference!</p>
              <a 
                href="/individuals" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 text-base sm:text-lg shadow-lg hover:shadow-xl hover:scale-105"
              >
                Browse Trees
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-green-100 shadow-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Cart Items ({cartItems.length})</h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 md:p-6 border border-green-100">
                    <div className="flex flex-row items-center gap-3 sm:gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-green-200">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 truncate">{item.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-4 mt-1">
                            <p className="text-green-600 font-semibold text-xs sm:text-sm md:text-base">₹{item.price.toLocaleString()}</p>
                            <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                              {item.oxygenKgs} kg/year oxygen
                            </span>
                            {item.packageQuantity && item.packageQuantity > 1 && (
                              <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                Package: {item.packageQuantity} trees
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-5 sm:w-6 md:w-8 text-center font-semibold text-gray-800 text-xs sm:text-sm md:text-base">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow"
                            >
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                          <div className="text-right sm:text-right">
                            <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-800">₹{(item.price * item.quantity).toLocaleString()}</p>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700 text-[10px] sm:text-xs md:text-sm font-medium transition-colors duration-200"
                            >
                              Remove
                            </button>
                          </div>
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
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 sm:p-6 sticky top-20 sm:top-24 md:top-28 lg:top-32 xl:top-36 border border-green-200">
                <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-green-100">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800">Order Summary</h3>
                </div>
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between items-center text-sm sm:text-base py-2">
                    <span className="text-gray-600 font-medium">Subtotal</span>
                    <span className="font-semibold text-gray-800">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-green-200 pt-3 sm:pt-4">
                    <div className="flex justify-between items-center text-base sm:text-lg font-bold bg-green-50/50 rounded-lg p-3">
                      <span className="text-gray-800">Total</span>
                      <span className="text-green-700 text-lg sm:text-xl">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {session ? (
                    <>
                      <button 
                        onClick={handlePlaceTree}
                        disabled={isPlacingOrder}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-2 sm:py-3 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base shadow-md hover:shadow-lg"
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
