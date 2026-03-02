'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface Adoption {
  _id: string;
  orderId: string;
  userName: string;
  treesCount: number;
  createdAt: Date;
  items: Array<{
    treeName: string;
    quantity: number;
  }>;
}

interface AdoptionsSectionProps {
  initialAdoptions: Adoption[];
  totalTrees: number;
}

export default function AdoptionsSection({ initialAdoptions, totalTrees }: AdoptionsSectionProps) {
  const [adoptions] = useState(initialAdoptions);

  return (
    <section id="adoptions" className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="inline-block mb-4"
          >
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-5 py-2.5 rounded-full shadow-sm">
              Our Impact
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-8 sm:mb-10 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
          >
            Growing Together
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-10 mb-10 max-w-2xl mx-auto shadow-2xl border-2 border-blue-400/30 relative overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-[100px]"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px]"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", delay: 0.4 }}
                className="flex items-center justify-center gap-3 mb-4"
              >
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300" />
                <p className="text-5xl sm:text-6xl md:text-7xl font-black text-white">
                  {totalTrees.toLocaleString()}
                </p>
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300" />
              </motion.div>
              <p className="text-xl sm:text-2xl text-blue-100 font-bold mb-3">
                Trees Planted
              </p>
              <p className="text-white/90 text-base sm:text-lg font-medium">
                Every tree represents a goal towards a greener future
              </p>
            </div>
          </motion.div>
        </div>

        {/* Adoptions Grid */}
        {adoptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {adoptions.map((adoption, index) => (
              <motion.div
                key={adoption._id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 sm:p-7 border-2 border-gray-100 hover:border-blue-300 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <TrophyIcon className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <h3 className="font-black text-gray-900 text-lg sm:text-xl mb-1 group-hover:text-blue-600 transition-colors">
                          {adoption.userName}
                        </h3>
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                          #{adoption.orderId.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-5">
                    <div className="flex items-baseline gap-2 mb-3">
                      <motion.p 
                        className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", delay: index * 0.1 + 0.2 }}
                      >
                        {adoption.treesCount}
                      </motion.p>
                      <p className="text-sm sm:text-base text-gray-600 font-bold">
                        {adoption.treesCount === 1 ? 'Tree' : 'Trees'} Planted
                      </p>
                    </div>
                    <div className="space-y-2">
                      {adoption.items.map((item, idx) => (
                        <motion.div 
                          key={idx} 
                          className="flex items-center gap-2 text-sm sm:text-base text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-3 py-2 border border-blue-100 group-hover:border-blue-200 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 + idx * 0.05 }}
                        >
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          <span className="font-bold text-blue-600">{item.quantity}x</span>
                          <span className="font-medium">{item.treeName}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t-2 border-gray-100 group-hover:border-blue-200 transition-colors">
                    <p className="text-xs sm:text-sm text-gray-500 font-bold">
                      {new Date(adoption.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full"></div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center py-16 sm:py-20"
          >
            <motion.div 
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrophyIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
            </motion.div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Be the First!
            </h3>
            <p className="text-gray-600 max-w-md mx-auto text-lg sm:text-xl font-medium">
              No adoptions yet. Help us plant the first trees for Hockey India!
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
