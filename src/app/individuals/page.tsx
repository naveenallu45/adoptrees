import HeroSection from '../../components/Individuals/HeroSection';
import Trees from '../../components/Individuals/Trees';
import Banner from '../../components/Individuals/Banner';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import type { Metadata } from 'next';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Metadata for SEO
export const metadata: Metadata = {
  title: 'Adopt Trees for Individuals | Adoptrees',
  description: 'Browse and adopt trees as an individual. Contribute to environmental sustainability and make a positive impact on our planet.',
};

interface TreeType {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
}

async function getTrees(): Promise<TreeType[]> {
  try {
    await connectDB();
    const trees = await Tree.find({ isActive: true, treeType: 'individual' }).sort({ createdAt: -1 }).lean();
    
    // Convert MongoDB documents to plain objects
    return trees.map((tree) => ({
      _id: String(tree._id),
      name: tree.name,
      price: tree.price,
      info: tree.info,
      oxygenKgs: tree.oxygenKgs,
      imageUrl: tree.imageUrl,
      isActive: tree.isActive
    }));
  } catch (error) {
    console.error('Error fetching trees:', error);
    return [];
  }
}

export default async function Individuals() {
  // Pre-fetch trees on the server
  const trees = await getTrees();

  return (
    <main className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <HeroSection />
      <Trees initialTrees={trees} />
      <Banner />
    </main>
  );
}
