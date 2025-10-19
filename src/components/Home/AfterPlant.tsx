'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AfterPlant() {
  const [activeTab, setActiveTab] = useState('individuals');

  const phoneImages = {
    individuals: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760844979/ChatGPT_Image_Oct_18__2025__09_49_46_PM-removebg-preview_ju8rvr.png',
    companies: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1760844979/ChatGPT_Image_Oct_18__2025__09_49_55_PM-removebg-preview_cv2szo.png'
  };

  const individualsContent = {
    features: [
      {
        title: 'Tree certificate',
        description: 'Find out all about your tree: log on to its page for full information, including a photo and its GPS coordinates.',
        icon: '📍',
        position: 'left'
      },
      {
        title: 'Real trees, real impact',
        description: 'Whoever receives a tree gets access to MyTreedom, our online community where you will find updates, articles and quizzes on the world of sustainability.',
        icon: '🌱',
        position: 'right'
      },
      {
        title: 'CO₂ and Timeline',
        description: 'Follow the most important moments in your tree\'s life, find out how much CO₂ it absorbs and its botanical characteristics.',
        icon: '📊',
        position: 'left'
      },
      {
        title: 'A special gift',
        description: 'Reach anyone, anytime, with a thought that goes straight to the heart.',
        icon: '🎁',
        position: 'right'
      }
    ]
  };

  const companiesContent = {
    features: [
      {
        title: 'Start your sustainability journey',
        description: 'With Treedom you do good for the planet and for people.',
        icon: '🌍',
        position: 'left'
      },
      {
        title: 'Communicate your commitment',
        description: 'By planting trees you will have access to communication materials, photos and videos with which to communicate your commitment.',
        icon: '📢',
        position: 'right'
      },
      {
        title: 'Reach your business goals',
        description: 'Trees are valuable allies to achieve your business goals in a sustainable way.',
        icon: '⭐',
        position: 'left'
      },
      {
        title: 'Make a sustainable gift',
        description: 'Customers and employees who receive a tree as a gift will start a journey of discovery of the projects we support together.',
        icon: '🎁',
        position: 'right'
      }
    ]
  };

  const currentContent = activeTab === 'individuals' ? individualsContent : companiesContent;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-8 leading-tight">
            And after you plant, what happens?
          </h2>
          
          {/* Toggle Switch */}
          <div className="inline-flex items-center bg-gray-800 rounded-full p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('individuals')}
              className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                activeTab === 'individuals'
                  ? 'bg-white text-gray-800 shadow-md'
                  : 'text-white hover:text-gray-200'
              }`}
            >
              For individuals
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                activeTab === 'companies'
                  ? 'bg-white text-gray-800 shadow-md'
                  : 'text-white hover:text-gray-200'
              }`}
            >
              For companies
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative max-w-6xl mx-auto min-h-[700px] flex items-center justify-center">
          {/* Central Phone Images */}
          <div className="relative z-10 hidden lg:block">
            <Image
              src={phoneImages[activeTab as keyof typeof phoneImages]}
              alt={`${activeTab} phone interface`}
              width={400}
              height={600}
              className=""
              priority
            />
          </div>

          {/* Feature Callouts */}
          {/* Top Left */}
          <div className="absolute top-16 left-8 max-w-xs text-right hidden lg:block">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentContent.features[0].title}
            </h3>
            <p className="text-gray-600 text-base leading-relaxed">
              {currentContent.features[0].description}
            </p>
          </div>

          {/* Top Right */}
          <div className="absolute top-16 right-8 max-w-xs text-left hidden lg:block">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentContent.features[1].title}
            </h3>
            <p className="text-gray-600 text-base leading-relaxed">
              {currentContent.features[1].description}
            </p>
          </div>

          {/* Bottom Left */}
          <div className="absolute bottom-16 left-8 max-w-xs text-right hidden lg:block">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentContent.features[2].title}
            </h3>
            <p className="text-gray-600 text-base leading-relaxed">
              {currentContent.features[2].description}
            </p>
          </div>

          {/* Bottom Right */}
          <div className="absolute bottom-16 right-8 max-w-xs text-left hidden lg:block">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentContent.features[3].title}
            </h3>
            <p className="text-gray-600 text-base leading-relaxed">
              {currentContent.features[3].description}
            </p>
          </div>

          {/* Mobile Features (shown only on mobile) */}
          <div className="lg:hidden mt-16 space-y-8">
            {currentContent.features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
