'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

type UserType = 'individual' | 'company' | '';

export default function RegisterForm() {
  const [userType, setUserType] = useState<UserType>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUserType = (type: UserType) => {
    setUserType(type);
    setIsDropdownOpen(false);
  };

  const getUserTypeLabel = () => {
    if (userType === 'individual') return 'Individual';
    if (userType === 'company') return 'Company';
    return 'Select';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!userType) {
      setError('Please select an account type');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, name, companyName, email, phone, password }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        // Handle validation errors
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((d: { message: string }) => d.message).join(', ');
          setError(errorMessages);
        } else {
          setError(data.error || 'Sign up failed. Please try again.');
        }
        return;
      }
      
      // Success - redirect to login
      router.push('/login?registered=true');
    } catch {
      setError('Sign up failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md lg:max-w-2xl">
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-green-100 p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Choose account type and fill the details.</p>

        <div className="mb-4 sm:mb-6" ref={dropdownRef}>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Account Type</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-left flex items-center justify-between text-sm sm:text-base"
            >
              <span className={userType === '' ? 'text-gray-500' : ''}>{getUserTypeLabel()}</span>
              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleSelectUserType('')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-50 text-gray-500 transition-colors text-sm sm:text-base"
                >
                  Select
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectUserType('individual')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-green-50 text-gray-900 transition-colors border-t border-gray-100 text-sm sm:text-base"
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectUserType('company')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-green-50 text-gray-900 transition-colors border-t border-gray-100 text-sm sm:text-base"
                >
                  Company
                </button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {userType === 'individual' && (
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
              />
            </div>
          )}

          {userType === 'company' && (
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Company name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
              />
            </div>
          )}

          <div className="md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="md:col-span-2 text-red-600 text-xs sm:text-sm bg-red-50 border border-red-100 rounded-lg p-2 sm:p-3">{error}</div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 sm:py-3 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        </form>

        <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-center text-gray-700">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}


