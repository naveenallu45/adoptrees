import { Schema, model, models, Types } from 'mongoose';

export type EcoFriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface IEcoFriendRequest {
  requester: Types.ObjectId;
  receiver: Types.ObjectId;
  pairKey: string;
  status: EcoFriendRequestStatus;
  actedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EcoFriendRequestSchema = new Schema<IEcoFriendRequest>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pairKey: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      required: true,
    },
    actedAt: { type: Date },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

const EcoFriendRequest =
  models.EcoFriendRequest || model<IEcoFriendRequest>('EcoFriendRequest', EcoFriendRequestSchema);

export default EcoFriendRequest;
