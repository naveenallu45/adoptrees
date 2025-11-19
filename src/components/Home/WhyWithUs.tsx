import Image from 'next/image';

export default function WhyWithUs() {
  const features = [
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804072/ChatGPT_Image_Oct_18_2025_09_30_34_PM_lafxma.png',
      title: 'Impact You Can Feel',
      description: 'Every tree you plant is real, traceable, and nurtured. See its exact location and photo updates — your kindness growing in the soil.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804068/ChatGPT_Image_Oct_18_2025_09_30_36_PM_btbros.png',
      title: 'Stay Connected to Your Tree',
      description: 'Watch your tree\'s journey unfold through our app. Milestones, growth moments, and life updates — all in real time.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804061/ChatGPT_Image_Oct_18_2025_09_30_39_PM_wppekx.png',
      title: 'Growing a Greener India',
      description: 'Your tree becomes part of India\'s reforestation story. Together, we rebuild green cover where it\'s needed the most.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804064/ChatGPT_Image_Oct_18_2025_09_26_53_PM_spnwqh.png',
      title: 'Change Starts With Community',
      description: 'Join thousands of eco-minded individuals planting hope. Your tree adds strength to a movement creating meaningful change.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804064/ChatGPT_Image_Oct_18_2025_09_26_57_PM_aorura.png',
      title: 'Partners You Can Trust',
      description: 'We collaborate only with verified farmers and environmental groups, ensuring every tree is cared for with love and responsibility.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804072/ChatGPT_Image_Oct_18_2025_09_27_01_PM_ccsq8d.png',
      title: 'Transparent at Every Step',
      description: 'From planting to growth, you see everything. Your contribution, your tree, your impact — always clear and open.'
    }
  ];

  return (
    <section className="py-18 bg-gradient-to-br from-green-600  to-green-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-100 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-50 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-tight">
            Why Plant With Us?
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-3xl p-6 border-2 border-gray-100 hover:border-green-300 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-105"
            >
              {/* Background Gradient on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-700 opacity-0 group-hover:opacity-90 transition-opacity duration-500 rounded-3xl"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-6 group-hover:from-green-200 group-hover:to-emerald-300 transition-all duration-500 shadow-lg group-hover:shadow-xl overflow-hidden">
                  <Image
                    src={feature.imageUrl}
                    alt={feature.title}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl lg:text-2xl font-black text-gray-900 group-hover:text-white mb-4 transition-colors duration-300 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-600 group-hover:text-green-100 leading-relaxed text-base lg:text-lg font-medium transition-colors duration-300">
                  {feature.description}
                </p>
              </div>

              {/* Decorative Element */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
