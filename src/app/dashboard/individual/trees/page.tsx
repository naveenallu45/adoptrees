'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import UserTreesList from '@/components/Dashboard/UserTreesList';

export default function IndividualTreesPage() {
  const router = useRouter();

  const handleAdoptNewTree = () => {
    router.push('/individuals');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Trees</h1>
          <p className="mt-2 text-gray-600">
            Manage and track your adopted trees
          </p>
        </div>
        <motion.button
          onClick={handleAdoptNewTree}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PlusIcon className="h-5 w-5" />
          Adopt New Tree
        </motion.button>
      </div>

      {/* User Trees List Component */}
      <UserTreesList userType="individual" />
    </div>
  );
}
