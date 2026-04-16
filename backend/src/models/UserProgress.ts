import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  episodeId: mongoose.Types.ObjectId;
  position: number; // seconds listened
  isCompleted: boolean;
  isSaved: boolean;
  lastListenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProgressSchema = new Schema<IUserProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    episodeId: {
      type: Schema.Types.ObjectId,
      ref: 'Episode',
      required: true,
      index: true,
    },
    position: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
    lastListenedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique progress per user per episode
userProgressSchema.index({ userId: 1, episodeId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1, lastListenedAt: -1 });
userProgressSchema.index({ userId: 1, isCompleted: 1 });
userProgressSchema.index({ userId: 1, isSaved: 1 });

export const UserProgress = mongoose.model<IUserProgress>('UserProgress', userProgressSchema);
