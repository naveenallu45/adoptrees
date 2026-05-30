'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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
    totalAmount: number; // Final amount paid
    originalAmount?: number; // Original amount before discounts
    couponDiscount?: number; // Discount from coupon
    creditsUsed?: number; // Green credits used
    couponCode?: string | null; // Coupon code if applied
    itemsCount: number;
  } | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<{ containsForestItems: boolean } | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercentage: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Array<{ code: string; discountPercentage: number }>>([]);
  const [_loadingCoupons, setLoadingCoupons] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [useCredits, setUseCredits] = useState<boolean>(false);
  const [_loadingCredits, setLoadingCredits] = useState<boolean>(false);

  const subtotal = getTotalPrice();
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const amountAfterCoupon = appliedCoupon ? appliedCoupon.finalAmount : subtotal;
  
  // Calculate credits discount (max 25% of order after coupon)
  const maxCreditsUsage = Math.round(amountAfterCoupon * 0.25);
  const creditsToUse = useCredits ? Math.min(userCredits, maxCreditsUsage) : 0;
  const total = amountAfterCoupon - creditsToUse;

  // Fetch user credits
  useEffect(() => {
    const fetchUserCredits = async () => {
      if (!session?.user?.id) {
        setUserCredits(0);
        return;
      }
      
      try {
        setLoadingCredits(true);
        const response = await fetch(`/api/users/${session.user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setUserCredits(result.data.credits || 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user credits:', error);
      } finally {
        setLoadingCredits(false);
      }
    };

    fetchUserCredits();
  }, [session?.user?.id]);

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

  // Fetch available coupons
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      if (!session?.user) return;
      
      try {
        setLoadingCoupons(true);
        const userType = session.user.userType || 'individual';
        const response = await fetch(`/api/coupons/validate?userType=${userType}`, {
          cache: 'no-store'
        });
        const result = await response.json();
        
        if (result.success) {
          setAvailableCoupons(result.data);
        }
      } catch (error) {
        console.error('Error fetching available coupons:', error);
      } finally {
        setLoadingCoupons(false);
      }
    };

    fetchAvailableCoupons();
  }, [session?.user]);

  // Real-time coupon validation as user types
  useEffect(() => {
    if (!session?.user || appliedCoupon) {
      setIsCouponValid(false);
      return;
    }

    const code = String(couponCode || '').trim();
    
    // Reset validation if code is empty
    if (!code || code.length === 0) {
      setIsCouponValid(false);
      setCouponError('');
      return;
    }

    // Debounce validation
    const timeoutId = setTimeout(async () => {
      try {
        setCheckingCoupon(true);
        setCouponError('');
        
        const userType = session.user.userType || 'individual';
        const response = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            userType,
            subtotal
          }),
          cache: 'no-store'
        });

        const result = await response.json();

        if (result.success) {
          setIsCouponValid(true);
          setCouponError('');
        } else {
          setIsCouponValid(false);
          // Only show error if code is still the same (user hasn't changed it)
          if (String(couponCode || '').trim() === code) {
            setCouponError(result.error || 'Invalid coupon code');
          }
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        setIsCouponValid(false);
        if (String(couponCode || '').trim() === code) {
          setCouponError('Failed to validate coupon');
        }
      } finally {
        setCheckingCoupon(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [couponCode, session?.user, subtotal, appliedCoupon]);

  // Validate and apply coupon
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = String(codeToApply || couponCode || '').trim();
    
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }

    if (!session?.user) {
      setCouponError('Please login to apply coupon');
      return;
    }

    try {
      setValidatingCoupon(true);
      setCouponError('');
      
      const userType = session.user.userType || 'individual';
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          userType,
          subtotal
        }),
        cache: 'no-store'
      });

      const result = await response.json();

      if (result.success) {
        setAppliedCoupon({
          code: result.data.code,
          discountPercentage: result.data.discountPercentage,
          discountAmount: result.data.discountAmount,
          finalAmount: result.data.finalAmount
        });
        setCouponCode('');
        setCouponError('');
        setIsCouponValid(false);
        setShowCouponDropdown(false);
      } else {
        setCouponError(result.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        setIsCouponValid(false);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError('Failed to validate coupon. Please try again.');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setIsCouponValid(false);
  };

  const handleSelectCoupon = (code: string) => {
    setCouponCode(code);
    setShowCouponDropdown(false);
    // Directly apply the coupon with the code parameter
    handleApplyCoupon(code);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCouponDropdown && !target.closest('[data-coupon-dropdown]')) {
        setShowCouponDropdown(false);
      }
    };

    if (showCouponDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCouponDropdown]);

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

    // Validate forest name and occasion for forest type items
    const forestItems = cartItems.filter(item => item.type === 'forest');
    for (const item of forestItems) {
      // Validate occasion - must be provided and not empty
      if (!item.occasion || item.occasion.trim() === '' || item.occasion === 'Create your occasion') {
        toast.error(`Please enter an occasion name for "${item.name}"`);
        // Scroll to the item
        const itemElement = document.getElementById(`cart-item-${item.id}`);
        if (itemElement) {
          itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (item.occasion.trim().length > 100) {
        toast.error(`Occasion name for "${item.name}" cannot exceed 100 characters`);
        return;
      }
      // Validate forest name
      if (!item.forestName || item.forestName.trim() === '') {
        toast.error(`Please enter a forest name for "${item.name}"`);
        // Scroll to the item
        const itemElement = document.getElementById(`cart-item-${item.id}`);
        if (itemElement) {
          itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (item.forestName.trim().length > 100) {
        toast.error(`Forest name for "${item.name}" cannot exceed 100 characters`);
        return;
      }
    }

    // Validate gifted trees have recipient email
    // Skip dealer items - they have their own validation with customerName/customerEmail
    for (const item of cartItems) {
      if (item.adoptionType === 'gift' && item.type !== 'dealer') {
        if (!item.recipientEmail || !item.recipientEmail.trim()) {
          toast.error(`Recipient email is required for "${item.name}" as it's a gift`);
          // Find and scroll to the item
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(item.recipientEmail.trim())) {
          toast.error(`Please enter a valid recipient email for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        if (!item.recipientName || !item.recipientName.trim()) {
          toast.error(`Recipient name is required for "${item.name}" as it's a gift`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        if (!item.recipientProfilePicture || !item.recipientProfilePicture.trim()) {
          toast.error(`Recipient profile picture is required for "${item.name}" as it's a gift`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
    }

    // Validate dealer items have customer information
    for (const item of cartItems) {
      if (item.type === 'dealer') {
        if (!item.customerName || !item.customerName.trim()) {
          toast.error(`Customer name is required for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        if (!item.customerEmail || !item.customerEmail.trim()) {
          toast.error(`Customer email is required for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(item.customerEmail.trim())) {
          toast.error(`Please enter a valid customer email for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        if (!item.customerPhone || !item.customerPhone.trim()) {
          toast.error(`Customer phone number is required for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        // Validate phone number format (10 digits, optionally with +91 or 0 prefix)
        const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
        const cleanedPhone = item.customerPhone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanedPhone) && !/^[6-9]\d{9}$/.test(cleanedPhone)) {
          toast.error(`Please enter a valid 10-digit phone number for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        if (!item.vehicleName || !item.vehicleName.trim()) {
          toast.error(`Vehicle name is required for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        // Profile picture is mandatory for dealer orders
        if (!item.customerProfilePicture || !item.customerProfilePicture.trim()) {
          toast.error(`Customer profile picture is required for "${item.name}"`);
          const itemElement = document.getElementById(`cart-item-${item.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
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
      const containsForestItems = cartItems.some(item => item.type === 'forest');
      setCheckoutContext({ containsForestItems });

      // Prepare order data
      const orderData = {
        items: cartItems.map(item => ({
          treeId: item.id,
          quantity: item.quantity,
          adoptionType: item.adoptionType || 'self',
          recipientName: item.recipientName,
          recipientEmail: item.recipientEmail,
          recipientProfilePicture: item.recipientProfilePicture,
          giftMessage: item.giftMessage,
          forestName: item.forestName,
          occasion: item.occasion,
          // Map 'dealer' to 'individual' since Order model treeType enum doesn't include 'dealer'
          // Dealer trees are adopted for individual customers
          treeTypeOverride: item.type === 'dealer' ? 'individual' : item.type,
          customerName: item.customerName,
          customerEmail: item.customerEmail,
          customerPhone: item.customerPhone,
          vehicleName: item.vehicleName,
          customerProfilePicture: item.customerProfilePicture
        })),
        // Exclude dealer items from gift calculation - dealer items use customerName/customerEmail, not recipientName/recipientEmail
        isGift: cartItems.some(item => item.adoptionType === 'gift' && item.type !== 'dealer'),
        giftRecipientName: cartItems.find(item => item.adoptionType === 'gift' && item.type !== 'dealer')?.recipientName,
        giftRecipientEmail: cartItems.find(item => item.adoptionType === 'gift' && item.type !== 'dealer')?.recipientEmail,
        giftRecipientProfilePicture: cartItems.find(item => item.adoptionType === 'gift' && item.type !== 'dealer')?.recipientProfilePicture,
        giftMessage: cartItems.find(item => item.adoptionType === 'gift' && item.type !== 'dealer')?.giftMessage,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: appliedCoupon ? appliedCoupon.discountAmount : 0,
        creditsUsed: session?.user?.userType === 'dealer' ? 0 : creditsToUse, // Dealers don't use credits
        finalAmount: total
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
          // Add a small delay to ensure Razorpay modal is fully closed
          await new Promise(resolve => setTimeout(resolve, 300));
          
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
                originalAmount: verifyResult.data.originalAmount,
                couponDiscount: verifyResult.data.couponDiscount,
                creditsUsed: verifyResult.data.creditsUsed,
                couponCode: verifyResult.data.couponCode,
                itemsCount: verifyResult.data.items
              });
              clearCart();
              setPaymentStatus('success');
              // Ensure dialog shows after state updates
              setTimeout(() => {
                setShowPaymentDialog(true);
              }, 100);
              // Don't refresh immediately - let the dialog show first
              // Refresh will happen when dialog is closed
            } else {
              setPaymentStatus('failed');
              setPaymentMessage('Payment verification failed: ' + (verifyResult.error || 'Unknown error'));
              setTimeout(() => {
                setShowPaymentDialog(true);
              }, 100);
            }
          } catch (_error) {
            console.error('Payment verification error:', _error);
            setPaymentStatus('failed');
            setPaymentMessage('Failed to verify payment. Please contact support with your order ID: ' + orderId);
            setTimeout(() => {
              setShowPaymentDialog(true);
            }, 100);
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
    router.refresh();
    setCheckoutContext(null);
  };

  const handleViewTrees = () => {
    setShowPaymentDialog(false);
    setOrderDetails(null);
    setPaymentMessage('');
    const containsForestItems = checkoutContext?.containsForestItems ?? false;
    // Refresh the page to update any server-rendered data
    router.refresh();
    // Redirect to appropriate dashboard based on user type
    if (session?.user?.userType === 'individual') {
      router.push(containsForestItems ? '/dashboard/individual/forest' : '/dashboard/individual/trees');
    } else if (session?.user?.userType === 'company' || session?.user?.userType === 'dealer') {
      router.push(containsForestItems ? '/dashboard/company/forest' : '/dashboard/company/trees');
    }
    setCheckoutContext(null);
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
                  <div key={item.id} id={`cart-item-${item.id}`} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 md:p-6 border border-green-100">
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

                    {/* Customer Information for Dealer Items */}
                    {item.type === 'dealer' && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-semibold text-purple-900 mb-2">Customer Information (Gift Tree)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={item.customerName || ''}
                            onChange={(e) => updateCartItem(item.id, { customerName: e.target.value })}
                            placeholder="Enter customer full name"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={item.customerEmail || ''}
                            onChange={(e) => updateCartItem(item.id, { customerEmail: e.target.value.toLowerCase().trim() })}
                            placeholder="customer@example.com"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vehicle Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={item.vehicleName || ''}
                            onChange={(e) => updateCartItem(item.id, { vehicleName: e.target.value })}
                            placeholder="e.g., Honda City, Toyota Innova"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* Forest Name Input for Forest Items */}
                    {item.type === 'forest' && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Occasion {item.occasion === 'Create your occasion' && <span className="text-red-500">*</span>}
                          </label>
                          {item.occasion === 'Create your occasion' || !item.occasion ? (
                            <>
                              <input
                                type="text"
                                required
                                value={item.occasion === 'Create your occasion' ? '' : (item.occasion || '')}
                                onChange={(e) => updateCartItem(item.id, { occasion: e.target.value })}
                                placeholder="Enter your occasion name (e.g., Team Green Initiative)"
                                maxLength={100}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Enter a name for your special occasion or initiative
                              </p>
                            </>
                          ) : item.occasion ? (
                            <>
                              <div className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-gray-50 text-gray-700">
                                {item.occasion}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                This occasion was selected when you created your forest
                              </p>
                            </>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Forest Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={item.forestName || ''}
                            onChange={(e) => updateCartItem(item.id, { forestName: e.target.value })}
                            placeholder="Enter your forest name (e.g., Julie's Birthday Forest)"
                            maxLength={100}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Give your forest a meaningful name that represents your special moment
                          </p>
                        </div>
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
                
                {/* Coupon Section */}
                <div className="mb-4 sm:mb-6 pb-4 border-b border-green-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode || ''}
                        onChange={(e) => {
                          const newCode = e.target.value.toUpperCase();
                          setCouponCode(newCode);
                          // Reset validation state when user types
                          setIsCouponValid(false);
                          setCouponError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isCouponValid && couponCode && String(couponCode).trim().length > 0 && !validatingCoupon && !checkingCoupon) {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                        disabled={!!appliedCoupon || validatingCoupon}
                      />
                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={validatingCoupon || checkingCoupon || !isCouponValid || !couponCode || String(couponCode).trim().length === 0}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {validatingCoupon || checkingCoupon ? '...' : 'Apply'}
                        </button>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-600">{couponError}</p>
                    )}
                    {appliedCoupon && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">{appliedCoupon.code}</span>
                        <span>-{appliedCoupon.discountPercentage}% applied</span>
                      </div>
                    )}
                    {availableCoupons.length > 0 && !appliedCoupon && (
                      <div className="mt-2 relative" data-coupon-dropdown>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Available Coupons:
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCouponDropdown(!showCouponDropdown)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white hover:bg-gray-50 transition-colors flex items-center justify-between shadow-sm"
                          >
                            <span className="text-gray-700 flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                              </svg>
                              Select a coupon
                            </span>
                            <svg 
                              className={`w-4 h-4 text-gray-500 transition-transform ${showCouponDropdown ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {showCouponDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto">
                              {availableCoupons.map((coupon) => (
                                <div
                                  key={coupon.code}
                                  className="px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0 group"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                                          {coupon.code}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {coupon.discountPercentage}% discount
                                        </div>
                                      </div>
                                      <div className="text-green-600 font-bold text-base flex-shrink-0">
                                        -{coupon.discountPercentage}%
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCoupon(coupon.code)}
                                      className="ml-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0 shadow-sm hover:shadow-md"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Credits Section - Hidden for dealers (credits go to customers) */}
                {session && userCredits > 0 && session.user.userType !== 'dealer' && (
                  <div className="mb-4 sm:mb-6 pb-4 border-b border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Use Green Credits</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useCredits}
                          onChange={(e) => setUseCredits(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Available: <span className="font-semibold text-green-600">{userCredits.toLocaleString()} pts</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between items-center text-sm sm:text-base py-2">
                    <span className="text-gray-600 font-medium">Subtotal</span>
                    <span className="font-semibold text-gray-800">₹{subtotal.toLocaleString()}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-sm sm:text-base py-2">
                      <span className="text-gray-600 font-medium">
                        Discount ({appliedCoupon.code})
                      </span>
                      <span className="font-semibold text-green-600">
                        -₹{discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {useCredits && creditsToUse > 0 && (
                    <div className="flex justify-between items-center text-sm sm:text-base py-2">
                      <span className="text-gray-600 font-medium">
                        Green Credits Used
                      </span>
                      <span className="font-semibold text-green-600">
                        -{creditsToUse.toLocaleString()} pts
                      </span>
                    </div>
                  )}
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
        isForestOrder={checkoutContext?.containsForestItems}
        onViewTrees={handleViewTrees}
      />
    </div>
  );
}
