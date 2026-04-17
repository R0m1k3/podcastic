import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Podcast } from '../models/Podcast';
import { UserSubscription } from '../models/UserSubscription';
import { Episode } from '../models/Episode';
import { podcastIndexService } from '../services/podcastIndexService';
import { rssParserService } from '../services/rssParserService';
import { z } from 'zod';

const subscribeSchema = z.object({
  rssUrl: z.string().url('Invalid RSS URL'),
});

const searchSchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const getUserSubscriptions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const subscriptions = await UserSubscription.find({
      userId: req.user.id,
    })
      .populate('podcastId')
      .sort({ subscribedAt: -1 });

    const podcasts = subscriptions.map((sub) => {
      const podcastObj = (sub.podcastId as any).toJSON();
      return {
        ...podcastObj,
        subscriptionId: sub._id.toString(),
      };
    });

    res.json({ podcasts, count: podcasts.length });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
};

export const subscribe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { rssUrl } = subscribeSchema.parse(req.body);

    // Check if podcast exists
    let podcast = await Podcast.findOne({ rssUrl });

    if (!podcast) {
      // Parse RSS feed
      const feedData = await rssParserService.parseFeed(rssUrl);
      const episodes = rssParserService.parseEpisodes(feedData.episodes, feedData.imageUrl, rssUrl);
      try {
        const result = await rssParserService.createPodcastFromRss(rssUrl);
        podcast = await Podcast.findById(result.podcast._id);
      } catch (error: any) {
        if (error.message.includes('already in database')) {
          podcast = await Podcast.findOne({ rssUrl });
        } else {
          return res.status(400).json({
            message: `Impossible de récupérer le podcast : ${error.message}`,
          });
        }
      }
    }

    if (!podcast) {
      return res.status(400).json({ message: "Impossible d'ajouter le podcast" });
    }

    // Check if already subscribed
    const existingSubscription = await UserSubscription.findOne({
      userId: req.user.id,
      podcastId: podcast._id,
    });

    if (!existingSubscription) {
      const subscription = new UserSubscription({
        userId: req.user.id,
        podcastId: podcast._id,
      });
      await subscription.save();
    }

    res.status(200).json({
      message: existingSubscription ? 'Déjà abonné' : 'Abonnement réussi',
      podcast: podcast.toJSON(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }

    console.error('Subscribe error:', error);
    res.status(500).json({ message: "Impossible de s'abonner" });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { podcastId } = req.params;

    // Log the request
    console.log(`[Unsubscribe] User ${req.user.id} attempting to remove: ${podcastId}`);

    // Method 1: Try deletion by Subscription ID (New robust method)
    let subscription = await UserSubscription.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(podcastId),
      userId: new mongoose.Types.ObjectId(req.user.id),
    });

    // Method 2: Fallback to Podcast ID if Method 1 found nothing (Old compatibility method)
    if (!subscription) {
      console.log(`[Unsubscribe] Not found by Subscription ID, trying by Podcast ID: ${podcastId}`);
      subscription = await UserSubscription.findOneAndDelete({
        userId: new mongoose.Types.ObjectId(req.user.id),
        podcastId: new mongoose.Types.ObjectId(podcastId),
      });
    }

    if (!subscription) {
      console.warn(`[Unsubscribe] No subscription record found for deletion.`);
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Cast to any to avoid TypeScript error with ModifyResult in logs
    const result = subscription as any;
    console.log(`[Unsubscribe] Successfully removed subscription ${result._id}`);
    res.json({ message: 'Unsubscribed successfully', deletedId: result._id });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Failed to unsubscribe' });
  }
};

export const syncPodcast = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { podcastId } = req.params;
    const podcast = await Podcast.findById(podcastId);

    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    console.log(`[Sync] Triggering manual sync for podcast: ${podcast.title} (${podcastId})`);
    const result = await rssParserService.syncPodcastEpisodes(podcastId, podcast.rssUrl, true);

    res.json(result);
  } catch (error: any) {
    console.error('Manual sync error:', error);
    res.status(500).json({ message: error.message || 'Failed to sync podcast' });
  }
};

