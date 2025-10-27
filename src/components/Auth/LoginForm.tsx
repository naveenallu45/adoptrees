'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

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
        setError('Invalid email or password');
      } else {
        // Check if there's a redirect parameter (e.g., from cart page)
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          // Fetch the updated session to get user type
          try {
            const sessionResponse = await fetch('/api/auth/session');
            const sessionData = await sessionResponse.json();
            
            if (sessionData?.user?.userType === 'individual') {
              router.push('/dashboard/individual/trees');
            } else if (sessionData?.user?.userType === 'company') {
              router.push('/dashboard/company/trees');
            } else if (sessionData?.user?.role === 'admin') {
              router.push('/admin');
            } else {
              router.push('/');
            }
          } catch (error) {
            console.error('Error fetching session:', error);
            router.push('/');
          }
        }
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md">
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-green-100 p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Sign in to continue planting trees.</p>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
            />
          </div>

          {error && (
            <div className="text-red-600 text-xs sm:text-sm bg-red-50 border border-red-100 rounded-lg p-2 sm:p-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 sm:py-3 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-center text-gray-700">
          New to Adoptrees?{' '}
          <Link href="/register" className="text-green-600 font-semibold hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}


