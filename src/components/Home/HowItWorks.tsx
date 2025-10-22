import Image from 'next/image';

export default function HowItWorks() {
  const steps = [
    {
      title: 'Choose a tree to adopt or gift',
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760798632/WhatsApp_Image_2025-10-18_at_6.14.54_PM_w0v3iq.jpg',
      alt: 'Choose a tree to adopt or gift'
    },
    {
      title: 'A well wisher will plant it for you',
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760798633/WhatsApp_Image_2025-10-18_at_6.15.45_PM_aivxe9.jpg',
      alt: 'A farmer will plant it for you'
    },
    {
      title: 'Track its growth online',
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760798632/WhatsApp_Image_2025-10-18_at_6.16.46_PM_veeafu.jpg',
      alt: 'Track its growth online'
    }
  ];

  return (
    <section id="how-it-works" className="py-[71px] bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Your Tree Adoption Journey
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our mission to create a greener planet with just three easy steps
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col md:flex-row items-center">
              {/* Step Illustration */}
              <div className="flex flex-col items-center text-center max-w-xs">
                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-6 overflow-hidden">
                  <Image
                    src={step.imageUrl}
                    alt={step.alt}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <p className="text-lg font-medium text-gray-700 leading-relaxed">
                  {step.title}
                </p>
              </div>

              {/* Arrow (except for last item) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block mx-8">
                  <svg 
                    className="w-16 h-12 text-green-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3} 
                      d="M17 8l4 4m0 0l-4 4m4-4H3" 
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
