import Link from 'next/link';

export default function CreateForestHero() {
  return (
    <section className="min-h-[50vh] sm:min-h-[60vh] relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center pt-28 sm:pt-32 lg:pt-36">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 py-8 sm:py-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 sm:mb-8 drop-shadow-2xl">
          Create Your Forest
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/95 max-w-3xl mx-auto mb-8 sm:mb-12 drop-shadow-lg font-medium px-4">
          Plant trees for special moments. Celebrate life&apos;s milestones while making a lasting impact on our planet.
        </p>
        <div className="flex justify-center">
          <Link 
            href="#moments" 
            className="bg-white text-green-600 px-10 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Create Your Forest
          </Link>
        </div>
      </div>
    </section>
  );
}

