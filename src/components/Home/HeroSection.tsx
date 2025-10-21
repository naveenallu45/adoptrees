import Image from 'next/image';

export default function HeroSection() {
  return (
    <section id="home" className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <Image
        src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760799467/pexels-leiliane-dutra-1841922-11130997_eqyprh.jpg"
        alt="Tree planting background"
        fill
        className="object-cover"
        priority
      />
      
      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content with higher z-index */}
      <div className="relative z-20 min-h-screen flex items-center justify-center pt-32 translate-y-0.5">
        <div className="container mx-auto px-4 text-center">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            <span className="block">
              Plant a Tree,
            </span>
            <span className="block text-green-500">
              Make a Difference
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-8 drop-shadow-lg font-medium">
            Adopt a tree or gift one to a friend and contribute to Greener India
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Adopt Your Tree
            </button>
            <button className="border-2 border-white/80 text-white px-8 py-4 rounded-full text-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Gift a Tree
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
