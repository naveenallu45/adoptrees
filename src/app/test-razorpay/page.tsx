'use client';

import Script from 'next/script';
import { useState, useEffect } from 'react';

export default function RazorpayTest() {
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkRazorpay = () => {
      if (typeof window !== 'undefined' && window.Razorpay && typeof window.Razorpay === 'function') {
        setRazorpayLoaded(true);
        setError(false);
      } else {
        setTimeout(checkRazorpay, 500);
      }
    };

    setTimeout(checkRazorpay, 1000);
  }, []);

  const testPayment = () => {
    if (!window.Razorpay) {
      alert('Razorpay not loaded');
      return;
    }

    const options = {
      key: 'rzp_test_1234567890', // Test key
      amount: 100, // ₹1.00
      currency: 'INR',
      name: 'Test Payment',
      description: 'Test payment for Razorpay',
      order_id: 'test_order_123', // Required field
      handler: function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
        alert('Payment successful: ' + response.razorpay_payment_id);
      },
      theme: {
        color: '#22c55e'
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Razorpay Test</h1>
        
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => {
            // Wait for constructor to be available
            setTimeout(() => {
              if (window.Razorpay && typeof window.Razorpay === 'function') {
                setRazorpayLoaded(true);
                setError(false);
              }
            }, 100);
          }}
          onError={(_e) => {
            setError(true);
          }}
        />

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg">
              Status: {razorpayLoaded ? '✅ Ready' : error ? '❌ Failed' : '⏳ Loading...'}
            </p>
            <p className="text-sm text-gray-600">
              Constructor: {typeof window !== 'undefined' && window.Razorpay && typeof window.Razorpay === 'function' ? 'Available' : 'Not Available'}
            </p>
            <p className="text-sm text-gray-600">
              Script: {typeof window !== 'undefined' && window.Razorpay ? 'Loaded' : 'Not Loaded'}
            </p>
          </div>

          <button
            onClick={testPayment}
            disabled={!razorpayLoaded}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
          >
            {razorpayLoaded ? 'Test Payment' : 'Loading...'}
          </button>

          {error && (
            <div className="text-center text-red-600">
              <p>❌ Razorpay failed to load</p>
              <p className="text-sm">Check console for details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
