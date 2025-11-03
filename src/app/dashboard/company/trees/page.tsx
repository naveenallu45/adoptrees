'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import UserTreesList from '@/components/Dashboard/UserTreesList';

export default function CompanyTreesPage() {
  const router = useRouter();

  const handleAdoptNewTrees = () => {
    router.push('/companies');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Trees</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage your company&apos;s tree adoption portfolio
          </p>
        </div>
        <motion.button
          onClick={handleAdoptNewTrees}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors w-full sm:w-auto"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PlusIcon className="h-5 w-5" />
          <span className="text-sm sm:text-base">Adopt New Trees</span>
        </motion.button>
      </div>

      {/* Company Impact */}
      <motion.div
        className="bg-white rounded-lg shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Environmental Impact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">0</div>
              <div className="text-xs sm:text-sm text-gray-600">Trees Planted</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">0</div>
              <div className="text-xs sm:text-sm text-gray-600">CO₂ Sequestered (kg)</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">0</div>
              <div className="text-xs sm:text-sm text-gray-600">Oxygen Produced (kg)</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* User Trees List Component */}
      <UserTreesList userType="company" />
    </div>
  );
}
