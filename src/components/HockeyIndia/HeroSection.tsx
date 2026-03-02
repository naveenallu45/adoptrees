'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function HeroSection() {
  return (
    <section id="hockey-india-hero" className="mt-16 sm:mt-20 md:mt-24 py-16 sm:py-20 md:py-28 relative overflow-hidden bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[140px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[140px] opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500 rounded-full blur-[140px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => {
          const randomX = (i * 7) % 100;
          const randomY = (i * 11) % 100;
          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${randomX}%`,
                top: `${randomY}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 0.4, 0],
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-20 flex items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Logo and Partnership Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="flex flex-col items-center mb-8 sm:mb-10"
            >
              <motion.div 
                className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 mb-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative w-full h-full rounded-full bg-white/15 backdrop-blur-xl p-4 border-2 border-white/30 shadow-2xl">
                  <Image
                    src="https://instagram.fhyd11-3.fna.fbcdn.net/v/t51.2885-19/470938704_486487727313090_1713076704747062031_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby42MjcuYzIifQ&_nc_ht=instagram.fhyd11-3.fna.fbcdn.net&_nc_cat=106&_nc_oc=Q6cZ2QEgKIQHWrKpT2ulWCg4fdOszz3IV9NvqAYa6kOEY9ZINC_fl3pl7cIRDCea8KoteXgFEeQOeMBjJNJqoPSuc5nF&_nc_ohc=ZcelX1wbcfEQ7kNvwFYwd8S&_nc_gid=d0I5SyuUQHbFEvsFNx0FRg&edm=APoiHPcBAAAA&ccb=7-5&oh=00_Afugje9MrKVRRP7mEH1gLh9JnNU-dpJ5_-6tCq-h7ml_3Q&oe=69A783A0&_nc_sid=22de04"
                    alt="Hockey India Logo"
                    fill
                    className="rounded-full object-cover"
                    priority
                  />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <SparklesIcon className="w-6 h-6 text-yellow-400" />
                </motion.div>
              </motion.div>
              <motion.div 
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/30 rounded-full shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-xs sm:text-sm font-bold text-blue-200 uppercase tracking-wider">
                  Partnership
                </span>
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Adoptrees × Hockey India
                </span>
              </motion.div>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="text-center mb-8 sm:mb-10"
            >
              <motion.h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-6 leading-tight tracking-tight"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <motion.span 
                  className="block mb-2"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Every Goal Scored
                </motion.span>
                <motion.span 
                  className="block bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  Becomes a Tree Planted
                </motion.span>
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="space-y-3 mb-8"
              >
                <p className="text-lg sm:text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto leading-relaxed font-semibold">
                  FIH Hockey World Cup 2026 Qualifiers
                </p>
                
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base md:text-lg text-blue-300 max-w-3xl mx-auto">
                  <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">March 8-14, 2026</span>
                  <span className="text-blue-400">•</span>
                  <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">Gachibowli Stadium</span>
                  <span className="text-blue-400">•</span>
                  <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">Hyderabad, Telangana</span>
                </div>
                
                <motion.p 
                  className="text-xl sm:text-2xl md:text-3xl text-white font-bold italic max-w-3xl mx-auto mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  Every time the net shakes, the Earth breathes 🥅
                </motion.p>
              </motion.div>
            </motion.div>

            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto"
            >
              <motion.div 
                className="group relative bg-white/15 backdrop-blur-xl border-2 border-white/30 rounded-2xl p-6 sm:p-8 text-center hover:bg-white/20 transition-all duration-500 overflow-hidden"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <motion.div 
                    className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.9 }}
                  >
                    50
                  </motion.div>
                  <div className="text-base sm:text-lg text-blue-200 font-bold mb-1">Trees for a PC 🏑</div>
                  <div className="text-xs sm:text-sm text-blue-300 font-medium">1 Penalty Corner = 50 Trees</div>
                </div>
              </motion.div>
              
              <motion.div 
                className="group relative bg-white/15 backdrop-blur-xl border-2 border-white/30 rounded-2xl p-6 sm:p-8 text-center hover:bg-white/20 transition-all duration-500 overflow-hidden"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <motion.div 
                    className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 1 }}
                  >
                    100
                  </motion.div>
                  <div className="text-base sm:text-lg text-blue-200 font-bold mb-1">Trees for a Field Goal! 💯</div>
                  <div className="text-xs sm:text-sm text-blue-300 font-medium">1 Field Goal = 100 Trees</div>
                </div>
              </motion.div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/hockey-india#adoptions"
                  className="group inline-flex items-center gap-3 bg-gradient-to-r from-white to-blue-50 text-blue-900 px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base sm:text-lg font-bold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 relative overflow-hidden"
                >
                  <span className="relative z-10">View Our Impact</span>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/about"
                  className="inline-flex items-center gap-3 border-2 border-white/40 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base sm:text-lg font-bold hover:bg-white/15 transition-all duration-300 backdrop-blur-sm shadow-xl"
                >
                  Learn More
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 bg-white/50 rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
