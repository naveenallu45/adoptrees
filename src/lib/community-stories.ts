export interface CommunityStory {
  title: string;
  name: string;
  location: string;
  profileImage: string;
  description: string;
  tags: Array<{
    label: string;
    icon: string;
    color: string;
  }>;
}

export const communityStories: CommunityStory[] = [
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

