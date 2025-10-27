export default function HeroSection() {
  return (
    <section id="about-hero" className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-600 to-pink-800">
      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center pt-12 sm:pt-14 md:pt-16 lg:pt-18 translate-y-0.5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl">
            <span className="block">
              About Us
            </span>
            <span className="block text-green-500">
              Our Mission
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white max-w-2xl sm:max-w-3xl mx-auto mb-6 sm:mb-8 drop-shadow-lg font-medium px-4">
            We are passionate about creating a greener future through tree adoption and environmental conservation
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Learn More
            </button>
            <button className="w-full sm:w-auto border-2 border-white/80 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Our Story
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
