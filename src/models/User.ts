import { Schema, models, model } from 'mongoose';

export type UserType = 'individual' | 'company';

export interface IUser {
  name?: string;
  companyName?: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  passwordHash: string;
  userType: UserType;
  role: 'user' | 'admin' | 'wellwisher';
  publicId?: string;
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
      unique: true, 
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    phone: { type: String },
    gstNumber: { type: String },
    passwordHash: { type: String, required: true, select: false },
    userType: { type: String, enum: ['individual', 'company'], required: true },
    role: { type: String, enum: ['user', 'admin', 'wellwisher'], default: 'user', required: true },
    publicId: { type: String, unique: true, index: true, sparse: true },
  },
  { timestamps: true }
);

// Ensure email is lowercase and publicId exists before saving
UserSchema.pre('save', async function(next) {
  if (this.email) {
    // @ts-ignore - mongoose doc mutability
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
  next();
});

const User = (models?.User || model<IUser>('User', UserSchema));

export default User;


