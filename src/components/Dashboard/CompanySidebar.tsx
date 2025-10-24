'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  GiftIcon,
  QuestionMarkCircleIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as TreeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Your Trees', href: '/dashboard/company/trees', icon: TreeIcon },
  { name: 'Gifts', href: '/dashboard/company/gift', icon: GiftIcon },
  { name: 'Support', href: '/dashboard/company/support', icon: QuestionMarkCircleIcon },
  { name: 'Profile', href: '/dashboard/company/profile', icon: BuildingOfficeIcon },
  { name: 'Transactions', href: '/dashboard/company/transactions', icon: CreditCardIcon },
];

export default function CompanySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-blue-900 to-blue-800 text-white">
      {/* Logo/Header */}
      <div className="flex h-20 items-center justify-center border-b border-blue-700 px-6">
        <div className="flex items-center gap-3">
          <TreeIcon className="h-8 w-8 text-blue-300" />
          <h1 className="text-2xl font-bold">Adoptrees</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`
                relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-lg'
                    : 'text-blue-100 hover:bg-blue-700/50'
                }
              `}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
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
      <div className="border-t border-blue-700 p-4">
        <motion.button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-blue-100 transition-all duration-200 hover:bg-red-600 hover:text-white"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>Logout</span>
        </motion.button>
      </div>
    </div>
  );
}
