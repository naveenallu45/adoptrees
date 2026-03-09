import HeroSection from '../../components/HockeyIndia/HeroSection';
import FeaturesSection from '../../components/HockeyIndia/FeaturesSection';
import LocationsSection from '../../components/HockeyIndia/LocationsSection';
import MatchesSection from '../../components/HockeyIndia/MatchesSection';
import Banner from '../../components/HockeyIndia/Banner';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import type { Metadata } from 'next';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Metadata for SEO
export const metadata: Metadata = {
  title: 'Hockey India × Adoptrees | FIH Hockey World Cup 2026 Qualifiers',
  description: 'Every goal scored becomes a tree planted! Join Adoptrees and Hockey India in planting trees for every goal scored. 50 trees for a PC, 100 trees for a field goal! Every time the net shakes, the Earth breathes 🥅',
};

interface Adoption {
  _id: string;
  orderId: string;
  userName: string;
  treesCount: number;
  createdAt: Date;
  items: Array<{
    treeName: string;
    quantity: number;
  }>;
}

async function getHockeyIndiaAdoptions(): Promise<Adoption[]> {
  // Skip database connection during build if MONGODB_URI is not available
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI not available during build, returning empty adoptions');
    return [];
  }

  try {
    // Add timeout for build-time database connections
    const connectPromise = connectDB();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 3000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    // Fetch orders that are marked as Hockey India adoptions
    const orders = await Order.find({ 
      userType: 'hockey-india',
      paymentStatus: 'paid'
    })
    .select('orderId userName items createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
    
    return orders.map((order) => ({
      _id: String(order._id),
      orderId: order.orderId,
      userName: order.userName || 'Anonymous',
      treesCount: order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
      createdAt: order.createdAt,
      items: order.items.map((item: { treeName: string; quantity: number }) => ({
        treeName: item.treeName,
        quantity: item.quantity
      }))
    }));
  } catch (error) {
    // During build, if DB is not available, return empty array
    console.warn('Failed to fetch Hockey India adoptions during build:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export default async function HockeyIndia() {
  // Pre-fetch adoptions on the server
  const adoptions = await getHockeyIndiaAdoptions();
  const totalTrees = adoptions.reduce((sum, adoption) => sum + adoption.treesCount, 0);

  return (
    <main className="bg-white">
      <HeroSection />
      <MatchesSection totalTreesOverall={totalTrees} />
      <FeaturesSection />
      <LocationsSection />
      <Banner />
    </main>
  );
}
