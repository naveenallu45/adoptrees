import mongoose, { Document, Schema } from 'mongoose';

export interface IDemoRequest extends Document {
  email: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DemoRequestSchema = new Schema<IDemoRequest>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // Index created via schema.index() below - don't duplicate here
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate emails (optional - remove if you want to allow multiple requests)
DemoRequestSchema.index({ email: 1 }, { unique: false });

const DemoRequest = mongoose.models.DemoRequest || mongoose.model<IDemoRequest>('DemoRequest', DemoRequestSchema);

export default DemoRequest;

