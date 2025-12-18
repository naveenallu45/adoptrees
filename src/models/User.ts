import { Schema, models, model } from 'mongoose';

export type UserType = 'individual' | 'company';

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
    userType: { type: String, enum: ['individual', 'company'], required: true },
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
  if (!this.publicId) {
    const generatePublicId = () => {
      const random = Math.random().toString(36).slice(2, 8);
      const timestamp = Date.now().toString(36).slice(-4);
      return `${random}${timestamp}`.toLowerCase();
    };
    this.publicId = generatePublicId();
  }
  // Note: QR code generation is handled in registration route, not here
  // to avoid requiring QRCode library in the model file
  next();
});

const User = (models?.User || model<IUser>('User', UserSchema));

export default User;


