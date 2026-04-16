import api from './api';

export interface Podcast {
  _id: string;
  title: string;
  description: string;
  rssUrl: string;
  imageUrl?: string;
  author: string;
  category: string[];
  language: string;
  episodeCount: number;
  lastEpisodeTitle?: string;
  lastEpisodeDate?: string;
  lastFetched: string;
  subscriptionId?: string;
}

export interface PodcastResponse {
  podcasts: Podcast[];
  count: number;
}

export const podcastService = {
  getUserSubscriptions: async (): Promise<PodcastResponse> => {
    const response = await api.get('/podcasts/subscriptions');
    return response.data;
  },

  subscribe: async (rssUrl: string): Promise<{ message: string; podcast: Podcast }> => {
    const response = await api.post('/podcasts/subscribe', { rssUrl });
    return response.data;
  },

  unsubscribe: async (podcastId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/podcasts/${podcastId}/unsubscribe`);
    return response.data;
  },

  syncPodcast: async (podcastId: string): Promise<any> => {
    const response = await api.post(`/podcasts/${podcastId}/sync`);
    return response.data;
  },

  searchPodcasts: async (
    query: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<PodcastResponse> => {
    const response = await api.get('/podcasts/search', {
      params: { q: query, limit, skip },
    });
    return response.data;
  },

  getPodcast: async (podcastId: string): Promise<{ podcast: Podcast }> => {
    const response = await api.get(`/podcasts/${podcastId}`);
    return response.data;
  },
};
