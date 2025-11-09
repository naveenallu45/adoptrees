import Image from 'next/image';
import Link from 'next/link';

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
        quality={85}
        sizes="100vw"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      />
      
      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content with higher z-index */}
      <div className="relative z-20 min-h-screen flex items-center justify-center pt-12 sm:pt-14 md:pt-16 lg:pt-18 translate-y-0.5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl">
            <span className="block">
              Plant a Tree,
            </span>
            <span className="block text-green-500">
              Make a Difference
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white max-w-2xl sm:max-w-3xl mx-auto mb-6 sm:mb-8 drop-shadow-lg font-medium px-4">
            Adopt a tree or gift one to a friend and contribute to Greener India
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <Link href="/individuals" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-center">
              Adopt Your Tree
            </Link>
            <Link href="/individuals" className="w-full sm:w-auto border-2 border-white/80 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 text-center">
              Gift a Tree
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
