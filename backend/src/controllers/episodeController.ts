import { Request, Response } from 'express';
import { Episode } from '../models/Episode';
import { UserProgress } from '../models/UserProgress';
import { UserSubscription } from '../models/UserSubscription';

export const getLatestEpisodes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { limit = 30, skip = 0 } = req.query;

    // Get user's subscribed podcasts
    const subscriptions = await UserSubscription.find({
      userId: req.user.id,
    }).select('podcastId');

    const podcastIds = subscriptions.map((sub) => sub.podcastId);

    if (podcastIds.length === 0) {
      return res.json({ episodes: [], count: 0 });
    }

    // Get latest episodes from subscribed podcasts
    const episodes = await Episode.find({
      podcastId: { $in: podcastIds },
    })
      .populate('podcastId', 'title author imageUrl')
      .sort({ pubDate: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    res.json({ episodes, count: episodes.length });
  } catch (error) {
    console.error('Get latest episodes error:', error);
    res.status(500).json({ message: 'Failed to fetch episodes' });
  }
};

export const getPodcastEpisodes = async (req: Request, res: Response) => {
  try {
    const { podcastId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const episodes = await Episode.find({ podcastId })
      .sort({ pubDate: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    res.json({ episodes, count: episodes.length });
  } catch (error) {
    console.error('Get podcast episodes error:', error);
    res.status(500).json({ message: 'Failed to fetch episodes' });
  }
};

export const getEpisode = async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;

    const episode = await Episode.findById(episodeId).populate(
      'podcastId',
      'title author description imageUrl'
    );

    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    res.json({ episode });
  } catch (error) {
    console.error('Get episode error:', error);
    res.status(500).json({ message: 'Failed to fetch episode' });
  }
};

export const saveProgress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { episodeId, position, isCompleted } = req.body;

    if (!episodeId || position === undefined) {
      return res.status(400).json({ message: 'Episode ID and position required' });
    }

    // Find or create progress record
    let progress = await UserProgress.findOne({
      userId: req.user.id,
      episodeId,
    });

    if (progress) {
      progress.position = position;
      if (isCompleted !== undefined) {
        progress.isCompleted = isCompleted;
      }
      progress.lastListenedAt = new Date();
    } else {
      progress = new UserProgress({
        userId: req.user.id,
        episodeId,
        position,
        isCompleted: isCompleted || false,
        lastListenedAt: new Date(),
      });
    }

    await progress.save();

    res.json({
      message: 'Progress saved',
      progress,
    });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ message: 'Failed to save progress' });
  }
};

export const getProgress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { episodeId } = req.params;

    const progress = await UserProgress.findOne({
      userId: req.user.id,
      episodeId,
    });

    if (!progress) {
      return res.json({ progress: null, message: 'No progress found' });
    }

    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
};
