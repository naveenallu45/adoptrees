import { Schema, models, model, Query } from 'mongoose';

export type UserType = 'individual' | 'company' | 'dealer';

export interface IUser {
  name?: string;
  companyName?: string;
  email: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  dateOfBirth?: Date; // Date of birth for individual users
  dateOfBirthLastUpdated?: Date; // Timestamp when date of birth was last updated
  passwordHash: string;
  userType: UserType;
  role: 'user' | 'admin' | 'wellwisher';
  publicId?: string;
  qrCode?: string; // QR code data URL stored at registration
  image?: string; // Profile image URL
  imagePublicId?: string; // Cloudinary public ID for profile image
  lastMarketingEmailSent?: Date; // Last time marketing email was sent to this user
  credits?: number; // User credits balance (10% of tree price earned on each order)
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    companyName: { type: String },
    email: { 
      type: String, 
      required: true,
      // Note: unique index created via database-optimization script, not in schema to avoid duplicate warnings
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    phone: { type: String },
    address: { type: String },
    gstNumber: { type: String },
    dateOfBirth: { 
      type: Date,
      validate: {
        validator: function(v: Date | null | undefined) {
          if (!v) return true; // Optional field
          const today = new Date();
          const maxAge = new Date();
          maxAge.setFullYear(today.getFullYear() - 120); // Max age 120 years
          return v <= today && v >= maxAge;
        },
        message: 'Date of birth must be a valid date and person must be less than 120 years old'
      }
    },
    dateOfBirthLastUpdated: { type: Date },
    passwordHash: { type: String, required: true, select: false },
    userType: { type: String, enum: ['individual', 'company', 'dealer'], required: true },
    role: { type: String, enum: ['user', 'admin', 'wellwisher'], default: 'user', required: true },
    publicId: { 
      type: String,
      immutable: true, // Once generated, publicId should never change
      // Note: unique sparse index created via database-optimization script, not in schema to avoid duplicate warnings
    },
    qrCode: { 
      type: String, 
      immutable: true, // Once generated at registration, QR code should never change
    }, // QR code data URL stored at registration
    image: { type: String }, // Profile image URL
    imagePublicId: { type: String }, // Cloudinary public ID for profile image
    lastMarketingEmailSent: { type: Date }, // Last time marketing email was sent to this user
    credits: { type: Number, default: 0, min: 0 }, // User credits balance (10% of tree price earned on each order)
  },
  { 
    timestamps: true,
    autoIndex: false // Disable automatic index creation - indexes are created via database-optimization script
  }
);

// Note: Indexes are created via database-optimization script to avoid duplicate warnings
// in Next.js multi-process environment. Schema-level index definitions removed.

// Ensure email is lowercase, publicId exists, and QR code is generated before saving
UserSchema.pre('save', async function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // CRITICAL: Protect existing publicId from deletion
  // If this is an existing document with a publicId, prevent it from being deleted or changed
  if (!this.isNew && this._id) {
    const Model = this.model('User');
    const existingDoc = await Model.findById(this._id).select('publicId qrCode').lean() as { publicId?: string; qrCode?: string } | null;
    
    if (existingDoc && existingDoc.publicId) {
      // If document already has a publicId, it CANNOT be deleted or changed
      if (!this.publicId || this.publicId !== existingDoc.publicId) {
        // Restore the original publicId
        this.publicId = existingDoc.publicId;
        console.warn(`[User Model] Attempted to delete or change publicId for user ${this._id}, prevented and restored`);
      }
      
      // Also protect qrCode - it must match the publicId
      if (existingDoc.qrCode && (!this.qrCode || this.qrCode !== existingDoc.qrCode)) {
        // Restore the original qrCode
        this.qrCode = existingDoc.qrCode;
        console.warn(`[User Model] Attempted to delete or change qrCode for user ${this._id}, prevented and restored`);
      }
    }
  }
  
  // Generate publicId only if it doesn't exist (for new documents)
  if (!this.publicId) {
    const generatePublicId = () => {
      const random = Math.random().toString(36).slice(2, 8);
      const timestamp = Date.now().toString(36).slice(-4);
      return `${random}${timestamp}`.toLowerCase();
    };
    
    // Generate publicId and ensure uniqueness (safety net for edge cases)
    let publicId = generatePublicId();
    let attempts = 0;
    while (attempts < 10) {
      // Check if this publicId already exists
      // For new documents, check if any other document has this publicId
      // For existing documents, check if any OTHER document has this publicId
      // Use this.model() to get the model instance
      const Model = this.model('User');
      const existing = await Model.findOne({ publicId });
      if (!existing || (existing._id.toString() === this._id.toString())) {
        break;
      }
      publicId = generatePublicId();
      attempts++;
    }
    
    if (attempts >= 10) {
      return next(new Error('Failed to generate unique publicId'));
    }
    
    this.publicId = publicId;
  }
  
  // CRITICAL: Ensure QR code and publicId are always in sync
  // If both exist, they must match (QR code should contain the publicId URL)
  // This validation ensures data integrity
  if (this.publicId && this.qrCode) {
    // QR code is a base64 data URL, so we can't easily decode it here
    // But we ensure both are present and not empty
    if (!this.publicId.trim() || !this.qrCode.trim()) {
      return next(new Error('publicId and qrCode must both be non-empty if present'));
    }
    
    // For existing documents, ensure QR code wasn't changed independently
    if (!this.isNew && this._id) {
      const Model = this.model('User');
      const existingDoc = await Model.findById(this._id).select('publicId qrCode').lean() as { publicId?: string; qrCode?: string } | null;
      if (existingDoc && existingDoc.publicId && existingDoc.qrCode) {
        // If publicId matches but qrCode changed, restore original qrCode
        if (this.publicId === existingDoc.publicId && this.qrCode !== existingDoc.qrCode) {
          this.qrCode = existingDoc.qrCode;
          console.warn(`[User Model] QR code mismatch detected for user ${this._id}, restored original QR code`);
        }
      }
    }
  }
  
  // Note: QR code generation is handled in registration and well-wisher routes, not here
  // to avoid requiring QRCode library in the model file
  next();
});

