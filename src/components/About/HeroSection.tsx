export default function HeroSection() {
  return (
    <section id="about-hero" className="min-h-[70vh] sm:min-h-[80vh] md:min-h-screen relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-300 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-[70vh] sm:min-h-[80vh] md:min-h-screen flex items-center justify-center pt-20 sm:pt-24 md:pt-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-4 sm:mb-6 md:mb-8 drop-shadow-2xl tracking-tight">
            <span className="block bg-gradient-to-r from-white via-green-100 to-emerald-100 bg-clip-text text-transparent">
              About Adoptrees
            </span>
          </h1>

          {/* Tagline */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-green-100 font-medium mb-1 sm:mb-2 drop-shadow-lg">
              Planting Lives.
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-green-100 font-medium mb-1 sm:mb-2 drop-shadow-lg">
              Nurturing Hope.
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-green-100 font-medium drop-shadow-lg">
              Sustaining Tomorrow.
            </p>
          </div>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 md:mb-10">
            <div className="w-16 sm:w-24 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
            <div className="mx-3 sm:mx-4 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-green-400"></div>
            <div className="w-16 sm:w-24 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
          </div>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 max-w-3xl sm:max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 drop-shadow-lg px-4 leading-relaxed">
            The greatest monument one can leave behind is a living tree — because trees remember. 
            They breathe your love, carry your name, and tell your story to the wind long after you&apos;re gone.
          </p>

          {/* Scroll Indicator */}
          <div className="absolute bottom-6 sm:bottom-8 md:bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
