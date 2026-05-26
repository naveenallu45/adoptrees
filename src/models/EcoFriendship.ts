import { Schema, model, models, Types } from 'mongoose';

export interface IEcoFriendship {
  userA: Types.ObjectId;
  userB: Types.ObjectId;
  pairKey: string;
  createdFromRequest?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function getEcoFriendPairKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join(':');
}

const EcoFriendshipSchema = new Schema<IEcoFriendship>(
  {
    userA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pairKey: {
      type: String,
      required: true,
      trim: true,
    },
    createdFromRequest: {
      type: Schema.Types.ObjectId,
      ref: 'EcoFriendRequest',
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

const EcoFriendship =
  models.EcoFriendship || model<IEcoFriendship>('EcoFriendship', EcoFriendshipSchema);

export default EcoFriendship;
