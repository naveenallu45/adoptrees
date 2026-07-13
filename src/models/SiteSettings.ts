import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSettings extends Document {
  key: string;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SiteSettings =
  (mongoose.models.SiteSettings as mongoose.Model<ISiteSettings>) ||
  mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);

export default SiteSettings;
