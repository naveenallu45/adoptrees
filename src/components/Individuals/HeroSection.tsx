export default function HeroSection() {
  return (
    <section id="individuals-hero" className="mt-16 sm:mt-20 md:mt-24 min-h-[50vh] sm:min-h-[60vh] md:min-h-[60vh] relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-300 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-[50vh] sm:min-h-[60vh] md:min-h-[60vh] flex items-center justify-center pt-8 sm:pt-12 md:pt-14 lg:pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 sm:mb-8 drop-shadow-2xl tracking-tight">
            <span className="block mb-3 bg-gradient-to-r from-white via-green-100 to-emerald-100 bg-clip-text text-transparent">
              For Individuals
            </span>
            <span className="block text-green-300 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light mt-4">
              Plant Your Future
            </span>
          </h1>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center mb-8 sm:mb-10">
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
            <div className="mx-4 w-2 h-2 rounded-full bg-green-400"></div>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
          </div>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/95 max-w-3xl mx-auto drop-shadow-lg px-4 leading-relaxed font-light">
            Adopt a tree and make a personal contribution to a greener tomorrow. 
            Every tree you plant becomes a living legacy that grows with you.
          </p>
        </div>
      </div>
    </section>
  );
}
