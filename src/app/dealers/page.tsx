import HeroSection from '../../components/Dealers/HeroSection';
import Trees from '../../components/Dealers/Trees';
import Banner from '../../components/Dealers/Banner';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import type { Metadata } from 'next';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Metadata for SEO
export const metadata: Metadata = {
  title: 'Tree Adoption for Dealers & Showrooms | Adoptrees',
  description: 'Gift tree adoptions to your customers with every vehicle purchase. Strengthen relationships and contribute to environmental sustainability.',
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
    const trees = await Tree.find({ isActive: true, treeType: 'dealer' }).sort({ createdAt: -1 }).lean();
    
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
  } catch (_error) {
    return [];
  }
}

export default async function Dealers() {
  // Pre-fetch trees on the server
  const trees = await getTrees();

  return (
    <main className="bg-white">
      <HeroSection />
      <Trees initialTrees={trees} />
      <Banner />
    </main>
  );
}

