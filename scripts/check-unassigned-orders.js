#!/usr/bin/env node

/**
 * Diagnostic script to check for orders with paymentStatus: 'paid' 
 * but no assignedWellwisher or missing/empty wellwisherTasks
 * 
 * Usage: node scripts/check-unassigned-orders.js [--fix]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env if they exist
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf8');
    fileContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      // Skip comments and empty lines
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          value = value.replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    break; // Use first file found
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('   Please ensure you have a .env.local file with MONGODB_URI set');
  console.error('   Or set it as an environment variable: export MONGODB_URI="your-connection-string"');
  process.exit(1);
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    connectTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
  };

  return mongoose.connect(MONGODB_URI, opts);
}

async function assignWellWisherEqually() {
  try {
    await connectDB();
    
    // Get or create models (check if they exist first)
    let User, Order;
    if (mongoose.models.User) {
      User = mongoose.model('User');
    } else {
      User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    }
    if (mongoose.models.Order) {
      Order = mongoose.model('Order');
    } else {
      Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    }
    
    // Get all available well-wishers
    const wellWishers = await User.find({ role: 'wellwisher' }).select('_id').lean();
    
    if (wellWishers.length === 0) {
      console.error('[WELLWISHER_ASSIGNMENT] No well-wishers found in database. Cannot assign task.');
      return null;
    }
    
    console.log(`[WELLWISHER_ASSIGNMENT] Found ${wellWishers.length} well-wisher(s) available for assignment`);

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
    const countMap = new Map();
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
    let selectedWellWisher = null;

    for (const wellWisher of wellWishers) {
      const id = wellWisher._id.toString();
      const count = countMap.get(id) || 0;
      
      if (count < minCount) {
        minCount = count;
        selectedWellWisher = id;
      }
    }

    if (selectedWellWisher) {
      console.log(`[WELLWISHER_ASSIGNMENT] Assigned well-wisher ${selectedWellWisher} (has ${minCount} orders)`);
      return selectedWellWisher;
    }

    // Fallback: return first well-wisher if something goes wrong
    const fallbackId = wellWishers[0]?._id.toString() || null;
    if (fallbackId) {
      console.log(`[WELLWISHER_ASSIGNMENT] Using fallback well-wisher ${fallbackId}`);
    } else {
      console.error('[WELLWISHER_ASSIGNMENT] Failed to select well-wisher - no fallback available');
    }
    return fallbackId;
  } catch (error) {
    console.error('Error assigning well-wisher equally:', error);
    let User;
    if (mongoose.models.User) {
      User = mongoose.model('User');
    } else {
      User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    }
    const fallbackWellWisher = await User.findOne({ role: 'wellwisher' }).select('_id').lean();
    return fallbackWellWisher?._id.toString() || null;
  }
}

async function checkUnassignedOrders() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');

    // Get or create models (check if they exist first)
    let User, Order;
    if (mongoose.models.User) {
      User = mongoose.model('User');
    } else {
      User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    }
    if (mongoose.models.Order) {
      Order = mongoose.model('Order');
    } else {
      Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    }

    // Find all paid orders
    const paidOrders = await Order.find({ paymentStatus: 'paid' })
      .select('orderId userId userName paymentStatus assignedWellwisher wellwisherTasks createdAt items isGift giftMessage')
      .lean();

    console.log(`📊 Total paid orders: ${paidOrders.length}\n`);

    // Check for unassigned orders
    const unassignedOrders = [];
    const ordersWithEmptyTasks = [];
    const ordersWithMissingTasks = [];

    for (const order of paidOrders) {
      const hasAssignedWellwisher = !!order.assignedWellwisher;
      const hasWellwisherTasks = !!(order.wellwisherTasks && order.wellwisherTasks.length > 0);
      const wellwisherTasksCount = order.wellwisherTasks?.length || 0;

      const orderInfo = {
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
        console.log(`   Created: ${new Date(order.createdAt).toISOString()}`);
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
        console.log(`   Created: ${new Date(order.createdAt).toISOString()}`);
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
    
    // Get or create models (check if they exist first)
    let User, Order;
    if (mongoose.models.User) {
      User = mongoose.model('User');
    } else {
      User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    }
    if (mongoose.models.Order) {
      Order = mongoose.model('Order');
    } else {
      Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    }
    
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
    }).select('orderId userId userName items assignedWellwisher wellwisherTasks isGift giftMessage');

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
          const wellwisherTasks = order.items.map((item, index) => ({
            taskId: `${order.orderId}-${index}`,
            task: `Plant and care for ${item.treeName}`,
            description: `Plant ${item.quantity} ${item.treeName} tree(s) and provide ongoing care. ${order.isGift && order.giftMessage ? `Gift message: ${order.giftMessage}` : ''}`,
            scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
            status: 'pending',
            location: 'To be determined',
          }));

          order.wellwisherTasks = wellwisherTasks;
          console.log(`✅ Created ${wellwisherTasks.length} tasks for order ${order.orderId}`);
        }

        await Order.findByIdAndUpdate(order._id, {
          assignedWellwisher: order.assignedWellwisher,
          wellwisherTasks: order.wellwisherTasks,
        });

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
      console.log('   Example: node scripts/check-unassigned-orders.js --fix');
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();

