import mongoose, { Schema, Document } from 'mongoose';

export interface IPodcast extends Document {
  title: string;
  description: string;
  rssUrl: string;
  imageUrl?: string;
  author: string;
  category: string[];
  language: string;
  lastFetched: Date;
  episodeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const podcastSchema = new Schema<IPodcast>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    rssUrl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    author: {
      type: String,
      trim: true,
    },
    category: {
      type: [String],
      default: [],
    },
    language: {
      type: String,
      default: 'en',
    },
    lastFetched: {
      type: Date,
      default: () => new Date(0), // Start with epoch
    },
    episodeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
podcastSchema.index({ rssUrl: 1 });
podcastSchema.index({ title: 'text', description: 'text', author: 'text' });
podcastSchema.index({ category: 1 });

export const Podcast = mongoose.model<IPodcast>('Podcast', podcastSchema);
