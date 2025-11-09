import Image from 'next/image';

export default function Banner() {
  return (
    <section className="py-20 sm:py-24 md:py-32 bg-green-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* About Adoptrees Section */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="text-sm font-semibold text-green-600 uppercase tracking-wider bg-green-50 px-4 py-2 rounded-full">
                Our Story
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 md:p-16 border border-gray-100">
            <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed mb-8 font-light">
              Founded by <strong className="text-green-700 font-semibold">Dr. Rohith Reddy</strong>, a humanitarian known for saving lives of students battling despair, 
              Adoptrees began as a continuation of compassion. Where once he saved lives through guidance and care, 
              now he saves them by nurturing life itself — the life of the planet.
            </p>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 sm:p-10 my-10 border-l-4 border-green-500">
              <p className="text-2xl sm:text-3xl text-green-800 font-semibold text-center italic leading-relaxed">
                &ldquo;Green is the Colour of Safety.&rdquo;
              </p>
            </div>
            
            <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed font-light">
              Today, Adoptrees unites people across generations — from young dreamers who wish to heal the world 
              to wise elders who wish to give back. Together, we&apos;re building a living legacy that stands tall, 
              gives shade, and sustains hope for centuries.
            </p>
          </div>
        </div>

        {/* Founder Section */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="bg-gradient-to-br from-green-700 via-emerald-700 to-green-800 rounded-3xl p-8 sm:p-12 md:p-16 shadow-2xl border border-green-600 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl -ml-24 -mb-24"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-10 md:gap-12 items-center">
              {/* Founder Photo */}
              <div className="flex-shrink-0">
                <div className="w-56 h-56 md:w-72 md:h-72 rounded-full overflow-hidden shadow-2xl relative">
                  <Image
                    src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762680125/founder_hlkwuv.jpg"
                    alt="Dr. Rohith Reddy - Founder & CEO, Adoptrees"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 224px, 288px"
                    priority
                    quality={90}
                  />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="mb-6">
                  <svg className="w-12 h-12 text-green-300 mb-4 mx-auto md:mx-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>
                <blockquote className="text-2xl sm:text-3xl md:text-4xl text-white italic mb-6 leading-relaxed font-light">
                  &ldquo;When you save a life, you create a story. When you plant a tree, you create a future.&rdquo;
                </blockquote>
                <div className="border-t border-green-400/50 pt-6">
                  <p className="text-xl sm:text-2xl font-bold text-white mb-2">
                    — Dr. Rohith Reddy
                  </p>
                  <p className="text-lg text-white font-medium">
                    Founder & CEO, Adoptrees
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message from Founder */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full">
                Founder&apos;s Message
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              A Message from Our Founder
            </h2>
          </div>
          
          <div className="bg-gradient-to-br from-green-100 via-emerald-100 to-green-100 rounded-3xl p-8 sm:p-12 md:p-16 shadow-2xl border border-green-300 relative">
            {/* Decorative Quote Mark */}
            <div className="absolute top-8 left-8 text-green-200 text-9xl font-serif leading-none">&ldquo;</div>
            
            <div className="relative z-10 space-y-6">
              <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed font-light pl-8">
                I have spent my life saving young lives from giving up on their own stories. 
                In those quiet moments of healing, I learned something powerful — every life needs meaning, 
                and every act needs memory.
              </p>
              <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed font-light pl-8">
                Trees give us both. They grow without asking, they give without taking, and they forgive without limit.
              </p>
              <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed font-light pl-8">
                Adoptrees is my way of teaching the world to give back — not through talk, but through roots. 
                When you plant a tree, you don&apos;t just grow wood and leaves — you grow faith. 
                And when we have faith in the Earth, the Earth heals us back.
              </p>
            </div>
          </div>
        </div>

        {/* Vision, Mission & Philosophy */}
        <div className="max-w-7xl mx-auto mb-24">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider bg-purple-50 px-4 py-2 rounded-full">
                Our Core Values
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Vision, Mission & Philosophy
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
            {/* Vision */}
            <div className="group bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl transition-all duration-300 border border-green-100 hover:border-green-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-green-800 mb-4">Our Vision</h3>
                <p className="text-gray-700 leading-relaxed text-base font-light">
                  To create a world where planting trees becomes as natural as breathing — 
                  where every individual and organization has a piece of land, a piece of green, 
                  and a piece of responsibility that belongs to them.
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="group bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl transition-all duration-300 border border-blue-100 hover:border-blue-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-4">Our Mission</h3>
                <p className="text-gray-700 leading-relaxed mb-4 text-base font-light">
                  Adoptrees exists to create structured, accountable, and soulful reforestation.
                </p>
                <ul className="text-gray-700 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">✓</span>
                    <span>Bounded ecosystem with traceable sections</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">✓</span>
                    <span>Personalized gifting & carbon offsetting</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">✓</span>
                    <span>Lifetime caretakers for each tree</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">✓</span>
                    <span>Digital transparency & growth tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Philosophy */}
            <div className="group bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl transition-all duration-300 border border-amber-100 hover:border-amber-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-4">Our Philosophy</h3>
                <p className="text-gray-700 leading-relaxed mb-4 text-base font-light">
                  We believe that planting trees is not an event — it&apos;s a relationship.
                </p>
                <div className="bg-amber-100/50 rounded-xl p-4 border-l-4 border-amber-400">
                  <p className="text-gray-700 text-base italic leading-relaxed">
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
