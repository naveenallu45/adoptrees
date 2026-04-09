import { Schema, models, model, Query, Model } from 'mongoose';
import mongoose from 'mongoose';

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
      required: true,
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
function generatePublicId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36).slice(-4);
  return `${random}${timestamp}`.toLowerCase();
}

async function generateUniquePublicId(model: Model<IUser>, ignoreId?: string): Promise<string> {
  let publicId = generatePublicId();
  let attempts = 0;

  while (attempts < 10) {
    const existing = await model.findOne({ publicId }).select('_id').lean();

    if (!existing) return publicId;

    // If we found the same doc (during save), allow re-using.
    if (ignoreId && existing._id?.toString && existing._id.toString() === ignoreId) {
      return publicId;
    }

    publicId = generatePublicId();
    attempts++;
  }

  throw new Error('Failed to generate unique publicId');
}

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
    const Model = this.model('User') as Model<IUser>;
    const ignoreId = this._id?.toString?.();
    this.publicId = await generateUniquePublicId(Model, ignoreId);
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

// Permanent safety net:
// - If insertMany is used (instead of `save`/`create`), make sure publicId exists.
UserSchema.pre('insertMany', async function(next, docs: Array<Partial<IUser>>) {
  const Model = (models.User || mongoose.model('User')) as Model<IUser>;

  try {
    for (const doc of docs) {
      if (!doc.publicId) {
        doc.publicId = await generateUniquePublicId(Model);
      }
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

// If an upsert creates a new user without publicId, generate it on the insert path.
// Uses $setOnInsert so existing docs won't be modified.
const ensurePublicIdOnUpsert = async function(this: Query<unknown, IUser>, next: () => void) {
  const options = this.getOptions?.() as Record<string, unknown> | undefined;
  if (!options || options.upsert !== true) return next();

  const update = this.getUpdate() as Record<string, unknown> | null | undefined;
  if (!update || typeof update !== 'object' || Array.isArray(update)) return next();

  // If caller already provides publicId (in any supported place), don't override it.
  const isNonEmptyString = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

  const hasPublicId =
    isNonEmptyString((update as { publicId?: unknown }).publicId) ||
    isNonEmptyString((update as { $set?: { publicId?: unknown } }).$set?.publicId) ||
    isNonEmptyString((update as { $setOnInsert?: { publicId?: unknown } }).$setOnInsert?.publicId);

  if (hasPublicId) return next();

  const Model = (models.User || mongoose.model('User')) as Model<IUser>;
  const newPublicId = await generateUniquePublicId(Model);

  const updateObj = update as Record<string, unknown> & { $setOnInsert?: Record<string, unknown> };
  if (typeof updateObj.$setOnInsert !== 'object' || updateObj.$setOnInsert === null) {
    updateObj.$setOnInsert = {};
  }
  updateObj.$setOnInsert.publicId = newPublicId;

  next();
};

// CRITICAL: Prevent $unset operations on publicId and qrCode
// This hook catches update operations (findByIdAndUpdate, updateOne, updateMany, etc.)
// Define the hook function once and register it for each operation
const protectImmutableFields = async function(this: Query<unknown, IUser>, next: () => void) {
  const update = this.getUpdate() as Record<string, unknown> | null | undefined;
  const query = this.getQuery();
  
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
    
    // Check for direct $set operations that try to modify publicId or qrCode
    if ('$set' in updateObj && updateObj.$set && typeof updateObj.$set === 'object' && !Array.isArray(updateObj.$set)) {
      const set = updateObj.$set as Record<string, unknown>;
      
      // Protect publicId: prevent deletion or changes
      if ('publicId' in set) {
        if (set.publicId === null || set.publicId === undefined || set.publicId === '') {
          // Block deletion
          delete set.publicId;
          console.warn('[User Model] Blocked attempt to set publicId to null/undefined/empty');
        } else if (typeof set.publicId === 'string' && Object.keys(query).length > 0) {
          // Block changes: fetch existing publicId and restore if different
          try {
            const UserModel = (models.User || mongoose.model('User')) as Model<IUser>;
            const existingDoc = await UserModel.findOne(query).select('publicId').lean() as { publicId?: string } | null;
            if (existingDoc && existingDoc.publicId && set.publicId !== existingDoc.publicId) {
              // Store attempted value for logging
              const attemptedValue = set.publicId;
              // Restore original publicId
              set.publicId = existingDoc.publicId;
              console.warn(`[User Model] Blocked attempt to change publicId from "${existingDoc.publicId}" to "${attemptedValue}", restored original`);
            }
          } catch (err) {
            // If query fails, still block the change as a safety measure
            delete set.publicId;
            console.warn('[User Model] Error checking existing publicId, blocked change:', err);
          }
        }
      }
      
      // Protect qrCode: prevent deletion or changes
      if ('qrCode' in set) {
        if (set.qrCode === null || set.qrCode === undefined || set.qrCode === '') {
          // Block deletion
          delete set.qrCode;
          console.warn('[User Model] Blocked attempt to set qrCode to null/undefined/empty');
        } else if (typeof set.qrCode === 'string' && Object.keys(query).length > 0) {
          // Block changes: fetch existing qrCode and restore if different
          try {
            const UserModel = (models.User || mongoose.model('User')) as Model<IUser>;
            const existingDoc = await UserModel.findOne(query).select('qrCode').lean() as { qrCode?: string } | null;
            if (existingDoc && existingDoc.qrCode && set.qrCode !== existingDoc.qrCode) {
              // Restore original qrCode
              set.qrCode = existingDoc.qrCode;
              console.warn(`[User Model] Blocked attempt to change qrCode, restored original`);
            }
          } catch (err) {
            // If query fails, still block the change as a safety measure
            delete set.qrCode;
            console.warn('[User Model] Error checking existing qrCode, blocked change:', err);
          }
        }
      }
    }
    
    // Check for direct assignment (non-$set updates)
    if ('publicId' in updateObj) {
      if (updateObj.publicId === null || updateObj.publicId === undefined || updateObj.publicId === '') {
        // Block deletion
        delete updateObj.publicId;
        console.warn('[User Model] Blocked direct assignment of publicId to null/undefined/empty');
      } else if (typeof updateObj.publicId === 'string' && Object.keys(query).length > 0) {
        // Block changes: fetch existing publicId and restore if different
        try {
          const UserModel = (models.User || mongoose.model('User')) as Model<IUser>;
          const existingDoc = await UserModel.findOne(query).select('publicId').lean() as { publicId?: string } | null;
          if (existingDoc && existingDoc.publicId && updateObj.publicId !== existingDoc.publicId) {
            // Restore original publicId
            updateObj.publicId = existingDoc.publicId;
            console.warn(`[User Model] Blocked direct assignment change of publicId, restored original`);
          }
        } catch (err) {
          // If query fails, still block the change as a safety measure
          delete updateObj.publicId;
          console.warn('[User Model] Error checking existing publicId for direct assignment, blocked change:', err);
        }
      }
    }
    
    if ('qrCode' in updateObj) {
      if (updateObj.qrCode === null || updateObj.qrCode === undefined || updateObj.qrCode === '') {
        // Block deletion
        delete updateObj.qrCode;
        console.warn('[User Model] Blocked direct assignment of qrCode to null/undefined/empty');
      } else if (typeof updateObj.qrCode === 'string' && Object.keys(query).length > 0) {
        // Block changes: fetch existing qrCode and restore if different
        try {
          const UserModel = (models.User || mongoose.model('User')) as Model<IUser>;
          const existingDoc = await UserModel.findOne(query).select('qrCode').lean() as { qrCode?: string } | null;
          if (existingDoc && existingDoc.qrCode && updateObj.qrCode !== existingDoc.qrCode) {
            // Restore original qrCode
            updateObj.qrCode = existingDoc.qrCode;
            console.warn(`[User Model] Blocked direct assignment change of qrCode, restored original`);
          }
        } catch (err) {
          // If query fails, still block the change as a safety measure
          delete updateObj.qrCode;
          console.warn('[User Model] Error checking existing qrCode for direct assignment, blocked change:', err);
        }
      }
    }
  }
  
  next();
};

// Register upsert helper BEFORE protection so it can inject publicId for the insert path.
UserSchema.pre('updateOne', ensurePublicIdOnUpsert);
UserSchema.pre('updateMany', ensurePublicIdOnUpsert);
UserSchema.pre('findOneAndUpdate', ensurePublicIdOnUpsert);

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


