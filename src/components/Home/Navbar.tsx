'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const { getTotalItems } = useCart();

  const navItems = [
    { name: 'For Individuals', href: '/individuals' },
    { name: 'For Companies', href: '/companies' },
    { name: 'About Us', href: '/about' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation Items */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <Image
                  src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760778346/WhatsApp_Image_2025-10-18_at_2.35.31_PM_ndgk70.jpg"
                  alt="Adoptrees Logo"
                  width={100}
                  height={100}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20"
                  priority
                />
              </Link>
            </div>

            {/* Desktop Navigation Items */}
            <div className="hidden lg:flex items-center space-x-8 xl:space-x-10">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-800 hover:text-green-600 transition-all duration-300 font-semibold text-base xl:text-lg tracking-tight relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3 lg:gap-6 xl:gap-8">
            {/* Auth Buttons */}
            {session ? (
              <Link 
                href={session.user.userType === 'individual' ? '/dashboard/individual/trees' : '/dashboard/company/trees'} 
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white px-3 lg:px-6 py-2 lg:py-2.5 rounded-lg font-semibold text-sm lg:text-base shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 border border-green-400/20 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden lg:inline">Profile</span>
              </Link>
            ) : (
              <Link href="/login" className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white px-3 lg:px-6 py-2 lg:py-2.5 rounded-lg font-semibold text-sm lg:text-base shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 border border-green-400/20 backdrop-blur-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden lg:inline">Login</span>
              </Link>
            )}

            {/* Desktop Cart Button */}
            <Link href="/cart" className="relative flex items-center gap-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 active:from-green-600 active:to-green-700 text-white px-3 lg:px-6 py-2 lg:py-2.5 rounded-lg font-semibold text-sm lg:text-base shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 border border-green-300/20 backdrop-blur-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
              </svg>
              <span className="hidden lg:inline">Cart</span>
              <span className="absolute -top-2 -right-2 bg-white text-green-600 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{getTotalItems()}</span>
            </Link>
          </div>

          {/* Mobile Action Buttons */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Cart Button */}
            <Link href="/cart" className="relative flex items-center justify-center p-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-white text-green-600 text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{getTotalItems()}</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-300 flex items-center justify-center"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`w-full h-0.5 bg-gray-800 block transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-0.5' : ''}`} />
                <span className={`w-full h-0.5 bg-gray-800 block mt-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`w-full h-0.5 bg-gray-800 block mt-1 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-0.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden bg-white border-t border-gray-100 mt-2 transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pt-4 pb-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-gray-800 hover:text-green-600 transition-colors duration-300 py-2 font-semibold text-base border-b border-gray-50 last:border-b-0"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              {/* Mobile Auth Buttons */}
              {session ? (
                <Link
                  href={session.user.userType === 'individual' ? '/dashboard/individual/trees' : '/dashboard/company/trees'}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white px-4 py-3 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-green-400/20 backdrop-blur-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white px-4 py-3 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-green-400/20 backdrop-blur-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
