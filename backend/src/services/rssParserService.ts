import Parser from 'rss-parser';
import { Podcast } from '../models/Podcast';
import { Episode } from '../models/Episode';
import { getRedis } from '../config/redis';

const parser = new Parser({
  timeout: 30000, // Increased to 30 seconds for complex feeds
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['itunes:summary', 'itunesSummary'],
      ['itunes:subtitle', 'itunesSubtitle'],
      ['itunes:duration', 'itunesDuration'],
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

      // Robust image extraction
      let imageUrl = feed.image?.url;
      if (!imageUrl && feed.itunes?.image) {
        imageUrl = typeof feed.itunes.image === 'string' ? feed.itunes.image : (feed.itunes.image as any).href;
      }

      // Robust author extraction
      const author = feed.author || feed.creator || feed.itunes?.author || (feed as any).managingEditor || '';

      // Robust description extraction
      const description = feed.description || feed.itunes?.summary || feed.itunes?.subtitle || (feed as any).content || '';

      console.log(`[RSS Parser] Meta Extracted for "${feed.title}": Author: ${author}, Image: ${!!imageUrl}`);

      return {
        title: feed.title,
        description: description,
        author: author,
        imageUrl: imageUrl,
        language: feed.language?.split('-')[0].toLowerCase() || '',
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

    // Try finding mp3 in link or guid
    const mp3Regex = /\.mp3($|\?)/i;
    if (item.link && mp3Regex.test(item.link)) {
      return item.link;
    }
    if (item.guid && mp3Regex.test(item.guid)) {
      return item.guid;
    }

    // Try finding mp3 in content:encoded
    if (item['content:encoded']) {
      const match = item['content:encoded'].match(/href=["']([^"']*\.mp3[^"']*)["']/);
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
      return typeof item.itunes.image === 'string' ? item.itunes.image : (item.itunes.image as any).href;
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
  parseEpisodes: (items: any[], podcastImage?: string, rssUrl: string = ''): ParsedEpisode[] => {
    const parsed = items
      .filter((item) => {
        const audioUrl = rssParserService.extractAudioUrl(item);
        const hasTitle = !!item.title;
        
        if (!audioUrl || !hasTitle) {
          // Log only a sample to avoid flooding, but enough to debug
          if (items.indexOf(item) === 0) {
            console.log(`[RSS Debug] Item check failed for "${item.title || 'Untitled'}": Audio: ${!!audioUrl}, RSS URL Sample: ${rssUrl.substring(0, 30)}...`);
            if (!audioUrl) console.log(`[RSS Debug] Available keys for item: ${Object.keys(item).join(', ')}`);
          }
        }
        
        return !!audioUrl && hasTitle;
      });

    return parsed.map((item) => ({
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
  syncPodcastEpisodes: async (podcastId: string, rssUrl: string, force: boolean = false) => {
    try {
      const redis = getRedis();
      const cacheKey = `podcast:${podcastId}:sync`;

      // Check cache unless forced
      if (!force) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[RSS Sync] Returning cached result for ${podcastId}`);
          return JSON.parse(cached);
        }
      } else {
        console.log(`[RSS Sync] Force sync requested for ${podcastId}`);
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

      // Refresh podcast metadata from fresh RSS data (fixes "Unknown Podcast" legacy records)
      if (feedData.title && feedData.title !== 'Unknown Podcast') {
        podcast.title = feedData.title;
      }
      if (feedData.author && (!podcast.author || podcast.author.trim() === '' || force)) {
        podcast.author = feedData.author;
      }
      if (feedData.imageUrl && (!podcast.imageUrl || force)) {
        podcast.imageUrl = feedData.imageUrl;
      }
      if (feedData.description && (!podcast.description || force)) {
        podcast.description = feedData.description;
      }
      if (feedData.language && (!podcast.language || force)) {
        podcast.language = feedData.language;
      }

      if (episodes.length > 0) {
        podcast.lastEpisodeTitle = episodes[0].title;
        podcast.lastEpisodeDate = episodes[0].pubDate;
      }
      
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

      // Always parse feed to get fresh description and episodes, even if partial data provided
      if (!feedData || !feedData.description || !feedData.episodes || feedData.episodes.length === 0) {
        const freshData = await rssParserService.parseFeed(rssUrl);
        feedData = { ...feedData, ...freshData };
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
      const episodes = rssParserService.parseEpisodes(feedData.episodes, feedData.imageUrl, rssUrl);

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
      
      if (episodes.length > 0) {
        console.log(`[RSS Parser] Setting last episode for ${podcast.title}: ${episodes[0].title} (${episodes[0].pubDate})`);
        podcast.lastEpisodeTitle = episodes[0].title;
        podcast.lastEpisodeDate = episodes[0].pubDate;
      } else {
        console.warn(`[RSS Parser] No episodes found for ${podcast.title} during creation.`);
      }
      
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
