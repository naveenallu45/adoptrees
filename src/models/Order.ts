import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userType: 'individual' | 'company';
  items: {
    treeId: string;
    treeName: string;
    treeImageUrl: string;
    quantity: number;
    price: number;
    oxygenKgs: number;
    adoptionType: 'self' | 'gift';
    recipientName?: string;
    recipientEmail?: string;
    giftMessage?: string;
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'planted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentId?: string;
  // Gift specific fields
  isGift: boolean;
  giftRecipientName?: string;
  giftRecipientEmail?: string;
  giftMessage?: string;
  // Wellwisher assignment
  assignedWellwisher?: string;
  wellwisherTasks?: {
    taskId: string;
    task: string;
    description: string;
    scheduledDate: Date;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed' | 'updating';
    location?: string;
    plantingDetails?: {
      plantedAt?: Date;
      plantingLocation?: {
        type: string;
        coordinates: [number, number];
      };
      locationMeta?: {
        accuracy?: number;
        altitude?: number;
        altitudeAccuracy?: number;
        heading?: number;
        speed?: number;
        source?: string;
        permissionState?: string;
        clientTimestamp?: Date;
      };
      plantingImages?: Array<{
        url: string;
        publicId: string;
        caption?: string;
        uploadedAt: Date;
      }>;
      plantingNotes?: string;
      completedAt?: Date;
    };
    nextGrowthUpdateDue?: Date;
    growthUpdates?: Array<{
      updateId: string;
      uploadedAt: Date;
      images: Array<{
        url: string;
        publicId: string;
        caption?: string;
        uploadedAt: Date;
      }>;
      notes?: string;
      daysSincePlanting: number;
    }>;
  }[];
  // Admin fields
  adminNotes?: string;
  // Certificate PDF stored as Buffer
  certificate?: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    index: true
  },
  userName: {
    type: String,
    required: [true, 'User name is required']
  },
  userType: {
    type: String,
    enum: ['individual', 'company'],
    required: [true, 'User type is required']
  },
  items: [{
    treeId: {
      type: String,
      required: [true, 'Tree ID is required']
    },
    treeName: {
      type: String,
      required: [true, 'Tree name is required']
    },
    treeImageUrl: {
      type: String,
      required: [true, 'Tree image URL is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    oxygenKgs: {
      type: Number,
      required: [true, 'Oxygen production is required'],
      min: [0, 'Oxygen production cannot be negative']
    },
    adoptionType: {
      type: String,
      enum: ['self', 'gift'],
      required: [true, 'Adoption type is required'],
      default: 'self'
    },
    recipientName: {
      type: String
    },
    recipientEmail: {
      type: String
    },
    giftMessage: {
      type: String,
      maxlength: [500, 'Gift message cannot exceed 500 characters']
    }
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'planted', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String
  },
  paymentId: {
    type: String
  },
  isGift: {
    type: Boolean,
    default: false
  },
  giftRecipientName: {
    type: String
  },
  giftRecipientEmail: {
    type: String
  },
  giftMessage: {
    type: String,
    maxlength: [500, 'Gift message cannot exceed 500 characters']
  },
  assignedWellwisher: {
    type: String,
    ref: 'User'
  },
  wellwisherTasks: [{
    taskId: {
      type: String,
      required: true
    },
    task: {
      type: String,
      required: [true, 'Task name is required']
    },
    description: {
      type: String,
      required: [true, 'Task description is required']
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'updating'],
      default: 'pending'
    },
    location: {
      type: String
    },
    // Planting details for completed tasks
    plantingDetails: {
      plantedAt: {
        type: Date
      },
      plantingLocation: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: '2dsphere'
        }
      },
        // Optional metadata captured from the device's Geolocation API
        locationMeta: {
          accuracy: { type: Number }, // meters
          altitude: { type: Number }, // meters above sea level
          altitudeAccuracy: { type: Number }, // meters
          heading: { type: Number }, // degrees
          speed: { type: Number }, // m/s
          source: { type: String }, // gps|network|watch|high_accuracy|standard|cached|unknown
          permissionState: { type: String }, // granted|prompt|denied (if available)
          clientTimestamp: { type: Date } // timestamp from the device
        },
      plantingImages: [{
        url: {
          type: String,
          required: true
        },
        publicId: {
          type: String,
          required: true
        },
        caption: {
          type: String
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }],
      plantingNotes: {
        type: String,
        maxlength: [500, 'Planting notes cannot exceed 500 characters']
      },
      completedAt: {
        type: Date
      }
    },
    // Growth updates - required every 30 days after completion
    nextGrowthUpdateDue: {
      type: Date
    },
    growthUpdates: [{
      updateId: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        required: true,
        default: Date.now
      },
      images: [{
        url: {
          type: String,
          required: true
        },
        publicId: {
          type: String,
          required: true
        },
        caption: {
          type: String
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }],
      notes: {
        type: String,
        maxlength: [500, 'Growth update notes cannot exceed 500 characters']
      },
      daysSincePlanting: {
        type: Number,
        required: true
      }
    }]
  }],
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  certificate: {
    type: Buffer,
    select: false // Don't include in queries by default to avoid loading large data
  }
}, {
  timestamps: true
});

// Indexes for better query performance
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ assignedWellwisher: 1 });
OrderSchema.index({ 'items.treeId': 1 });
OrderSchema.index({ 'wellwisherTasks.nextGrowthUpdateDue': 1 });

export default (mongoose.models?.Order || mongoose.model<IOrder>('Order', OrderSchema)) as mongoose.Model<IOrder>;
