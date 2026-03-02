import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Tree from '@/models/Tree';
import Coupon from '@/models/Coupon';
import { assignWellWisherEqually } from '@/lib/utils/wellwisher-assignment';
import { sendWellWisherTaskAssignmentEmail } from '@/lib/email';
import { logPaymentEvent } from '@/lib/logger';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { purchaseType, treeId, quantity } = body; // purchaseType: 'pc' | 'field-goal'

    // Validate purchase type
    if (!purchaseType || !['pc', 'field-goal'].includes(purchaseType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid purchase type. Must be "pc" or "field-goal"' },
        { status: 400 }
      );
    }

    // Set quantity based on purchase type
    const finalQuantity = purchaseType === 'pc' ? 50 : 100;

    // If treeId is provided, use it; otherwise fetch first available individual tree
    let selectedTree;
    if (treeId) {
      selectedTree = await Tree.findById(treeId);
      if (!selectedTree || !selectedTree.isActive) {
        return NextResponse.json(
          { success: false, error: 'Tree not found or inactive' },
          { status: 400 }
        );
      }
    } else {
      // Fetch first available individual tree
      selectedTree = await Tree.findOne({ treeType: 'individual', isActive: true });
      if (!selectedTree) {
        return NextResponse.json(
          { success: false, error: 'No active trees available' },
          { status: 400 }
        );
      }
    }

    // Find or create 100% discount coupon for Hockey India
    let hockeyIndiaCoupon = await Coupon.findOne({ 
      code: 'HOCKEYINDIA100',
      category: 'individual' // Using individual category
    });

    if (!hockeyIndiaCoupon) {
      // Create 100% discount coupon
      hockeyIndiaCoupon = await Coupon.create({
        code: 'HOCKEYINDIA100',
        category: 'individual',
        discountPercentage: 100,
        usageLimitType: 'unlimited',
        perUserUsageLimit: 999999, // Very high limit
        usedCount: 0,
        isActive: true,
        isHidden: true // Hidden so it doesn't appear in public coupon lists
      });
    }

    // Calculate order amounts
    const itemPrice = selectedTree.price;
    const totalAmount = itemPrice * finalQuantity;
    const couponDiscount = totalAmount; // 100% discount
    const finalAmount = 0; // Free with 100% discount

    // Generate unique order ID
    const firstThreeLetters = 'HKI'; // Hockey India prefix
    let orderId: string | null = null;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const fiveNumbers = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      orderId = `${firstThreeLetters}${fiveNumbers}`;
      
      const existingOrder = await Order.findOne({ orderId });
      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique || !orderId) {
      const timestamp = Date.now().toString().slice(-8);
      orderId = `${firstThreeLetters}${timestamp}`;
    }

    // Create order items
    const orderItems = [{
      treeId: String(selectedTree._id),
      treeName: selectedTree.name,
      treeImageUrl: selectedTree.imageUrl,
      quantity: finalQuantity,
      price: itemPrice,
      oxygenKgs: selectedTree.oxygenKgs,
      co2Kgs: selectedTree.co2,
      treeType: 'individual' as const,
      adoptionType: 'self' as const
    }];

    // Create order
    const order = new Order({
      orderId: orderId!,
      userId: String(session.user.id),
      userEmail: session.user.email || 'admin@adoptrees.com',
      userName: `Hockey India - ${purchaseType === 'pc' ? 'Penalty Corner' : 'Field Goal'}`,
      userType: 'hockey-india',
      items: orderItems,
      totalAmount,
      couponCode: hockeyIndiaCoupon.code,
      couponDiscount,
      finalAmount,
      status: 'confirmed', // Auto-confirm admin purchases
      paymentStatus: 'paid', // Mark as paid since it's free
      paymentMethod: 'admin_purchase'
    });

    await order.save();

    // Assign wellwisher and create tasks
    const wellwisherId = await assignWellWisherEqually();
    
    if (wellwisherId) {
      const wellwisherTasks: Array<{
        taskId: string;
        task: string;
        description: string;
        scheduledDate: Date;
        status: 'pending';
        location: string;
      }> = [];
      
      let taskIndex = 0;
      // Create one task per tree
      for (let i = 0; i < finalQuantity; i++) {
        wellwisherTasks.push({
          taskId: `${order.orderId}-${taskIndex}`,
          task: `Plant and care for ${selectedTree.name}`,
          description: `Plant 1 ${selectedTree.name} tree and provide ongoing care.

🏑 Hockey India Collaboration - FIH Hockey World Cup 2026 Qualifiers
📍 Location: Hyderabad, Telangana
🌱 Every goal grows something bigger! 🙏

${purchaseType === 'pc' ? '50 trees for a PC 🏑' : '💯 trees for a field goal!'}
Every time the net shakes, the Earth breathes 🥅

This FIH Hockey World Cup 2026 Qualifiers Hyderabad, Telangana - every goal grows something bigger! 🙏`,
          scheduledDate: new Date(Date.now() + (taskIndex + 1) * 24 * 60 * 60 * 1000),
          status: 'pending' as const,
          location: 'To be determined'
        });
        taskIndex++;
      }

      order.assignedWellwisher = wellwisherId;
      order.wellwisherTasks = wellwisherTasks;
      await order.save();

      // Update coupon usage
      hockeyIndiaCoupon.usedCount += 1;
      await hockeyIndiaCoupon.save();

      // Send email to wellwisher
      try {
        const User = (await import('@/models/User')).default;
        const wellWisher = await User.findById(wellwisherId).select('email name');
        if (wellWisher && wellWisher.email) {
          await sendWellWisherTaskAssignmentEmail(
            wellWisher.email,
            wellWisher.name || '',
            order.orderId,
            wellwisherTasks,
            {
              totalTrees: finalQuantity,
              customerName: order.userName,
              isGift: false
            }
          );
        }
      } catch (emailError) {
        console.error('[HockeyIndia] Failed to send wellwisher assignment email:', emailError);
        // Don't fail the request if email fails
      }

      logPaymentEvent('hockey_india_admin_purchase', {
        orderId: order.orderId,
        purchaseType,
        treesCount: finalQuantity,
        wellwisherId: wellwisherId.toString(),
        purchasedBy: session.user.email || 'admin'
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${finalQuantity} trees for Hockey India`,
      data: {
        orderId: order.orderId,
        purchaseType,
        quantity: finalQuantity,
        treeName: selectedTree.name,
        wellwisherAssigned: !!wellwisherId,
        tasksCreated: order.wellwisherTasks?.length || 0
      }
    });
  } catch (error) {
    console.error('[HockeyIndia] Error purchasing trees:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to purchase trees';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
