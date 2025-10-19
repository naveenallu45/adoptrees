export default function HeroSection() {
  return (
    <section id="about-hero" className="min-h-screen relative overflow-hidden mt-10 bg-gradient-to-br from-purple-600 to-pink-800">
      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center pt-32 translate-y-0.5">
        <div className="container mx-auto px-4 text-center">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            <span className="block">
              About Us
            </span>
            <span className="block text-green-500">
              Our Mission
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-8 drop-shadow-lg font-medium">
            We are passionate about creating a greener future through tree adoption and environmental conservation
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Learn More
            </button>
            <button className="border-2 border-white/80 text-white px-8 py-4 rounded-full text-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Our Story
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
