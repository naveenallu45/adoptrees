'use client';

import { motion } from 'framer-motion';
import { MapPinIcon } from '@heroicons/react/24/solid';

const locations = [
  {
    name: 'Arunachal Pradesh',
    region: 'Northeast India',
    description: 'Supporting biodiversity and forest conservation in the Eastern Himalayas',
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    name: 'Nagaland',
    region: 'Northeast India',
    description: 'Restoring native forests and supporting local communities',
    gradient: 'from-green-500 to-emerald-600',
    bgGradient: 'from-green-50 to-emerald-50',
  },
  {
    name: 'Telangana',
    region: 'South India',
    description: 'Greening the state where the qualifiers are being held',
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50 to-indigo-50',
  },
];

export default function LocationsSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]"></div>
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
              Planting Locations
            </motion.span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Where the Trees Will Be Planted?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Our trees are being planted across three key regions, creating lasting environmental impact
            </p>
          </motion.div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {locations.map((location, index) => (
              <motion.div
                key={location.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative bg-white rounded-2xl p-6 sm:p-8 border-2 border-gray-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-500 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${location.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-5">
                    <motion.div 
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${location.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <MapPinIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </motion.div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
                        {location.name}
                      </h3>
                      <p className="text-sm sm:text-base text-blue-600 font-bold mb-2">
                        {location.region}
                      </p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                    {location.description}
                  </p>
                </div>

                {/* Decorative Corner */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${location.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full`}></div>
              </motion.div>
            ))}
          </div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 sm:mt-16 text-center"
          >
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border-2 border-blue-100 max-w-4xl mx-auto">
              <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium">
                Each tree planted contributes to carbon sequestration, biodiversity conservation, and supports local communities. 
                Together, we&apos;re creating a greener future across India.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
