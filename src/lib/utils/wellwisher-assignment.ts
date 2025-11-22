// Server-side utility for well-wisher assignment
// This file should only be imported in server-side code (API routes)

import User from '@/models/User';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';

/**
 * Assigns a well-wisher to an order using equal distribution algorithm
 * This ensures tasks are distributed evenly among all available well-wishers
 */
export async function assignWellWisherEqually(): Promise<string | null> {
  try {
    // Ensure database connection
    await connectDB();
    
    // Get all available well-wishers
    const wellWishers = await User.find({ role: 'wellwisher' }).select('_id');
    
    if (wellWishers.length === 0) {
      return null;
    }

    // Count orders assigned to each well-wisher
    const orderCounts = await Order.aggregate([
      {
        $match: {
          assignedWellwisher: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedWellwisher',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of well-wisher ID to order count
    const countMap = new Map<string, number>();
    orderCounts.forEach((item) => {
      countMap.set(item._id.toString(), item.count);
    });

    // Initialize counts for well-wishers with no orders
    wellWishers.forEach((ww) => {
      const id = ww._id.toString();
      if (!countMap.has(id)) {
        countMap.set(id, 0);
      }
    });

    // Find well-wisher with minimum order count
    let minCount = Infinity;
    let selectedWellWisher: string | null = null;

    for (const wellWisher of wellWishers) {
      const id = wellWisher._id.toString();
      const count = countMap.get(id) || 0;
      
      if (count < minCount) {
        minCount = count;
        selectedWellWisher = id;
      }
    }

    // If multiple well-wishers have the same minimum count, use round-robin
    // by selecting the first one found (or could use random selection)
    if (selectedWellWisher) {
      return selectedWellWisher;
    }

    // Fallback: return first well-wisher if something goes wrong
    return wellWishers[0]?._id.toString() || null;
  } catch (error) {
    console.error('Error assigning well-wisher equally:', error);
    // Fallback: return first available well-wisher
    const fallbackWellWisher = await User.findOne({ role: 'wellwisher' }).select('_id');
    return fallbackWellWisher?._id.toString() || null;
  }
}

