import Image from 'next/image';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section id="home" className="min-h-screen relative overflow-hidden pt-33">
      {/* Background Image - Mobile */}
      <div className="block md:hidden absolute inset-0">
        <Image
          src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
          alt="Tree planting background"
          fill
          className="object-cover"
          priority
          quality={85}
          sizes="100vw"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        />
      </div>
      
      {/* Background Image - Desktop/Laptop */}
      <div className="hidden md:block absolute inset-0">
        <Image
          src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763884180/ChatGPT_Image_Nov_23_2025_at_01_13_52_PM_h3ylqf.png"
          alt="Tree planting background"
          fill
          className="object-cover"
          priority
          quality={85}
          sizes="100vw"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        />
      </div>
      
      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content with higher z-index */}
      <div className="relative z-20 min-h-screen flex items-center justify-center pt-12 sm:pt-14 md:pt-16 lg:pt-18 translate-y-0.5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl">
            <span className="block">
              Plant a Tree,
            </span>
            <span className="block text-green-500">
              Touch a Life
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white max-w-2xl sm:max-w-3xl mx-auto mb-6 sm:mb-8 drop-shadow-lg font-medium px-4">
            Adopt a tree, gift one to someone you care for, and connect with Eco Friends in our community. Every tree brings India one step closer to a greener future.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <Link href="/individuals" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-center">
              Adopt Your Tree
            </Link>
            <Link href="/individuals" className="w-full sm:w-auto border-2 border-white/80 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 text-center">
              Gift a Tree
            </Link>
            <Link href="/eco-community" className="w-full sm:w-auto border-2 border-emerald-300/90 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm hover:bg-emerald-500/25 transition-all duration-300 shadow-lg hover:scale-105 text-center">
              Eco Community
            </Link>
            <Link 
              href="/hockey-india"
              className="w-full sm:w-auto border-2 border-white/80 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 text-center inline-flex items-center justify-center gap-2"
            >
              <span className="text-lg sm:text-xl">🏑</span>
              <span>Hockey India</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
