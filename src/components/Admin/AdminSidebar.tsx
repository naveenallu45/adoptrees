'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  HomeIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as TreeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Trees', href: '/admin/trees', icon: TreeIcon },
  { name: 'Adoptions', href: '/admin/adoptions', icon: ClipboardDocumentListIcon },
  { name: 'Individual Users', href: '/admin/users/individuals', icon: UserIcon },
  { name: 'Company Users', href: '/admin/users/companies', icon: BuildingOfficeIcon },
  { name: 'Well-Wishers', href: '/admin/wellwishers', icon: HeartIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-green-900 to-green-800 text-white">
      {/* Logo/Header */}
      <div className="flex h-20 items-center justify-center border-b border-green-700 px-6">
        <h1 className="text-2xl font-bold">Adoptrees Admin</h1>
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
                    ? 'bg-green-700 text-white shadow-lg'
                    : 'text-green-100 hover:bg-green-700/50'
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
      <div className="border-t border-green-700 p-4">
        <motion.button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-green-100 transition-all duration-200 hover:bg-red-600 hover:text-white"
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

