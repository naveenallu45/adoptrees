'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      if (res?.error) {
        setError('Invalid admin credentials');
      } else {
        // Check if user is admin after successful login
        // This will be handled by the AuthGuard component
        router.push('/admin');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Access</h1>
        <p className="text-gray-600">Enter admin credentials to access dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="admin@adoptrees.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="Enter admin password"
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Signing in...' : 'Access Admin Dashboard'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push('/')}
          className="text-gray-600 hover:text-gray-800 text-sm underline"
        >
          ← Back to Home
        </button>
      </div>
    </motion.div>
  );
}
