import Image from 'next/image';

export default function WhyWithUs() {
  const features = [
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804072/ChatGPT_Image_Oct_18_2025_09_30_34_PM_lafxma.png',
      title: 'Verified Impact',
      description: 'Every tree planted is tracked and verified with GPS coordinates and regular photo updates.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804068/ChatGPT_Image_Oct_18_2025_09_30_36_PM_btbros.png',
      title: 'Digital Tracking',
      description: 'Monitor your tree\'s growth through our mobile app with real-time updates and milestones.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804061/ChatGPT_Image_Oct_18_2025_09_30_39_PM_wppekx.png',
      title: 'Green India',
      description: 'Plant trees across India and contribute to reforestation efforts throughout the country.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804064/ChatGPT_Image_Oct_18_2025_09_26_53_PM_spnwqh.png',
      title: 'Community Impact',
      description: 'Join thousands of eco-warriors making a difference and creating lasting environmental change.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804064/ChatGPT_Image_Oct_18_2025_09_26_57_PM_aorura.png',
      title: 'Certified Partners',
      description: 'Work with certified farmers and environmental organizations for maximum impact.'
    },
    {
      imageUrl: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760804072/ChatGPT_Image_Oct_18_2025_09_27_01_PM_ccsq8d.png',
      title: 'Transparent Process',
      description: 'Complete transparency in how your contribution is used and the impact it creates.'
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
          <p className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
            We make tree planting simple, transparent, and impactful. Join our mission to create 
            a greener planet with verified results and lasting change.
          </p>
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
