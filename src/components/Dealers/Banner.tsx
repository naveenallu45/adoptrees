'use client';

import Link from 'next/link';

export default function Banner() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="text-sm font-semibold text-purple-100 uppercase tracking-wider bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
              For Dealers & Showrooms
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 drop-shadow-lg">
            Strengthen Customer Relationships with Every Purchase
          </h2>
          
          <p className="text-lg sm:text-xl md:text-2xl text-purple-50 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light">
            When you gift a tree adoption with every vehicle purchase, you&apos;re not just closing a sale — 
            you&apos;re creating a meaningful connection. Your customers will remember this thoughtful gesture 
            for years to come, and you&apos;ll be contributing to a greener planet.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/dealers#trees"
              className="inline-flex bg-white text-purple-700 px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Browse Trees
            </Link>
            <Link 
              href="/about"
              className="inline-flex border-2 border-white text-white px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 backdrop-blur-sm"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

