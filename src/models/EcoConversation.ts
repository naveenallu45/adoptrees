import { Schema, model, models, Types } from 'mongoose';

export interface IEcoConversation {
  friendship: Types.ObjectId;
  participants: Types.ObjectId[];
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EcoConversationSchema = new Schema<IEcoConversation>(
  {
    friendship: {
      type: Schema.Types.ObjectId,
      ref: 'EcoFriendship',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    lastMessageAt: { type: Date },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

const EcoConversation =
  models.EcoConversation || model<IEcoConversation>('EcoConversation', EcoConversationSchema);

export default EcoConversation;
