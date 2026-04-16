import api from './api';

export interface DiscoveryPodcast {
  id: string;
  title: string;
  rssUrl: string;
  description: string;
  author?: string;
  imageUrl?: string;
  language?: string;
  episodeCount?: number;
}

export interface DiscoveryResponse {
  source: 'podcastindex' | 'local';
  podcasts: DiscoveryPodcast[];
  count: number;
  message?: string;
}

export const discoveryService = {
  discoverPodcasts: async (
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<DiscoveryResponse> => {
    const response = await api.get('/podcasts/discover', {
      params: { q: query, limit, offset },
    });
    return response.data;
  },

  getTrendingPodcasts: async (limit: number = 20): Promise<DiscoveryResponse> => {
    const response = await api.get('/podcasts/trending', {
      params: { limit },
    });
    return response.data;
  },

  subscribeFromDiscovery: async (
    rssUrl: string,
    metadata?: {
      title?: string;
      author?: string;
      imageUrl?: string;
    }
  ): Promise<{ message: string; podcast: any }> => {
    const response = await api.post('/podcasts/subscribe-discovery', {
      rssUrl,
      ...metadata,
    });
    return response.data;
  },
};
