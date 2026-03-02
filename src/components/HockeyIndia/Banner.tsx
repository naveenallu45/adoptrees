'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function Banner() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-700 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[140px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-[140px] opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Floating Icons */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 180, 360],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: Math.random() * 3 + 3,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          >
            <SparklesIcon className="w-8 h-8 text-white/30" />
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div 
              className="inline-block mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-sm font-bold text-blue-100 uppercase tracking-wider bg-white/20 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/30 shadow-lg">
                Our Mission
              </span>
            </motion.div>
            
            <motion.h2 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 sm:mb-10 drop-shadow-2xl leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Building a Greener Future,
              <br />
              <span className="bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-transparent">
                One Goal at a Time
              </span>
            </motion.h2>
            
            <motion.p 
              className="text-lg sm:text-xl md:text-2xl text-blue-50 max-w-4xl mx-auto mb-8 sm:mb-10 leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Join us in celebrating the FIH Hockey World Cup 2026 Qualifiers in Hyderabad, Telangana. 
              Every goal scored represents trees planted, creating a lasting impact on our planet. 
              Together, we&apos;re making every match count for the environment.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-10"
            >
              <p className="text-2xl sm:text-3xl md:text-4xl text-white font-black italic max-w-3xl mx-auto drop-shadow-lg">
                Every time the net shakes, the Earth breathes 🥅
              </p>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/hockey-india#adoptions"
                  className="group inline-flex items-center gap-3 bg-white text-blue-700 px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base sm:text-lg font-black shadow-2xl hover:shadow-white/50 transition-all duration-300 relative overflow-hidden"
                >
                  <span className="relative z-10">View Adoptions</span>
                  <motion.svg 
                    className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </motion.svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/about"
                  className="inline-flex items-center gap-3 border-3 border-white text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base sm:text-lg font-black hover:bg-white/20 transition-all duration-300 shadow-xl backdrop-blur-sm"
                >
                  Learn More
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
