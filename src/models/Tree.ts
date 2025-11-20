import mongoose, { Document, Schema } from 'mongoose';

export interface ITree extends Document {
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  imagePublicId: string;
  // Small images for collage display (4 images)
  smallImageUrls?: string[];
  smallImagePublicIds?: string[];
  isActive: boolean;
  treeType: 'individual' | 'company';
  // Package fields for corporate trees
  packageQuantity?: number;
  packagePrice?: number;
  // Additional tree information fields
  scientificSpecies?: string;
  speciesInfoAvailable?: boolean;
  co2?: number; // CO₂ value in kg (can be negative)
  foodSecurity?: number; // Rating out of 10
  economicDevelopment?: number; // Rating out of 10
  co2Absorption?: number; // Rating out of 10
  environmentalProtection?: number; // Rating out of 10
  localUses?: string[]; // Array of local use types
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
  // Small images for collage display (4 images)
  smallImageUrls: {
    type: [String],
    default: [],
    required: false
  },
  smallImagePublicIds: {
    type: [String],
    default: [],
    required: false
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
  },
  // Additional tree information fields
  scientificSpecies: {
    type: String,
    trim: true,
    maxlength: [200, 'Scientific species name cannot exceed 200 characters'],
    required: false,
    default: undefined
  },
  speciesInfoAvailable: {
    type: Boolean,
    default: false,
    required: false
  },
  co2: {
    type: Number,
    required: false,
    default: undefined
    // CO₂ can be negative (e.g., -294kg)
  },
  foodSecurity: {
    type: Number,
    min: [0, 'Food security rating cannot be negative'],
    max: [10, 'Food security rating cannot exceed 10'],
    required: false,
    default: undefined
  },
  economicDevelopment: {
    type: Number,
    min: [0, 'Economic development rating cannot be negative'],
    max: [10, 'Economic development rating cannot exceed 10'],
    required: false,
    default: undefined
  },
  co2Absorption: {
    type: Number,
    min: [0, 'CO₂ absorption rating cannot be negative'],
    max: [10, 'CO₂ absorption rating cannot exceed 10'],
    required: false,
    default: undefined
  },
  environmentalProtection: {
    type: Number,
    min: [0, 'Environmental protection rating cannot be negative'],
    max: [10, 'Environmental protection rating cannot exceed 10'],
    required: false,
    default: undefined
  },
  localUses: {
    type: [String],
    default: [],
    required: false
  }
}, {
  timestamps: true,
  strict: false, // Disable strict mode to allow all fields to be saved
  strictQuery: false, // Allow querying with fields not in schema
  minimize: false // Don't remove empty objects
});

// Index for better query performance
TreeSchema.index({ name: 1 });
TreeSchema.index({ isActive: 1 });
TreeSchema.index({ createdAt: -1 });

export default (mongoose.models?.Tree || mongoose.model<ITree>('Tree', TreeSchema)) as mongoose.Model<ITree>;
