'use client';

import { useState } from 'react';

export default function CredentialTester() {
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [result, setResult] = useState('');

  const testCredentials = async () => {
    if (!keyId || !keySecret) {
      setResult('❌ Please enter both Key ID and Key Secret');
      return;
    }

    setResult('🔄 Testing credentials...');

    try {
      const response = await fetch('/api/test-razorpay-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyId,
          keySecret
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult('✅ Credentials are valid! You can use these in your .env.local file.');
      } else {
        setResult(`❌ Credentials are invalid: ${data.error}`);
      }
    } catch (_error) {
      setResult(`❌ Error testing credentials: ${_error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Razorpay Credential Tester</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razorpay Key ID
            </label>
            <input
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_test_xxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razorpay Key Secret
            </label>
            <input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="Your key secret"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={testCredentials}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold"
          >
            Test Credentials
          </button>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm">{result}</p>
            </div>
          )}

          <div className="text-xs text-gray-600 mt-4">
            <p><strong>How to get credentials:</strong></p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Go to <a href="https://dashboard.razorpay.com/" target="_blank" className="text-blue-500">Razorpay Dashboard</a></li>
              <li>Sign up/Login to your account</li>
              <li>Go to Settings → API Keys</li>
              <li>Make sure you&apos;re in Test Mode</li>
              <li>Generate Test Key</li>
              <li>Copy Key ID and Key Secret</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
