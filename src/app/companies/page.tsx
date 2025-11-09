import HeroSection from '../../components/Companies/HeroSection';
import Trees from '../../components/Companies/Trees';
import Banner from '../../components/Companies/Banner';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import type { Metadata } from 'next';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Metadata for SEO
export const metadata: Metadata = {
  title: 'Corporate Tree Adoption Programs | Adoptrees',
  description: 'Premium corporate tree adoption programs for companies. Enhance your CSR initiatives with environmental sustainability and impact tracking.',
};

interface TreeType {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
  packageQuantity?: number;
  packagePrice?: number;
}

async function getTrees(): Promise<TreeType[]> {
  try {
    await connectDB();
    const trees = await Tree.find({ isActive: true, treeType: 'company' }).sort({ createdAt: -1 }).lean();
    
    // Convert MongoDB documents to plain objects
    return trees.map((tree) => ({
      _id: String(tree._id),
      name: tree.name,
      price: tree.price,
      info: tree.info,
      oxygenKgs: tree.oxygenKgs,
      imageUrl: tree.imageUrl,
      isActive: tree.isActive,
      packageQuantity: tree.packageQuantity,
      packagePrice: tree.packagePrice
    }));
  } catch (_error) {
    return [];
  }
}

export default async function Companies() {
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
