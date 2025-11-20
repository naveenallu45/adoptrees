'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section id="individuals-hero" className="mt-16 sm:mt-20 md:mt-24 min-h-[40vh] sm:min-h-[60vh] md:min-h-[60vh] relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-300 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-[40vh] sm:min-h-[60vh] md:min-h-[60vh] flex items-center justify-center pt-8 sm:pt-12 md:pt-14 lg:pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl tracking-tight">
            <span className="block">
              Plant a Dream,
            </span>
            <span className="block text-green-300 mt-2">
              Watch It Grow
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-lg px-4 leading-relaxed mb-4 sm:mb-6">
            A single tree can become your lifelong legacy.
          </p>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-lg px-4 leading-relaxed mb-6 sm:mb-8">
            Nurture nature today, and let your impact bloom for years to come.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link 
              href="/individuals#trees"
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:scale-105 border border-white/30"
            >
              Browse Trees
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
