import Parser from 'rss-parser';
import { Podcast } from '../models/Podcast';
import { Episode } from '../models/Episode';
import { getRedis } from '../config/redis';

const parser = new Parser({
  timeout: 20000, // 20 second timeout
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
    ],
  },
});

interface ParsedEpisode {
  title: string;
  description: string;
  audioUrl: string;
  pubDate: Date;
  duration: number;
  guid: string;
  imageUrl?: string;
}

/**
 * Parse RSS feed and extract podcast & episode data
 */
export const rssParserService = {
  /**
   * Parse RSS feed from URL
   */
  parseFeed: async (rssUrl: string) => {
    try {
      const feed = await parser.parseURL(rssUrl);

      if (!feed.title) {
        throw new Error('Invalid RSS feed - missing title');
      }

      return {
        title: feed.title,
        description: feed.description || '',
        author: feed.author || feed.creator || '',
        imageUrl: feed.image?.url || feed.itunes?.image,
        language: feed.language || 'en',
        episodes: feed.items || [],
      };
    } catch (error: any) {
      console.error('RSS parsing error:', error.message);
      throw new Error(`Failed to parse RSS feed: ${error.message}`);
    }
  },

  /**
   * Extract audio URL from episode item
   */
  extractAudioUrl: (item: any): string | null => {
    // Try enclosure first (standard RSS)
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // Try media:content
    if (item.mediaContent?.url) {
      return item.mediaContent.url;
    }

    // Try iTunes:duration for audio detection
    if (item['content:encoded']) {
      const match = item['content:encoded'].match(/href=["']([^"']*\.mp3)["']/);
      if (match) return match[1];
    }

    return null;
  },

  /**
   * Extract episode duration in seconds
   */
  extractDuration: (item: any): number => {
    // Try iTunes duration
    if (item.itunes?.duration) {
      const duration = item.itunes.duration;
      // Handle "HH:MM:SS" or "MM:SS" or seconds format
      if (typeof duration === 'string') {
        const parts = duration.split(':').map(Number);
        if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
          return parts[0];
        }
      }
      if (typeof duration === 'number') {
        return duration;
      }
    }

    return 0;
  },

  /**
   * Extract episode image URL
   */
  extractImageUrl: (item: any, podcastImage?: string): string | undefined => {
    // Try iTunes image first
    if (item.itunes?.image) {
      return item.itunes.image;
    }

    // Try media content
    if (item.mediaContent?.medium === 'image') {
      return item.mediaContent.url;
    }

    // Fall back to podcast image
    return podcastImage;
  },

  /**
   * Parse episodes from RSS feed items
   */
  parseEpisodes: (items: any[], podcastImage?: string): ParsedEpisode[] => {
    return items
      .filter((item) => {
        const audioUrl = rssParserService.extractAudioUrl(item);
        return !!audioUrl && !!item.title; // Must have both audio and title
      })
      .map((item) => ({
        title: item.title || 'Untitled Episode',
        description: item.contentSnippet || item.description || '',
        audioUrl: rssParserService.extractAudioUrl(item) || '',
        pubDate: new Date(item.pubDate || Date.now()),
        duration: rssParserService.extractDuration(item),
        guid: item.guid || item.link || `${item.title}-${item.pubDate}`,
        imageUrl: rssParserService.extractImageUrl(item, podcastImage),
      }))
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()); // Sort newest first
  },

  /**
   * Fetch and sync podcast episodes
   */
  syncPodcastEpisodes: async (podcastId: string, rssUrl: string) => {
    try {
      const redis = getRedis();

      // Check cache first
      const cacheKey = `podcast:${podcastId}:sync`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const podcast = await Podcast.findById(podcastId);
      if (!podcast) {
        throw new Error('Podcast not found');
      }

      // Parse RSS feed
      const feedData = await rssParserService.parseFeed(rssUrl);
      const episodes = rssParserService.parseEpisodes(feedData.episodes, feedData.imageUrl);

      // Upsert episodes
      const createdCount = await Promise.all(
        episodes.map(async (episodeData) => {
          const existing = await Episode.findOne({
            podcastId,
            guid: episodeData.guid,
          });

          if (!existing) {
            const episode = new Episode({
              podcastId,
              title: episodeData.title,
              description: episodeData.description,
              audioUrl: episodeData.audioUrl,
              pubDate: episodeData.pubDate,
              duration: episodeData.duration,
              guid: episodeData.guid,
              imageUrl: episodeData.imageUrl,
            });

            await episode.save();
            return 1;
          }
          return 0;
        })
      );

      const newCount = createdCount.filter((c) => c === 1).length;

      // Update podcast metadata
      podcast.lastFetched = new Date();
      podcast.episodeCount = await Episode.countDocuments({ podcastId });
      await podcast.save();

      const result = {
        success: true,
        newEpisodes: newCount,
        totalEpisodes: podcast.episodeCount,
        lastFetched: podcast.lastFetched,
      };

      // Cache for 6 hours
      await redis.setEx(cacheKey, 6 * 60 * 60, JSON.stringify(result));

      return result;
    } catch (error: any) {
      console.error('Podcast sync error:', error.message);
      throw error;
    }
  },

  /**
   * Create new podcast from RSS feed
   */
  createPodcastFromRss: async (
    rssUrl: string,
    feedData?: any
  ): Promise<{
    podcast: any;
    episodes: number;
  }> => {
    try {
      // Check if podcast already exists
      let podcast = await Podcast.findOne({ rssUrl });
      if (podcast) {
        throw new Error('Podcast already in database');
      }

      // Parse feed if not provided
      if (!feedData) {
        feedData = await rssParserService.parseFeed(rssUrl);
      }

      // Create podcast
      podcast = new Podcast({
        title: feedData.title,
        description: feedData.description,
        rssUrl,
        imageUrl: feedData.imageUrl,
        author: feedData.author,
        language: feedData.language || 'en',
        category: [],
        episodeCount: 0,
      });

      await podcast.save();

      // Parse and create episodes
      const episodes = rssParserService.parseEpisodes(feedData.episodes, feedData.imageUrl);

      for (const episodeData of episodes) {
        const episode = new Episode({
          podcastId: podcast._id,
          title: episodeData.title,
          description: episodeData.description,
          audioUrl: episodeData.audioUrl,
          pubDate: episodeData.pubDate,
          duration: episodeData.duration,
          guid: episodeData.guid,
          imageUrl: episodeData.imageUrl,
        });

        try {
          await episode.save();
        } catch (error) {
          // Skip duplicate episodes
          console.log(`Skipping duplicate episode: ${episodeData.guid}`);
        }
      }

      podcast.episodeCount = await Episode.countDocuments({ podcastId: podcast._id });
      podcast.lastFetched = new Date();
      await podcast.save();

      return {
        podcast: podcast.toJSON(),
        episodes: podcast.episodeCount,
      };
    } catch (error: any) {
      console.error('Create podcast error:', error.message);
      throw error;
    }
  },
};
