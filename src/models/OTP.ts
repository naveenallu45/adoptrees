import { Schema, models, model } from 'mongoose';

export interface IOTP {
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // Index created via schema.index() below - don't duplicate here
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Index created via schema.index() below - don't duplicate here
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster lookups
// Compound index for email and verified status
OTPSchema.index({ email: 1, verified: 1 });
// TTL index for auto-deleting expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = (models?.OTP || model<IOTP>('OTP', OTPSchema));

export default OTP;

