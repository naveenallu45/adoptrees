'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { getTotalItems } = useCart();

  // Pages that should always have white navbar background
  const fixedWhitePages = ['/individuals', '/companies', '/about'];
  const shouldUseWhiteBg = fixedWhitePages.includes(pathname) || isScrolled;
  // Pages where buttons should have green background
  const shouldUseGreenBg = fixedWhitePages.includes(pathname) || (mounted && isScrolled);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    // Check initial scroll position
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'For Individuals', href: '/individuals' },
    { name: 'For Companies', href: '/companies' },
    { name: 'About Us', href: '/about' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      shouldUseWhiteBg 
        ? 'bg-white shadow-md' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-0 sm:py-[1.25px]">
        <div className="flex items-center justify-between h-auto">
          {/* Logo and Navigation Items */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
            {/* Logo */}
            <div className="flex items-center">
              <Link 
                href="/"
                className="flex items-center transition-transform duration-300 hover:scale-105 active:scale-95"
                aria-label="Adoptrees Home"
              >
                <div className="relative w-[74px] h-[74px] sm:w-[74px] sm:h-[74px] md:w-[88px] md:h-[88px] lg:w-[102px] lg:h-[102px] xl:w-[116px] xl:h-[116px] 2xl:w-[130px] 2xl:h-[130px] flex-shrink-0">
                  <Image
                    src={shouldUseWhiteBg 
                      ? "https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762682129/WhatsApp_Image_2025-10-17_at_7.25.07_PM_vqytis.png"
                      : "https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762682465/ChatGPT_Image_Nov_9_2025_at_03_30_47_PM_bojbww.png"
                    }
                    alt="Adoptrees Logo"
                    fill
                    className="object-contain object-center transition-opacity duration-300"
                    sizes="(max-width: 640px) 74px, (max-width: 768px) 74px, (max-width: 1024px) 88px, (max-width: 1280px) 102px, (max-width: 1536px) 116px, 130px"
                    priority
                    quality={90}
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Items */}
            <div className="hidden lg:flex items-center space-x-8 xl:space-x-10">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`transition-all duration-300 font-bold text-xl xl:text-2xl tracking-tight relative group ${
                    shouldUseWhiteBg 
                      ? 'text-gray-800 hover:text-green-600' 
                      : 'text-white hover:text-green-200 drop-shadow-lg'
                  }`}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${
                    shouldUseWhiteBg ? 'bg-green-500' : 'bg-white'
                  }`}></span>
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
                className={`flex items-center gap-2 text-white border border-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg font-black text-[16.2px] lg:text-[18.5px] transition-all duration-200 ${
                  shouldUseGreenBg 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-transparent hover:text-green-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden lg:inline">Profile</span>
              </Link>
            ) : (
              <Link href="/login" className={`flex items-center gap-2 text-white border border-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg font-black text-[16.2px] lg:text-[18.5px] transition-all duration-200 ${
                shouldUseGreenBg 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-transparent hover:text-green-200'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden lg:inline">Login</span>
              </Link>
            )}

            {/* Desktop Cart Button */}
            <Link href="/cart" className={`relative flex items-center gap-2 text-white border border-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg font-black text-[16.2px] lg:text-[18.5px] transition-all duration-200 ${
              shouldUseGreenBg 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-transparent hover:text-green-200'
            }`}>
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
            <Link href="/cart" className={`relative flex items-center justify-center p-2 text-white border border-white rounded-lg transition-all duration-200 ${
              shouldUseGreenBg 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-transparent hover:text-green-200'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-white text-green-600 text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{getTotalItems()}</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              className={`p-2 rounded-lg transition-colors duration-300 flex items-center justify-center ${
                shouldUseWhiteBg 
                  ? 'text-gray-800 hover:bg-gray-100' 
                  : 'text-white hover:bg-white/20'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`w-full h-0.5 block transition-all duration-300 ${
                  shouldUseWhiteBg ? 'bg-gray-800' : 'bg-white'
                } ${isMenuOpen ? 'rotate-45 translate-y-0.5' : ''}`} />
                <span className={`w-full h-0.5 block mt-1 transition-all duration-300 ${
                  shouldUseWhiteBg ? 'bg-gray-800' : 'bg-white'
                } ${isMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`w-full h-0.5 block mt-1 transition-all duration-300 ${
                  shouldUseWhiteBg ? 'bg-gray-800' : 'bg-white'
                } ${isMenuOpen ? '-rotate-45 -translate-y-0.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden mt-2 transition-all duration-300 ${
          shouldUseWhiteBg 
            ? 'bg-white border-t border-gray-100' 
            : 'bg-transparent border-t border-white/20'
        } ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pt-4 pb-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block transition-colors duration-300 py-2 font-bold text-lg border-b last:border-b-0 ${
                  shouldUseWhiteBg 
                    ? 'text-gray-800 hover:text-green-600 border-gray-50' 
                    : 'text-white hover:text-green-200 border-white/20'
                }`}
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
                  className={`flex items-center justify-center gap-2 text-white border border-white px-3 py-2 rounded-xl font-black text-[18.5px] transition-all duration-200 ${
                    shouldUseGreenBg 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-transparent hover:text-green-200'
                  }`}
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
                  className={`flex items-center justify-center gap-2 text-white border border-white px-3 py-2 rounded-xl font-black text-[18.5px] transition-all duration-200 ${
                    shouldUseGreenBg 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-transparent hover:text-green-200'
                  }`}
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
