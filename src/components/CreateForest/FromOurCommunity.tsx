import Image from 'next/image';

const communityStories = [
  {
    title: 'Wedding Occasion',
    name: 'Prahassan Reddy & Soumya',
    location: 'Hyderabad, Telangana',
    profileImage: 'https://res.cloudinary.com/diw4nxv3k/image/upload/v1764483494/WhatsApp_Image_2025-11-28_at_7.21.47_PM_ugmude.jpg',
    description: 'No party favors this time — instead, we planted 50 trees! They\'ll grow over time, just like our love. If you\'d like to give us a gift, plant a few trees yourself and help our Forest keep growing!',
    tags: [
      { label: 'Wedding', icon: '💍', color: 'bg-orange-100 text-orange-700 border-orange-300' },
      { label: '50 trees planted', icon: '🌿', color: 'bg-green-100 text-green-700 border-green-300' }
    ]
  },
  {
    title: 'Wedding Occasion',
    name: 'Deshik & Samardita',
    location: 'Bengaluru, Karnataka',
    profileImage: 'https://res.cloudinary.com/diw4nxv3k/image/upload/v1764484891/WhatsApp_Image_2025-11-30_at_12.06.22_PM_wnlqbp.jpg',
    description: 'We wanted our \'forever\' to begin with something meaningful. Planting trees for our wedding felt like the perfect symbol — roots, growth, and a future we build together.',
    tags: [
      { label: 'Wedding', icon: '💍', color: 'bg-orange-100 text-orange-700 border-orange-300' },
      { label: '62 trees planted', icon: '🌿', color: 'bg-green-100 text-green-700 border-green-300' }
    ]
  },
  {
    title: 'Graduation Done',
    name: 'Kaushal Saha',
    location: 'Visakhapatnam, Andhra Pradesh',
    profileImage: 'https://res.cloudinary.com/diw4nxv3k/image/upload/v1764484891/WhatsApp_Image_2025-11-30_at_12.07.49_PM_e1e5mw.jpg',
    description: 'We did it! To mark this milestone, I\'ve decided to plant trees.',
    tags: [
      { label: 'Graduation', icon: '🎓', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
      { label: '85 trees planted', icon: '🌿', color: 'bg-green-100 text-green-700 border-green-300' }
    ]
  },
  {
    title: 'Eyy Happy Birthday',
    name: 'Arjun',
    location: 'Tirupati, Andhra Pradesh',
    profileImage: 'https://res.cloudinary.com/diw4nxv3k/image/upload/v1764484887/WhatsApp_Image_2025-11-30_at_12.10.14_PM_p63agi.jpg',
    description: 'Another year older — and hopefully wiser! This year, I wanted to begin by doing something good for the planet. I\'ve planted 37 trees, one for each candle.',
    tags: [
      { label: 'Birthday', icon: '🎉', color: 'bg-red-100 text-red-700 border-red-300' },
      { label: '37 trees planted', icon: '🌿', color: 'bg-green-100 text-green-700 border-green-300' }
    ]
  }
];

export default function FromOurCommunity() {
  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <div className="text-sm sm:text-base font-semibold text-green-600 uppercase tracking-wide mb-4">
            FROM OUR COMMUNITY
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 sm:mb-8">
            Here&apos;s who chose to celebrate by planting trees
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            To celebrate a graduation, commemorate a birth, or share the joy of a wedding: there are many occasions for creating your own Forest. Involve your loved ones and make a tangible gesture for the planet.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-6xl mx-auto">
          {communityStories.map((story, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start space-x-4 sm:space-x-6 mb-4 sm:mb-6">
                  {/* Profile Image */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-200 relative">
                      <Image
                        src={story.profileImage}
                        alt={story.name}
                        fill
                        className="object-cover saturate-125 contrast-110"
                        style={{ objectPosition: 'top center' }}
                      />
                    </div>
                  </div>
                  
                  {/* Title and Description */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">{story.title}</p>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                      {story.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">{story.location}</p>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 sm:mb-6">
                      {story.description}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {story.tags.map((tag, tagIndex) => (
                        <div
                          key={tagIndex}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${tag.color}`}
                        >
                          <span>{tag.icon}</span>
                          <span>{tag.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

