'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  HomeIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/wellwisher', icon: HomeIcon },
  { name: 'Upcoming', href: '/wellwisher/upcoming', icon: ClockIcon },
  { name: 'Ongoing', href: '/wellwisher/ongoing', icon: ArrowPathIcon },
  { name: 'Completed', href: '/wellwisher/completed', icon: CheckCircleIcon },
  { name: 'Updating', href: '/wellwisher/updating', icon: ArrowPathIcon },
];

export default function WellWisherSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  const closeMobileSidebar = () => {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-green-900 to-green-800 text-white">
      {/* Logo/Header */}
      <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 border-b border-green-700">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Well-Wisher</h1>
        
        {/* Mobile close button */}
        <button
          onClick={closeMobileSidebar}
          className="lg:hidden p-1 rounded-md text-green-300 hover:text-white hover:bg-green-700/50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 sm:px-4 py-4 sm:py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.name}
              onClick={() => {
                router.push(item.href);
                closeMobileSidebar();
              }}
              className={`
                relative flex w-full items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-green-700 text-white shadow-lg'
                    : 'text-green-100 hover:bg-green-700/50'
                }
              `}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">{item.name}</span>
              {isActive && (
                <motion.div
                  className="absolute left-0 h-full w-1 rounded-r-full bg-white"
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-green-700 p-3 sm:p-4">
        <motion.button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-green-100 transition-all duration-200 hover:bg-red-600 hover:text-white"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Logout</span>
        </motion.button>
      </div>
    </div>
  );
}