// CRITICAL: Prevent $unset operations on publicId and qrCode
// This hook catches update operations (findByIdAndUpdate, updateOne, updateMany, etc.)
// Define the hook function once and register it for each operation
const protectImmutableFields = async function(this: Query<unknown, IUser>, next: () => void) {
  const update = this.getUpdate() as Record<string, unknown> | null | undefined;
  
  // Check for $unset operations that try to remove publicId or qrCode
  if (update && typeof update === 'object' && !Array.isArray(update)) {
    const updateObj = update as Record<string, unknown>;
    
    // Check for $unset operations
    if ('$unset' in updateObj && updateObj.$unset && typeof updateObj.$unset === 'object' && !Array.isArray(updateObj.$unset)) {
      const unset = updateObj.$unset as Record<string, unknown>;
      if ('publicId' in unset || unset.publicId !== undefined) {
        delete unset.publicId;
        console.warn('[User Model] Blocked $unset operation on publicId');
      }
      if ('qrCode' in unset || unset.qrCode !== undefined) {
        delete unset.qrCode;
        console.warn('[User Model] Blocked $unset operation on qrCode');
      }
    }
    
    // Check for direct $set operations that try to set publicId or qrCode to null/undefined
    if ('$set' in updateObj && updateObj.$set && typeof updateObj.$set === 'object' && !Array.isArray(updateObj.$set)) {
      const set = updateObj.$set as Record<string, unknown>;
      if (set.publicId === null || set.publicId === undefined || set.publicId === '') {
        delete set.publicId;
        console.warn('[User Model] Blocked attempt to set publicId to null/undefined/empty');
      }
      if (set.qrCode === null || set.qrCode === undefined || set.qrCode === '') {
        delete set.qrCode;
        console.warn('[User Model] Blocked attempt to set qrCode to null/undefined/empty');
      }
    }
    
    // Check for direct assignment (non-$set updates)
    if ('publicId' in updateObj && (updateObj.publicId === null || updateObj.publicId === undefined || updateObj.publicId === '')) {
      delete updateObj.publicId;
      console.warn('[User Model] Blocked direct assignment of publicId to null/undefined/empty');
    }
    if ('qrCode' in updateObj && (updateObj.qrCode === null || updateObj.qrCode === undefined || updateObj.qrCode === '')) {
      delete updateObj.qrCode;
      console.warn('[User Model] Blocked direct assignment of qrCode to null/undefined/empty');
    }
  }
  
  next();
};

// Register the hook for each update operation
// Note: findByIdAndUpdate is an alias for findOneAndUpdate, so it uses the same hook
UserSchema.pre('updateOne', protectImmutableFields);
UserSchema.pre('updateMany', protectImmutableFields);
UserSchema.pre('findOneAndUpdate', protectImmutableFields);

// Delete existing model from cache to force recompilation with updated enum
// This ensures 'dealer' is included in the userType enum
if (models?.User) {
  delete models.User;
}

const User = model<IUser>('User', UserSchema);

export default User;


