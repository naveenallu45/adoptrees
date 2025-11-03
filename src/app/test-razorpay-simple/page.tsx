'use client';

import { useState, useEffect } from 'react';

export default function RazorpayTestPage() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRazorpay = () => {
      // Try to load Razorpay script directly
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        if (window.Razorpay && typeof window.Razorpay === 'function') {
          setStatus('✅ Razorpay Ready!');
          setError('');
        } else {
          setStatus('❌ Script loaded but constructor not available');
        }
      };
      
      script.onerror = (_e) => {
        setStatus('❌ Script failed to load');
        setError('Script loading failed - check console for details');
      };
      
      document.head.appendChild(script);
    };

    // Try loading immediately
    loadRazorpay();
  }, []);

  const testPayment = () => {
    if (!window.Razorpay) {
      alert('Razorpay not available');
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

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (_error) {
      alert('Error opening Razorpay: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Razorpay Test</h1>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">{status}</p>
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          <button
            onClick={testPayment}
            disabled={status !== '✅ Razorpay Ready!'}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
          >
            {status === '✅ Razorpay Ready!' ? 'Test Payment' : 'Loading...'}
          </button>

          <div className="text-xs text-gray-600 text-center">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Check browser console for loading messages</li>
              <li>If &quot;This content is blocked&quot; appears, try:</li>
              <li>• Clear browser cache</li>
              <li>• Try incognito mode</li>
              <li>• Disable ad blockers</li>
              <li>• Check network restrictions</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
