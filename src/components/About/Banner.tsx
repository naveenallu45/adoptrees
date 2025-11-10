import Image from 'next/image';

export default function Banner() {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-green-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Founder Section */}
        <div className="max-w-5xl mx-auto mb-16 sm:mb-20 md:mb-24">
          <div className="bg-gradient-to-br from-green-700 via-emerald-700 to-green-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 shadow-2xl border border-green-600 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-green-500/20 rounded-full blur-3xl -mr-24 sm:-mr-32 -mt-24 sm:-mt-32"></div>
            <div className="absolute bottom-0 left-0 w-36 sm:w-48 h-36 sm:h-48 bg-emerald-500/20 rounded-full blur-3xl -ml-18 sm:-ml-24 -mb-18 sm:-mb-24"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center">
              {/* Founder Photo */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden shadow-2xl relative mx-auto md:mx-0">
                  <Image
                    src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762680125/founder_hlkwuv.jpg"
                    alt="Dr. Rohith Reddy - Founder & CEO, Adoptrees"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, (max-width: 1024px) 256px, 288px"
                    priority
                    quality={90}
                  />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4 sm:mb-6">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-300 mb-3 sm:mb-4 mx-auto md:mx-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>
                <blockquote className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white italic mb-4 sm:mb-6 leading-relaxed">
                  &ldquo;When you save a life, you create a story. When you plant a tree, you create a future.&rdquo;
                </blockquote>
                <div className="border-t border-green-400/50 pt-4 sm:pt-6">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">
                    — Dr. Rohith Reddy
                  </p>
                  <p className="text-base sm:text-lg text-white font-medium">
                    Founder & CEO, Adoptrees
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Adoptrees Section */}
        <div className="max-w-5xl mx-auto mb-16 sm:mb-20 md:mb-24">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-block mb-3 sm:mb-4">
              <span className="text-sm sm:text-base md:text-lg font-semibold text-white uppercase tracking-wider bg-green-700 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full border border-green-500 shadow-sm">
                Our Story
              </span>
            </div>
          </div>
          
          <div className="bg-green-800/50 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-6 sm:p-8 md:p-12 lg:p-16 border border-green-700">
            <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed mb-6 sm:mb-8">
              Founded by <strong className="text-white font-bold">Dr. Rohith Reddy</strong>, a humanitarian known for saving lives of students battling despair, 
              Adoptrees began as a continuation of compassion. Where once he saved lives through guidance and care, 
              now he saves them by nurturing life itself — the life of the planet.
            </p>
            
            <div className="bg-gradient-to-r from-green-700 to-emerald-700 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 my-6 sm:my-8 md:my-10 border-l-4 border-green-400">
              <p className="text-xl sm:text-2xl md:text-3xl text-white font-semibold text-center italic leading-relaxed">
                &ldquo;Green is the Colour of Safety.&rdquo;
              </p>
            </div>
            
            <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed">
              Today, Adoptrees unites people across generations — from young dreamers who wish to heal the world 
              to wise elders who wish to give back. Together, we&apos;re building a living legacy that stands tall, 
              gives shade, and sustains hope for centuries.
            </p>
          </div>
        </div>

        {/* Message from Founder */}
        <div className="max-w-5xl mx-auto mb-16 sm:mb-20 md:mb-24">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-block mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider bg-green-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-green-500 shadow-sm">
                Founder&apos;s Message
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4">
              A Message from Our Founder
          </h2>
          </div>
          
          <div className="bg-green-800/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 shadow-2xl border border-green-700 relative">
            {/* Decorative Quote Mark */}
            <div className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8 text-green-400 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif leading-none opacity-30">&ldquo;</div>
            
            <div className="relative z-10 space-y-4 sm:space-y-5 md:space-y-6">
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white leading-relaxed pl-6 sm:pl-8">
                I have spent my life saving young lives from giving up on their own stories. 
                In those quiet moments of healing, I learned something powerful — every life needs meaning, 
                and every act needs memory.
              </p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white leading-relaxed pl-6 sm:pl-8">
                Trees give us both. They grow without asking, they give without taking, and they forgive without limit.
              </p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white leading-relaxed pl-6 sm:pl-8">
                Adoptrees is my way of teaching the world to give back — not through talk, but through roots. 
                When you plant a tree, you don&apos;t just grow wood and leaves — you grow faith. 
                And when we have faith in the Earth, the Earth heals us back.
              </p>
            </div>
          </div>
        </div>

        {/* Vision, Mission & Philosophy */}
        <div className="max-w-7xl mx-auto mb-16 sm:mb-20 md:mb-24">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <div className="inline-block mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider bg-green-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-green-500 shadow-sm">
                Our Core Values
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4">
              Vision, Mission & Philosophy
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {/* Vision */}
            <div className="bg-green-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7 shadow-xl border border-green-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-green-600/30 rounded-full blur-2xl -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
              <div className="relative z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">Our Vision</h3>
                <p className="text-green-100 leading-relaxed text-sm sm:text-base">
                  To create a world where planting trees becomes as natural as breathing — 
                  where every individual and organization has a piece of land, a piece of green, 
                  and a piece of responsibility that belongs to them.
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-green-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7 shadow-xl border border-green-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-green-600/30 rounded-full blur-2xl -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
              <div className="relative z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">Our Mission</h3>
                <p className="text-green-100 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                  Adoptrees exists to create structured, accountable, and soulful reforestation.
                </p>
                <ul className="text-green-100 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start">
                    <span className="text-green-300 mr-2 sm:mr-3 mt-0.5 sm:mt-1">✓</span>
                    <span>Bounded ecosystem with traceable sections</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-300 mr-2 sm:mr-3 mt-0.5 sm:mt-1">✓</span>
                    <span>Personalized gifting & carbon offsetting</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-300 mr-2 sm:mr-3 mt-0.5 sm:mt-1">✓</span>
                    <span>Lifetime caretakers for each tree</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-300 mr-2 sm:mr-3 mt-0.5 sm:mt-1">✓</span>
                    <span>Digital transparency & growth tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Philosophy */}
            <div className="bg-green-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7 shadow-xl border border-green-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-green-600/30 rounded-full blur-2xl -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
              <div className="relative z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">Our Philosophy</h3>
                <p className="text-green-100 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                  We believe that planting trees is not an event — it&apos;s a relationship.
                </p>
                <div className="bg-green-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-l-4 border-green-400">
                  <p className="text-white text-sm sm:text-base italic leading-relaxed">
                    What we plant, we become. What we nurture, nurtures us. What we leave behind, defines who we were.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
