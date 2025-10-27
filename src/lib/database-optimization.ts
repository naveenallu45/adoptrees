/**
 * Database optimization utilities and index recommendations
 */

import connectDB from './mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import Tree from '@/models/Tree';

/**
 * Create database indexes for optimal performance
 */
export async function createDatabaseIndexes() {
  try {
    await connectDB();
    
    console.log('Creating database indexes...');
    
    // User model indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ userType: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ email: 1, role: 1 }); // Compound index
    
    // Order model indexes
    await Order.collection.createIndex({ orderId: 1 }, { unique: true });
    await Order.collection.createIndex({ userId: 1 });
    await Order.collection.createIndex({ userEmail: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ userType: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    await Order.collection.createIndex({ totalAmount: -1 });
    await Order.collection.createIndex({ isGift: 1 });
    await Order.collection.createIndex({ 'items.treeName': 'text' }); // Text search
    await Order.collection.createIndex({ 
      status: 1, 
      userType: 1, 
      createdAt: -1 
    }); // Compound index for admin queries
    
    // Tree model indexes
    await Tree.collection.createIndex({ name: 1 });
    await Tree.collection.createIndex({ price: 1 });
    await Tree.collection.createIndex({ treeType: 1 });
    await Tree.collection.createIndex({ isActive: 1 });
    await Tree.collection.createIndex({ createdAt: -1 });
    await Tree.collection.createIndex({ 
      treeType: 1, 
      isActive: 1 
    }); // Compound index for filtering
    
    console.log('Database indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Optimize database queries with aggregation pipelines
 */
export class QueryOptimizer {
  /**
   * Get optimized user statistics
   */
  static async getUserStats() {
    return await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          individualUsers: {
            $sum: { $cond: [{ $eq: ['$userType', 'individual'] }, 1, 0] }
          },
          companyUsers: {
            $sum: { $cond: [{ $eq: ['$userType', 'company'] }, 1, 0] }
          },
          wellWishers: {
            $sum: { $cond: [{ $eq: ['$role', 'wellwisher'] }, 1, 0] }
          }
        }
      }
    ]);
  }

  /**
   * Get optimized order statistics
   */
  static async getOrderStats(filters: Record<string, unknown> = {}) {
    const pipeline: Record<string, unknown>[] = [];
    
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    
    pipeline.push({
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        giftOrders: {
          $sum: { $cond: ['$isGift', 1, 0] }
        }
      }
    });

    return await Order.aggregate(pipeline as never[]);
  }

  /**
   * Get optimized tree statistics
   */
  static async getTreeStats() {
    return await Tree.aggregate([
      {
        $group: {
          _id: null,
          totalTrees: { $sum: 1 },
          activeTrees: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          individualTrees: {
            $sum: { $cond: [{ $eq: ['$treeType', 'individual'] }, 1, 0] }
          },
          companyTrees: {
            $sum: { $cond: [{ $eq: ['$treeType', 'company'] }, 1, 0] }
          },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);
  }
}

/**
 * Database connection optimization
 */
export class DatabaseOptimizer {
  private static connectionPool: typeof import('mongoose') | null = null;

  /**
   * Optimize database connection settings
   */
  static async optimizeConnection() {
    if (this.connectionPool) {
      return this.connectionPool;
    }

    this.connectionPool = await connectDB();
    return this.connectionPool;
  }

  /**
   * Clean up database connections
   */
  static async cleanup() {
    if (this.connectionPool) {
      await this.connectionPool.disconnect();
      this.connectionPool = null;
    }
  }
}

/**
 * Query performance monitoring
 */
export class QueryMonitor {
  private static queryTimes: Map<string, number[]> = new Map();

  /**
   * Start monitoring a query
   */
  static startQuery(queryName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }
      
      const times = this.queryTimes.get(queryName)!;
      times.push(duration);
      
      // Keep only last 100 measurements
      if (times.length > 100) {
        times.shift();
      }
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
    };
  }

  /**
   * Get query performance statistics
   */
  static getQueryStats(): Record<string, { count: number; average: number; min: number; max: number; p95: number }> {
    const stats: Record<string, { count: number; average: number; min: number; max: number; p95: number }> = {};
    
    for (const [queryName, times] of this.queryTimes.entries()) {
      if (times.length > 0) {
        stats[queryName] = {
          count: times.length,
          average: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
        };
      }
    }
    
    return stats;
  }
}
