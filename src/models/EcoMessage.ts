import { Schema, model, models, Types } from 'mongoose';

export interface IEcoMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  body: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EcoMessageSchema = new Schema<IEcoMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'EcoConversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    readAt: { type: Date },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

const EcoMessage = models.EcoMessage || model<IEcoMessage>('EcoMessage', EcoMessageSchema);

export default EcoMessage;
