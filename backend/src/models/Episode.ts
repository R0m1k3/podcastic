import mongoose, { Schema, Document } from 'mongoose';

export interface IEpisode extends Document {
  podcastId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  audioUrl: string;
  pubDate: Date;
  duration: number; // in seconds
  guid: string; // unique identifier from RSS
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const episodeSchema = new Schema<IEpisode>(
  {
    podcastId: {
      type: Schema.Types.ObjectId,
      ref: 'Podcast',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    audioUrl: {
      type: String,
      required: true,
    },
    pubDate: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    guid: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique episode per podcast
episodeSchema.index({ podcastId: 1, guid: 1 }, { unique: true });
episodeSchema.index({ pubDate: -1 });
episodeSchema.index({ title: 'text', description: 'text' });

export const Episode = mongoose.model<IEpisode>('Episode', episodeSchema);
