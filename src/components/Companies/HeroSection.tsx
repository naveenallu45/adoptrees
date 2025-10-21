export default function HeroSection() {
  return (
    <section id="companies-hero" className="min-h-[50vh] relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800">
      {/* Content */}
      <div className="relative z-20 min-h-[50vh] flex items-center justify-center pt-32 translate-y-0.5">
        <div className="container mx-auto px-4 text-center">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            <span className="block">
              For Companies
            </span>
            <span className="block text-green-500">
              Corporate Sustainability
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-8 drop-shadow-lg font-medium">
            Partner with us to create a sustainable future and enhance your corporate social responsibility
          </p>
        </div>
      </div>
    </section>
  );
}
