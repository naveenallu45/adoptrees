import mongoose, { Document, Schema } from 'mongoose';

export interface IHockeyMatch extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const HockeyMatchSchema = new Schema<IHockeyMatch>(
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
  mongoose.model<IHockeyMatch>('HockeyMatch', HockeyMatchSchema)) as mongoose.Model<IHockeyMatch>;

