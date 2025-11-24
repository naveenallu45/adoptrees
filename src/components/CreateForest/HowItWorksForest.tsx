import Image from 'next/image';

const steps = [
  {
    title: 'Plant trees',
    description: 'What forest would be without trees? Start by planting one of the mixes we have prepared for you, with the right balance of forest and fruit species.',
    illustration: (
      <div className="relative w-full h-64 sm:h-72 md:h-80 flex items-center justify-center">
        <div className="relative w-full max-w-md">
          {/* Stacked tree cards with images */}
          <div className="absolute -top-4 -left-4 w-32 h-40 sm:w-36 sm:h-44 bg-white rounded-xl shadow-xl border-2 border-green-200 overflow-hidden transform rotate-3 z-10">
            <div className="relative w-full h-3/4">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Tree mix 5"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, 144px"
              />
            </div>
            <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md z-20">
              5
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-2 py-1 text-center">
              <span className="text-[10px] font-semibold text-gray-700">Mix 5</span>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-32 h-40 sm:w-36 sm:h-44 bg-white rounded-xl shadow-xl border-2 border-green-200 overflow-hidden transform -rotate-2 z-20">
            <div className="relative w-full h-3/4">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Tree mix 10"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, 144px"
              />
            </div>
            <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md z-20">
              10
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-2 py-1 text-center">
              <span className="text-[10px] font-semibold text-gray-700">Mix 10</span>
            </div>
          </div>
          <div className="relative w-32 h-40 sm:w-36 sm:h-44 bg-white rounded-xl shadow-xl border-2 border-green-300 overflow-hidden z-30 ml-auto mr-8">
            <div className="relative w-full h-3/4">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Tree selection"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, 144px"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-green-500 px-2 py-2 text-center">
              <span className="text-[10px] font-bold text-white">Your Forest</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Customize',
    description: 'Let everyone know why you decided to create your Forest: give it a name, choose the cover image, and write a brief description to tell its story.',
    illustration: (
      <div className="relative w-full h-64 sm:h-72 md:h-80 flex items-center justify-center">
        <div className="relative w-full max-w-md">
          {/* Central forest card */}
          <div className="relative w-48 h-56 sm:w-56 sm:h-64 bg-white rounded-xl shadow-xl border-2 border-green-200 overflow-hidden mx-auto">
            <div className="relative w-full h-3/4">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Forest customization"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 192px, 224px"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                  <span className="text-xs">🌳</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">Priya&apos;s Birthday Forest</span>
              </div>
            </div>
          </div>
          
          {/* Occasion badge */}
          <div className="absolute -top-3 right-4 sm:right-8 bg-white rounded-lg shadow-lg border-2 border-green-300 px-3 py-1.5 flex items-center space-x-1.5 z-10">
            <span className="text-green-600 text-xs">🎉</span>
            <span className="text-xs font-semibold text-gray-800">Priya&apos;s Birthday</span>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          
          {/* Cover image selector */}
          <div className="absolute -bottom-2 -left-6 w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-lg shadow-lg border-2 border-yellow-300 overflow-hidden z-10">
            <Image
              src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
              alt="Cover option"
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
          
          {/* Arrow indicators */}
          <svg className="absolute -top-1 -left-3 w-6 h-6 text-green-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H3" />
          </svg>
        </div>
      </div>
    )
  },
  {
    title: 'Share it with your friends',
    description: 'This story deserves to be told! Share your Forest on social media and invite your friends to plant more trees to make it grow.',
    illustration: (
      <div className="relative w-full h-64 sm:h-72 md:h-80 flex items-center justify-center">
        <div className="relative w-full max-w-sm space-y-2">
          {/* Friend cards with Andhra Pradesh names */}
          <div className="w-full max-w-xs mx-auto bg-white rounded-xl shadow-lg border-2 border-green-200 flex items-center space-x-3 p-3 hover:shadow-xl transition-all duration-300">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-blue-300 flex-shrink-0">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Rajesh Kumar"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 48px, 56px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-semibold text-gray-800 truncate">Rajesh Kumar</div>
              <div className="text-xs text-gray-500">Visakhapatnam, AP</div>
            </div>
            <div className="bg-green-100 rounded-full px-3 py-1.5 flex items-center space-x-1.5 flex-shrink-0 border border-green-300">
              <span className="text-green-600 text-sm">🌳</span>
              <span className="text-green-700 text-sm font-bold">3</span>
            </div>
          </div>
          
          <div className="w-full max-w-xs mx-auto bg-white rounded-xl shadow-lg border-2 border-green-200 flex items-center space-x-3 p-3 hover:shadow-xl transition-all duration-300">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-pink-300 flex-shrink-0">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Lakshmi Priya"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 48px, 56px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-semibold text-gray-800 truncate">Lakshmi Priya</div>
              <div className="text-xs text-gray-500">Vijayawada, AP</div>
            </div>
            <div className="bg-green-100 rounded-full px-3 py-1.5 flex items-center space-x-1.5 flex-shrink-0 border border-green-300">
              <span className="text-green-600 text-sm">🌳</span>
              <span className="text-green-700 text-sm font-bold">1</span>
            </div>
          </div>
          
          <div className="w-full max-w-xs mx-auto bg-white rounded-xl shadow-lg border-2 border-green-200 flex items-center space-x-3 p-3 hover:shadow-xl transition-all duration-300">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-purple-300 flex-shrink-0">
              <Image
                src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763958836/ChatGPT_Image_Nov_24_2025_at_10_03_00_AM_uw0uhc.png"
                alt="Srinivas Reddy"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 48px, 56px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-semibold text-gray-800 truncate">Srinivas Reddy</div>
              <div className="text-xs text-gray-500">Guntur, AP</div>
            </div>
            <div className="bg-green-100 rounded-full px-3 py-1.5 flex items-center space-x-1.5 flex-shrink-0 border border-green-300">
              <span className="text-green-600 text-sm">🌳</span>
              <span className="text-green-700 text-sm font-bold">8</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

export default function HowItWorksForest() {
  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[#f5f5f0]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 sm:mb-8">
            How it works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Creating a Forest is a simple gesture. It only takes a moment, but the memory will last forever – for you and for those who take part by planting a tree.
          </p>
        </div>

        {/* Steps */}
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:grid md:grid-cols-3 md:gap-12 lg:gap-16 md:overflow-visible md:pb-0 md:mx-0 md:px-0 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-start text-left bg-white/80 rounded-3xl shadow-lg md:shadow-none md:bg-transparent snap-center min-w-[85%] sm:min-w-[65%] md:min-w-0 p-6 md:p-0"
            >
              {/* Illustration */}
              <div className="mb-6 sm:mb-8 w-full">
                {step.illustration}
              </div>
              
              {/* Title */}
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 md:text-center md:w-full">
                {step.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed md:text-center md:w-full">
                {step.description}
              </p>

              {/* CTA Button for Customize step */}
              {index === 1 && (
                <div className="mt-6 md:self-center">
                  <a
                    href="/individuals"
                    className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Start now
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



