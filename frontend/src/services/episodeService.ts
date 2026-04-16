import api from './api';

export interface Episode {
  _id: string;
  podcastId: string | { _id: string; title: string; author: string; imageUrl?: string };
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string;
  duration: number;
  guid: string;
  imageUrl?: string;
}

export interface EpisodeResponse {
  episodes: Episode[];
  count: number;
}

export interface UserProgress {
  _id: string;
  userId: string;
  episodeId: string;
  position: number;
  isCompleted: boolean;
  isSaved: boolean;
  lastListenedAt: string;
}

export const episodeService = {
  getLatestEpisodes: async (
    limit: number = 30,
    skip: number = 0
  ): Promise<EpisodeResponse> => {
    const response = await api.get('/episodes/latest', {
      params: { limit, skip },
    });
    return response.data;
  },

  getPodcastEpisodes: async (
    podcastId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<EpisodeResponse> => {
    const response = await api.get(`/episodes/podcast/${podcastId}`, {
      params: { limit, skip },
    });
    return response.data;
  },

  getEpisode: async (episodeId: string): Promise<{ episode: Episode }> => {
    const response = await api.get(`/episodes/${episodeId}`);
    return response.data;
  },

  saveProgress: async (
    episodeId: string,
    position: number,
    isCompleted?: boolean
  ): Promise<{ message: string; progress: UserProgress }> => {
    const response = await api.post('/episodes/progress', {
      episodeId,
      position,
      isCompleted,
    });
    return response.data;
  },

  getProgress: async (episodeId: string): Promise<{ progress: UserProgress | null }> => {
    const response = await api.get(`/episodes/progress/${episodeId}`);
    return response.data;
  },
};
