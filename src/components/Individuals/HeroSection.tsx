export default function HeroSection() {
  return (
    <section id="individuals-hero" className="min-h-[50vh] relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-800">
      {/* Content */}
      <div className="relative z-20 min-h-[50vh] flex items-center justify-center pt-12 sm:pt-14 md:pt-16 lg:pt-18 translate-y-0.5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl">
            <span className="block">
              For Individuals
            </span>
            <span className="block text-green-500">
              Plant Your Future
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white max-w-2xl sm:max-w-3xl mx-auto mb-6 sm:mb-8 drop-shadow-lg font-medium px-4">
            Adopt a tree and make a personal contribution to a greener tomorrow
          </p>
        </div>
      </div>
    </section>
  );
}
