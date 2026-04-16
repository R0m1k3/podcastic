import axios from 'axios';
import crypto from 'crypto';

/**
 * PodcastIndex API Service
 * Integrates with Podcast Index API for podcast search and data
 * https://podcastindex-api.com/
 */

interface PodcastIndexResponse {
  status: string;
  feeds: Array<{
    id: number;
    title: string;
    url: string;
    description: string;
    author?: string;
    image?: string;
    artwork?: string;
    language?: string;
    categories?: Record<string, string>;
    lastUpdate?: number;
    episodeCount?: number;
  }>;
  count: number;
}

interface SearchResult {
  id: string;
  title: string;
  rssUrl: string;
  description: string;
  author?: string;
  imageUrl?: string;
  language?: string;
  episodeCount?: number;
}

const API_KEY = process.env.PODCAST_INDEX_API_KEY;
const API_SECRET = process.env.PODCAST_INDEX_API_SECRET;
const API_BASE = 'https://api.podcastindex.org/api/1.0';

// Create auth headers for PodcastIndex API
const getAuthHeaders = () => {
  if (!API_KEY || !API_SECRET) {
    throw new Error('PodcastIndex API credentials not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const auth = `${API_KEY}${API_SECRET}${timestamp}`;
  const authHash = crypto.createHash('sha1').update(auth).digest('hex');

  return {
    'X-Auth-Date': timestamp.toString(),
    'X-Auth-Digest': authHash,
    'User-Agent': 'Podcastic (https://podcastic.app)',
  };
};

export const podcastIndexService = {
  /**
   * Search for podcasts by query
   */
  searchPodcasts: async (
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> => {
    try {
      if (!query || query.trim().length < 2) {
        throw new Error('Search query too short (minimum 2 characters)');
      }

      const response = await axios.get<PodcastIndexResponse>(
        `${API_BASE}/podcasts/search`,
        {
          params: {
            q: query,
            limit: Math.min(limit, 50), // Cap at 50
            offset,
          },
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );

      if (!response.data.feeds) {
        return [];
      }

      return response.data.feeds.map((feed) => ({
        id: feed.id.toString(),
        title: feed.title,
        rssUrl: feed.url,
        description: feed.description || '',
        author: feed.author || '',
        imageUrl: feed.artwork || feed.image,
        language: feed.language || 'en',
        episodeCount: feed.episodeCount,
      }));
    } catch (error: any) {
      console.error('PodcastIndex search error:', error.message);

      // Return empty array instead of throwing to graceful degrade
      if (error.response?.status === 429) {
        throw new Error('Search rate limited. Please try again later.');
      }
      if (error.response?.status === 401) {
        throw new Error('PodcastIndex API authentication failed');
      }

      throw new Error(`Search failed: ${error.message}`);
    }
  },

  /**
   * Get podcast by RSS URL
   */
  getPodcastByRssUrl: async (rssUrl: string): Promise<SearchResult | null> => {
    try {
      const response = await axios.get<PodcastIndexResponse>(
        `${API_BASE}/podcasts/byfeedurl`,
        {
          params: { url: rssUrl },
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );

      if (!response.data.feeds || response.data.feeds.length === 0) {
        return null;
      }

      const feed = response.data.feeds[0];
      return {
        id: feed.id.toString(),
        title: feed.title,
        rssUrl: feed.url,
        description: feed.description || '',
        author: feed.author || '',
        imageUrl: feed.artwork || feed.image,
        language: feed.language || 'en',
        episodeCount: feed.episodeCount,
      };
    } catch (error: any) {
      console.error('PodcastIndex lookup error:', error.message);
      return null;
    }
  },

  /**
   * Search by podcast title
   */
  searchByTitle: async (title: string, limit: number = 10): Promise<SearchResult[]> => {
    try {
      const response = await axios.get<PodcastIndexResponse>(
        `${API_BASE}/podcasts/search`,
        {
          params: {
            q: title,
            limit: Math.min(limit, 30),
          },
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );

      if (!response.data.feeds) {
        return [];
      }

      return response.data.feeds.map((feed) => ({
        id: feed.id.toString(),
        title: feed.title,
        rssUrl: feed.url,
        description: feed.description || '',
        author: feed.author || '',
        imageUrl: feed.artwork || feed.image,
        language: feed.language || 'en',
        episodeCount: feed.episodeCount,
      }));
    } catch (error: any) {
      console.error('Title search error:', error.message);
      return [];
    }
  },

  /**
   * Get trending podcasts
   */
  getTrendingPodcasts: async (limit: number = 20): Promise<SearchResult[]> => {
    try {
      const response = await axios.get<PodcastIndexResponse>(
        `${API_BASE}/podcasts/trending`,
        {
          params: { limit: Math.min(limit, 50) },
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );

      if (!response.data.feeds) {
        return [];
      }

      return response.data.feeds.map((feed) => ({
        id: feed.id.toString(),
        title: feed.title,
        rssUrl: feed.url,
        description: feed.description || '',
        author: feed.author || '',
        imageUrl: feed.artwork || feed.image,
        language: feed.language || 'en',
        episodeCount: feed.episodeCount,
      }));
    } catch (error: any) {
      console.error('Trending podcasts error:', error.message);
      return [];
    }
  },

  /**
   * Check if API credentials are configured
   */
  isConfigured: (): boolean => {
    return !!(API_KEY && API_SECRET);
  },
};