export const searchPodcasts = async (req: Request, res: Response) => {
  try {
    const { q, limit = 20, skip = 0 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const podcasts = await Podcast.find(
      { $text: { $search: q as string } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(Number(limit))
      .skip(Number(skip));

    res.json({ podcasts, count: podcasts.length });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

export const getPodcast = async (req: Request, res: Response) => {
  try {
    const { podcastId } = req.params;

    const podcast = await Podcast.findById(podcastId);
    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    res.json({ podcast });
  } catch (error) {
    console.error('Get podcast error:', error);
    res.status(500).json({ message: 'Failed to fetch podcast' });
  }
};

export const discoverPodcasts = async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = searchSchema.parse(req.query);
    const query = q as string;
    const lim = limit as number;

    // 1. Try iTunes Search API
    try {
      const results = await podcastIndexService.searchPodcasts(query, lim);
      if (results.length > 0) {
        return res.json({ source: 'itunes', podcasts: results, count: results.length });
      }
      console.log(`[Discover] iTunes returned 0 results for "${query}", trying local DB`);
    } catch (itunesError: any) {
      console.error(`[Discover] iTunes failed for "${query}":`, itunesError.message);
    }

    // 2. Fallback: search local DB podcasts already in the system
    const localPodcasts = await Podcast.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    }).limit(lim);

    const mapped = localPodcasts.map((p: any) => ({
      id: p._id.toString(),
      title: p.title,
      rssUrl: p.rssUrl,
      description: p.description || '',
      author: p.author || '',
      imageUrl: p.imageUrl,
      episodeCount: p.episodeCount,
    }));

    return res.json({ source: 'local', podcasts: mapped, count: mapped.length });
  } catch (error: any) {
    console.error('Discover podcasts error:', error.message);
    res.json({ source: 'itunes', podcasts: [], count: 0 });
  }
};

export const subscribeFromDiscovery = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { rssUrl, title, author, imageUrl } = req.body;

    if (!rssUrl) {
      return res.status(400).json({ message: 'RSS URL required' });
    }

    // Check if podcast already in database
    let podcast = await Podcast.findOne({ rssUrl });

    // If not in database, create it from RSS (parse feed for real episodes)
    if (!podcast) {
      try {
        const result = await rssParserService.createPodcastFromRss(rssUrl);
        // Refetch as a proper Mongoose document (result.podcast is a plain object)
        podcast = await Podcast.findById(result.podcast._id);
      } catch (error: any) {
        if (error.message.includes('already in database')) {
          podcast = await Podcast.findOne({ rssUrl });
        } else {
          return res.status(400).json({
            message: `Impossible de récupérer le podcast : ${error.message}`,
          });
        }
      }
    }

    if (!podcast) {
      return res.status(400).json({ message: "Impossible d'ajouter le podcast" });
    }

    // Check if already subscribed
    const existingSubscription = await UserSubscription.findOne({
      userId: req.user.id,
      podcastId: podcast._id,
    });

    if (!existingSubscription) {
      const subscription = new UserSubscription({
        userId: req.user.id,
        podcastId: podcast._id,
      });
      await subscription.save();
    }

    res.status(200).json({
      message: existingSubscription ? 'Déjà abonné' : 'Abonnement réussi',
      podcast: podcast.toJSON(),
    });
  } catch (error: any) {
    console.error('Subscribe from discovery error:', error);
    res.status(500).json({ message: "Impossible de s'abonner" });
  }
};

export const getTrendingPodcasts = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const genre = req.query.genre as string;
    const trending = await podcastIndexService.getTrendingPodcasts(limit, genre);
    res.json({ source: 'itunes', podcasts: trending, count: trending.length });
  } catch (error: any) {
    console.error('Trending podcasts error:', error.message);
    // Return empty rather than crashing the page
    res.json({ source: 'itunes', podcasts: [], count: 0 });
  }
};
