import { Request, Response } from 'express';
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

    const podcasts = subscriptions.map((sub) => sub.podcastId);

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

    if (existingSubscription) {
      return res.status(409).json({ message: 'Already subscribed to this podcast' });
    }

    // Create subscription
    const subscription = new UserSubscription({
      userId: req.user.id,
      podcastId: podcast._id,
    });

    await subscription.save();

    res.status(201).json({
      message: 'Subscribed successfully',
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
    res.status(500).json({ message: 'Failed to subscribe' });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { podcastId } = req.params;

    const subscription = await UserSubscription.findOneAndDelete({
      userId: req.user.id,
      podcastId,
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Failed to unsubscribe' });
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

    const results = await podcastIndexService.searchPodcasts(q as string, limit as number);

    res.json({
      source: 'itunes',
      podcasts: results,
      count: results.length,
    });
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

    // If not in database, create it from RSS
    if (!podcast) {
      try {
        const result = await rssParserService.createPodcastFromRss(rssUrl, {
          title: title || 'Unknown Podcast',
          description: '',
          author: author || '',
          imageUrl: imageUrl,
          episodes: [],
        });
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

    if (existingSubscription) {
      return res.status(409).json({ message: 'Already subscribed to this podcast' });
    }

    // Create subscription
    const subscription = new UserSubscription({
      userId: req.user.id,
      podcastId: podcast._id,
    });

    await subscription.save();

    res.status(201).json({
      message: 'Subscribed successfully',
      podcast: podcast.toJSON(),
    });
  } catch (error: any) {
    console.error('Subscribe from discovery error:', error);
    res.status(500).json({ message: 'Failed to subscribe' });
  }
};

export const getTrendingPodcasts = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const trending = await podcastIndexService.getTrendingPodcasts(limit);
    res.json({ source: 'itunes', podcasts: trending, count: trending.length });
  } catch (error: any) {
    console.error('Trending podcasts error:', error.message);
    // Return empty rather than crashing the page
    res.json({ source: 'itunes', podcasts: [], count: 0 });
  }
};
