import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  category: 'individual' | 'company';
  discountPercentage: number;
  usageLimitType: 'unlimited' | 'custom';
  totalUsageLimit?: number; // Only used when usageLimitType is 'custom'
  perUserUsageLimit: number;
  usedCount: number; // Total times coupon has been used
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]+$/, 'Coupon code must contain only uppercase letters and numbers']
    },
    category: {
      type: String,
      enum: ['individual', 'company'],
      required: [true, 'Category is required']
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [1, 'Discount percentage must be at least 1%'],
      max: [100, 'Discount percentage cannot exceed 100%']
    },
    usageLimitType: {
      type: String,
      enum: ['unlimited', 'custom'],
      required: [true, 'Usage limit type is required']
    },
    totalUsageLimit: {
      type: Number,
      required: function(this: ICoupon) {
        return this.usageLimitType === 'custom';
      },
      min: [1, 'Total usage limit must be at least 1']
    },
    perUserUsageLimit: {
      type: Number,
      required: [true, 'Per user usage limit is required'],
      min: [1, 'Per user usage limit must be at least 1']
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster lookups
// Note: code index is automatically created by unique: true, so we don't need to add it explicitly
CouponSchema.index({ category: 1, isActive: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);

export default Coupon;

