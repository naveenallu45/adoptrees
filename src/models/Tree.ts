import mongoose, { Document, Schema } from 'mongoose';

export interface ITree extends Document {
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  imagePublicId: string;
  isActive: boolean;
  treeType: 'individual' | 'company';
  // Package fields for corporate trees
  packageQuantity?: number;
  packagePrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TreeSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Tree name is required'],
    trim: true,
    maxlength: [100, 'Tree name cannot exceed 100 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  info: {
    type: String,
    required: [true, 'Tree information is required'],
    trim: true,
    maxlength: [500, 'Tree information cannot exceed 500 characters']
  },
  oxygenKgs: {
    type: Number,
    required: [true, 'Oxygen production amount is required'],
    min: [0, 'Oxygen production cannot be negative']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  imagePublicId: {
    type: String,
    required: [true, 'Image public ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  treeType: {
    type: String,
    enum: ['individual', 'company'],
    required: [true, 'Tree type is required'],
    default: 'individual'
  },
  // Package fields for corporate trees
  packageQuantity: {
    type: Number,
    min: [1, 'Package quantity must be at least 1'],
    default: 1
  },
  packagePrice: {
    type: Number,
    min: [0, 'Package price cannot be negative']
  }
}, {
  timestamps: true
});

// Index for better query performance
TreeSchema.index({ name: 1 });
TreeSchema.index({ isActive: 1 });
TreeSchema.index({ createdAt: -1 });

export default (mongoose.models?.Tree || mongoose.model<ITree>('Tree', TreeSchema)) as mongoose.Model<ITree>;
