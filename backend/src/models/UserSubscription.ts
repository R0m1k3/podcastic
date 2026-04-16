import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  podcastId: mongoose.Types.ObjectId;
  subscribedAt: Date;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSubscriptionSchema = new Schema<IUserSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    podcastId: {
      type: Schema.Types.ObjectId,
      ref: 'Podcast',
      required: true,
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: () => new Date(),
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique subscription per user
userSubscriptionSchema.index({ userId: 1, podcastId: 1 }, { unique: true });
userSubscriptionSchema.index({ userId: 1, isFavorite: 1 });

export const UserSubscription = mongoose.model<IUserSubscription>(
  'UserSubscription',
  userSubscriptionSchema
);
