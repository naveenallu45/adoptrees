import mongoose, { Document, Schema } from 'mongoose';

export interface HockeyMatchFields {
  matchId: string;
  tournament: string;
  venue: string;
  homeTeam: {
    name: string;
    code: string;
    flagUrl?: string;
  };
  awayTeam: {
    name: string;
    code: string;
    flagUrl?: string;
  };
  matchDate: Date;
  penaltyCorners: number;
  fieldGoals: number;
  treesPerPenaltyCorner: number;
  treesPerFieldGoal: number;
  treesPlanted: number;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type IHockeyMatch = HockeyMatchFields & Document;

const HockeyMatchSchema = new Schema<HockeyMatchFields>(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tournament: {
      type: String,
      default: 'FIH Hockey World Cup 2026 Qualifiers',
      trim: true,
    },
    venue: {
      type: String,
      default: 'Gachibowli Stadium, Hyderabad, Telangana',
      trim: true,
    },
    homeTeam: {
      name: { type: String, required: true, trim: true },
      code: { type: String, required: true, trim: true, uppercase: true },
      flagUrl: { type: String },
    },
    awayTeam: {
      name: { type: String, required: true, trim: true },
      code: { type: String, required: true, trim: true, uppercase: true },
      flagUrl: { type: String },
    },
    matchDate: {
      type: Date,
      required: true,
    },
    penaltyCorners: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    fieldGoals: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    treesPerPenaltyCorner: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
    },
    treesPerFieldGoal: {
      type: Number,
      required: true,
      min: 0,
      default: 100,
    },
    treesPlanted: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    location: {
      latitude: {
        type: Number,
        required: false,
      },
      longitude: {
        type: Number,
        required: false,
      },
      radiusMeters: {
        type: Number,
        required: false,
        default: 300,
        min: 10,
      },
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

HockeyMatchSchema.virtual('totalTreesEstimated').get(function (this: IHockeyMatch) {
  return this.penaltyCorners * this.treesPerPenaltyCorner + this.fieldGoals * this.treesPerFieldGoal;
});

export default (mongoose.models?.HockeyMatch ||
  mongoose.model<HockeyMatchFields>('HockeyMatch', HockeyMatchSchema)) as mongoose.Model<HockeyMatchFields>;

