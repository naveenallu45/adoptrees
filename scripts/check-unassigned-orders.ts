#!/usr/bin/env ts-node

/**
 * Diagnostic script to check for orders with paymentStatus: 'paid' 
 * but no assignedWellwisher or missing/empty wellwisherTasks
 * 
 * Usage: npx ts-node scripts/check-unassigned-orders.ts [--fix]
 */

import connectDB from '../src/lib/mongodb';
import Order from '../src/models/Order';
import User from '../src/models/User';
import { assignWellWisherEqually } from '../src/lib/utils/wellwisher-assignment';

interface UnassignedOrder {
  orderId: string;
  userId: string;
  userName: string;
  paymentStatus: string;
  hasAssignedWellwisher: boolean;
  hasWellwisherTasks: boolean;
  wellwisherTasksCount: number;
  createdAt: Date;
}

async function checkUnassignedOrders() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');

    // Find all paid orders
    const paidOrders = await Order.find({ paymentStatus: 'paid' })
      .select('orderId userId userName paymentStatus assignedWellwisher wellwisherTasks createdAt items')
      .lean();

    console.log(`📊 Total paid orders: ${paidOrders.length}\n`);

    // Check for unassigned orders
    const unassignedOrders: UnassignedOrder[] = [];
    const ordersWithEmptyTasks: UnassignedOrder[] = [];
    const ordersWithMissingTasks: UnassignedOrder[] = [];

    for (const order of paidOrders) {
      const hasAssignedWellwisher = !!order.assignedWellwisher;
      const hasWellwisherTasks = !!(order.wellwisherTasks && order.wellwisherTasks.length > 0);
      const wellwisherTasksCount = order.wellwisherTasks?.length || 0;

      const orderInfo: UnassignedOrder = {
        orderId: order.orderId,
        userId: order.userId,
        userName: order.userName,
        paymentStatus: order.paymentStatus,
        hasAssignedWellwisher,
        hasWellwisherTasks,
        wellwisherTasksCount,
        createdAt: order.createdAt,
      };

      if (!hasAssignedWellwisher) {
        unassignedOrders.push(orderInfo);
      }

      if (hasAssignedWellwisher && !hasWellwisherTasks) {
        ordersWithEmptyTasks.push(orderInfo);
      }

      if (hasAssignedWellwisher && wellwisherTasksCount === 0) {
        ordersWithMissingTasks.push(orderInfo);
      }
    }

    // Report findings
    console.log('='.repeat(80));
    console.log('📋 DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
    console.log();

    if (unassignedOrders.length === 0 && ordersWithEmptyTasks.length === 0) {
      console.log('✅ All paid orders have well-wishers assigned!');
      console.log();
      return;
    }

    // Orders without assigned well-wisher
    if (unassignedOrders.length > 0) {
      console.log(`❌ Orders WITHOUT assigned well-wisher: ${unassignedOrders.length}`);
      console.log('-'.repeat(80));
      unassignedOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order.orderId}`);
        console.log(`   User: ${order.userName} (${order.userId})`);
        console.log(`   Created: ${order.createdAt.toISOString()}`);
        console.log(`   Well-wisher Tasks: ${order.wellwisherTasksCount}`);
        console.log();
      });
    }

    // Orders with assigned well-wisher but empty tasks
    if (ordersWithEmptyTasks.length > 0) {
      console.log(`⚠️  Orders WITH assigned well-wisher but EMPTY tasks: ${ordersWithEmptyTasks.length}`);
      console.log('-'.repeat(80));
      ordersWithEmptyTasks.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order.orderId}`);
        console.log(`   User: ${order.userName} (${order.userId})`);
        console.log(`   Created: ${order.createdAt.toISOString()}`);
        console.log(`   Assigned Well-wisher: ${order.hasAssignedWellwisher ? 'Yes' : 'No'}`);
        console.log();
      });
    }

    // Check if well-wishers exist
    console.log('='.repeat(80));
    console.log('👥 WELL-WISHER AVAILABILITY');
    console.log('='.repeat(80));
    const wellWishers = await User.find({ role: 'wellwisher' }).select('_id name email').lean();
    console.log(`Total well-wishers in database: ${wellWishers.length}`);
    
    if (wellWishers.length === 0) {
      console.log('❌ NO WELL-WISHERS FOUND IN DATABASE!');
      console.log('   This is why orders cannot be assigned.');
      console.log('   Please create well-wisher accounts first.');
    } else {
      console.log('Available well-wishers:');
      wellWishers.forEach((ww, index) => {
        console.log(`  ${index + 1}. ${ww.name || 'Unnamed'} (${ww.email || 'No email'}) - ID: ${ww._id}`);
      });
    }
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total paid orders: ${paidOrders.length}`);
    console.log(`Orders without assigned well-wisher: ${unassignedOrders.length}`);
    console.log(`Orders with empty tasks: ${ordersWithEmptyTasks.length}`);
    console.log(`Available well-wishers: ${wellWishers.length}`);
    console.log();

    return {
      unassignedOrders,
      ordersWithEmptyTasks,
      wellWishersCount: wellWishers.length,
    };

  } catch (error) {
    console.error('❌ Error checking unassigned orders:', error);
    throw error;
  }
}

async function fixUnassignedOrders() {
  try {
    console.log('🔧 FIXING UNASSIGNED ORDERS...\n');
    
    await connectDB();
    
    // Check if well-wishers exist
    const wellWishers = await User.find({ role: 'wellwisher' }).select('_id').lean();
    if (wellWishers.length === 0) {
      console.log('❌ Cannot fix: No well-wishers found in database!');
      console.log('   Please create well-wisher accounts first.');
      return;
    }

    // Find orders that need fixing
    const ordersToFix = await Order.find({
      paymentStatus: 'paid',
      $or: [
        { assignedWellwisher: { $exists: false } },
        { assignedWellwisher: null },
        { wellwisherTasks: { $exists: false } },
        { wellwisherTasks: { $size: 0 } },
      ],
    }).select('orderId userId userName items assignedWellwisher wellwisherTasks');

    console.log(`Found ${ordersToFix.length} orders to fix\n`);

    let fixedCount = 0;
    let failedCount = 0;

    for (const order of ordersToFix) {
      try {
        // Assign well-wisher if not assigned
        if (!order.assignedWellwisher) {
          const wellwisherId = await assignWellWisherEqually();
          
          if (!wellwisherId) {
            console.log(`❌ Failed to assign well-wisher to order ${order.orderId}: No well-wishers available`);
            failedCount++;
            continue;
          }

          order.assignedWellwisher = wellwisherId;
          console.log(`✅ Assigned well-wisher ${wellwisherId} to order ${order.orderId}`);
        }

        // Create tasks if missing or empty
        if (!order.wellwisherTasks || order.wellwisherTasks.length === 0) {
          const wellwisherTasks = order.items.map((item: any, index: number) => ({
            taskId: `${order.orderId}-${index}`,
            task: `Plant and care for ${item.treeName}`,
            description: `Plant ${item.quantity} ${item.treeName} tree(s) and provide ongoing care. ${order.isGift && order.giftMessage ? `Gift message: ${order.giftMessage}` : ''}`,
            scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
            status: 'pending' as const,
            location: 'To be determined',
          }));

          order.wellwisherTasks = wellwisherTasks;
          console.log(`✅ Created ${wellwisherTasks.length} tasks for order ${order.orderId}`);
        }

        await order.save();
        fixedCount++;
        console.log(`✅ Fixed order ${order.orderId}\n`);

      } catch (error) {
        console.error(`❌ Error fixing order ${order.orderId}:`, error);
        failedCount++;
      }
    }

    console.log('='.repeat(80));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(80));
    console.log(`Orders fixed: ${fixedCount}`);
    console.log(`Orders failed: ${failedCount}`);
    console.log();

  } catch (error) {
    console.error('❌ Error fixing unassigned orders:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  try {
    if (shouldFix) {
      await fixUnassignedOrders();
    } else {
      await checkUnassignedOrders();
      console.log('💡 Tip: Run with --fix flag to automatically assign well-wishers to unassigned orders');
      console.log('   Example: npx ts-node scripts/check-unassigned-orders.ts --fix');
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();

