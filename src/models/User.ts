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
  role: 'user' | 'admin';
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
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
  },
  { timestamps: true }
);

// Ensure email is lowercase before saving
UserSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

const User = (models?.User || model<IUser>('User', UserSchema));

export default User;


