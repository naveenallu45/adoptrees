'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ShoppingBagIcon,
  SparklesIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/solid';
import {
  TrophyIcon as TrophyIconOutline,
  SparklesIcon as TreeIconOutline
} from '@heroicons/react/24/outline';

interface Achiever {
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'individual' | 'company';
  userImage?: string;
  publicId?: string;
  totalTrees: number;
  totalOxygen: number;
  totalOrders: number;
  totalAmount: number;
  lastAdoptionDate?: string;
  rank: number;
}

type SortBy = 'trees' | 'oxygen' | 'orders';

export default function AchieversPage() {
  const [achievers, setAchievers] = useState<Achiever[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('trees');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievers();
  }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAchievers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/achievers?sortBy=${sortBy}&limit=100`, {
        cache: 'no-store'
      });
      const result = await response.json();

      if (result.success) {
        setAchievers(result.data);
      } else {
        const errorMessage = result.error || 'Failed to load achievers';
        // Show more user-friendly message for connection errors
        if (response.status === 503) {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error fetching achievers:', err);
      setError('Failed to load achievers. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const getSortButtonClass = (currentSort: SortBy) => {
    return `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
      sortBy === currentSort
        ? 'bg-yellow-500 text-green-900 shadow-lg scale-105'
        : 'bg-white/10 text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm'
    }`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 pt-24 sm:pt-28 pb-16 relative">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-green-700/30 rounded-full blur-3xl -ml-24 -mt-24"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-700/30 rounded-full blur-3xl -mr-24 -mb-24"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrophyIconOutline className="w-12 h-12 text-yellow-400" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
              Achievers
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-green-100 max-w-2xl mx-auto">
            Celebrating our top contributors who are making a real impact on our planet
          </p>
        </motion.div>

        {/* Sort Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          <button
            onClick={() => setSortBy('trees')}
            className={getSortButtonClass('trees')}
          >
            <TreeIconOutline className="w-5 h-5 inline-block mr-2" />
            Most Trees
          </button>
          <button
            onClick={() => setSortBy('oxygen')}
            className={getSortButtonClass('oxygen')}
          >
            <SparklesIcon className="w-5 h-5 inline-block mr-2" />
            Most Oxygen
          </button>
          <button
            onClick={() => setSortBy('orders')}
            className={getSortButtonClass('orders')}
          >
            <ShoppingBagIcon className="w-5 h-5 inline-block mr-2" />
            Most Orders
          </button>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-center backdrop-blur-sm">
            <p className="text-red-100">{error}</p>
            <button
              onClick={fetchAchievers}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Achievers List */}
        {!loading && !error && (
          <div className="space-y-4">
            {achievers.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center border border-white/20">
                <TrophyIconOutline className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Achievers Yet</h3>
                <p className="text-green-100">Be the first to adopt trees and appear on the leaderboard!</p>
              </div>
            ) : (
              achievers.map((achiever, index) => (
                <motion.div
                  key={achiever.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div
                    className="block bg-white/10 backdrop-blur-md rounded-2xl shadow-xl transition-all duration-300 p-5 sm:p-6 border border-white/30"
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        {achiever.userImage && achiever.userImage.trim() !== '' ? (
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white/50 shadow-lg ring-2 ring-white/20">
                            <Image
                              src={achiever.userImage}
                              alt={achiever.userName}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center border-4 border-white/50 shadow-lg ring-2 ring-white/20">
                            {achiever.userType === 'company' ? (
                              <BuildingOfficeIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                            ) : (
                              <span className="text-white font-bold text-2xl sm:text-3xl">
                                {getUserInitials(achiever.userName)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl sm:text-2xl font-bold text-white truncate">
                            {achiever.userName}
                          </h3>
                          {achiever.userType === 'company' && (
                            <span className="px-3 py-1 bg-purple-500/60 text-white rounded-full text-xs font-bold backdrop-blur-sm border border-purple-300/30">
                              Company
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-green-200 mb-4">
                          Last adoption: {formatDate(achiever.lastAdoptionDate)}
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border border-white/30 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <TreeIconOutline className="w-3 h-3 text-green-300" />
                              <span className="text-[9px] sm:text-[10px] font-semibold text-green-100 uppercase tracking-wide">Trees</span>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-white">
                              {achiever.totalTrees.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border border-white/30 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <SparklesIcon className="w-3 h-3 text-blue-300" />
                              <span className="text-[9px] sm:text-[10px] font-semibold text-green-100 uppercase tracking-wide">Oxygen</span>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-white">
                              {achiever.totalOxygen.toLocaleString()}
                            </p>
                            <p className="text-[9px] text-green-200 mt-0.5">kg/year</p>
                          </div>
                          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border border-white/30 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <ShoppingBagIcon className="w-3 h-3 text-purple-300" />
                              <span className="text-[9px] sm:text-[10px] font-semibold text-green-100 uppercase tracking-wide">Orders</span>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-white">
                              {achiever.totalOrders}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

