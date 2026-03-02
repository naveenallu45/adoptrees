'use client';

import { motion } from 'framer-motion';
import { SparklesIcon, GlobeAltIcon, HeartIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const features = [
  {
    icon: SparklesIcon,
    title: 'Sustainable Impact',
    description: 'Every goal scored translates directly into trees planted, creating measurable environmental impact.',
    gradient: 'from-green-500 to-emerald-600',
    bgGradient: 'from-green-50 to-emerald-50',
  },
  {
    icon: GlobeAltIcon,
    title: 'Global Reach',
    description: 'Join a movement that spans across borders, connecting sports excellence with environmental stewardship.',
    gradient: 'from-blue-500 to-cyan-600',
    bgGradient: 'from-blue-50 to-cyan-50',
  },
  {
    icon: HeartIcon,
    title: 'Community Driven',
    description: 'Built on the passion of hockey fans and environmental advocates working together.',
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50',
  },
  {
    icon: ChartBarIcon,
    title: 'Transparent Tracking',
    description: 'Real-time updates on tree planting progress and environmental impact metrics.',
    gradient: 'from-purple-500 to-indigo-600',
    bgGradient: 'from-purple-50 to-indigo-50',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white via-blue-50/50 to-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.span 
              className="inline-block text-sm font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-5 py-2.5 rounded-full mb-4 shadow-sm"
              whileHover={{ scale: 1.05 }}
            >
              Why It Matters
            </motion.span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Making Every Match Count
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Combining the excitement of hockey with meaningful environmental action
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative bg-white rounded-2xl p-6 sm:p-8 border-2 border-gray-100 hover:border-blue-200 hover:shadow-2xl transition-all duration-500 overflow-hidden"
                >
                  {/* Gradient Background on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-4">
                      <motion.div 
                        className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </motion.div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                          {feature.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-base sm:text-lg text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                      {feature.description}
                    </p>
                  </div>

                  {/* Decorative Corner */}
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full`}></div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
