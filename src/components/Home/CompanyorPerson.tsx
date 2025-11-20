'use client';

import Link from 'next/link';

export default function CompanyorPerson() {
  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Left Side - For Individuals */}
        <Link 
          href="/individuals"
          className="group w-full lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 relative flex items-center justify-center min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] transition-all duration-300 hover:from-green-700 hover:to-emerald-800 overflow-hidden"
        >
          {/* Hover overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-700/0 to-emerald-800/0 group-hover:from-green-700/20 group-hover:to-emerald-800/20 transition-all duration-300"></div>
          
          <div className="relative z-10 px-6 sm:px-8 md:px-12 lg:px-16 py-6 sm:py-8 max-w-xl w-full">
            {/* Badge */}
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-5 shadow-lg group-hover:bg-white/30 transition-all duration-300" style={{ fontFamily: 'var(--font-work-sans), sans-serif' }}>
              FOR INDIVIDUALS
            </div>

            {/* Content */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight group-hover:scale-105 transition-transform duration-300">
                <span className="block">Plant a Dream,</span>
                <span className="block">Watch It Grow</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/95 leading-relaxed font-medium max-w-lg">
                A single tree can become your lifelong legacy. Nurture nature today, and let your impact bloom for years to come.
              </p>
              
              {/* CTA Button */}
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-semibold hover:bg-white/30 transition-all duration-300 group-hover:scale-105 shadow-lg">
                  <span>Get Started Now</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Right Side - For Companies */}
        <Link 
          href="/companies"
          className="group w-full lg:w-1/2 bg-gradient-to-br from-green-100 to-emerald-50 relative flex items-center justify-center min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] transition-all duration-300 hover:from-green-200 hover:to-emerald-100 overflow-hidden"
        >
          {/* Hover overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-200/0 to-emerald-100/0 group-hover:from-green-200/30 group-hover:to-emerald-100/30 transition-all duration-300"></div>
          
          <div className="relative z-10 px-6 sm:px-8 md:px-12 lg:px-16 py-6 sm:py-8 max-w-xl w-full">
            {/* Badge */}
            <div className="inline-flex items-center bg-green-200/80 backdrop-blur-sm text-green-800 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-5 shadow-lg border border-green-300/50 group-hover:bg-green-300/90 group-hover:border-green-400/60 transition-all duration-300" style={{ fontFamily: 'var(--font-work-sans), sans-serif' }}>
              FOR COMPANIES
            </div>

            {/* Content */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight group-hover:scale-105 transition-transform duration-300">
                <span className="block">Lead the Change,</span>
                <span className="block">Grow a Sustainable Legacy</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-800 leading-relaxed font-medium max-w-lg">
                Together, we can create meaningful impact. Let your company&apos;s actions speak louder by nurturing trees that protect the future.
              </p>
              
              {/* CTA Button */}
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-semibold hover:bg-green-700 transition-all duration-300 group-hover:scale-105 shadow-lg">
                  <span>Start Partnership</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
