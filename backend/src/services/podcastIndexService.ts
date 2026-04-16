import axios from 'axios';

/**
 * iTunes Search API Service - Free, no API key required
 * https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */

interface ItunesSearchResult {
  collectionId: number;
  collectionName: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  artistName?: string;
  primaryGenreName?: string;
  trackCount?: number;
  country?: string;
  description?: string;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesSearchResult[];
}

interface ItunesTopResult {
  id: string;
  name: string;
  artworkUrl100: string;
  artistName: string;
}

export interface SearchResult {
  id: string;
  title: string;
  rssUrl: string;
  description: string;
  author?: string;
  imageUrl?: string;
  language?: string;
  episodeCount?: number;
}

const mapItunesResult = (item: ItunesSearchResult): SearchResult | null => {
  if (!item.feedUrl) return null;
  return {
    id: item.collectionId.toString(),
    title: item.collectionName,
    rssUrl: item.feedUrl,
    description: item.description || item.primaryGenreName || '',
    author: item.artistName || '',
    imageUrl: item.artworkUrl600 || item.artworkUrl100,
    episodeCount: item.trackCount,
  };
};

export const podcastIndexService = {
  searchPodcasts: async (
    query: string,
    limit: number = 20,
  ): Promise<SearchResult[]> => {
    const response = await axios.get<ItunesSearchResponse>(
      'https://itunes.apple.com/search',
      {
        params: {
          term: query,
          media: 'podcast',
          entity: 'podcast',
          limit: Math.min(limit, 50),
        },
        timeout: 10000,
      }
    );

    return response.data.results
      .map(mapItunesResult)
      .filter((r): r is SearchResult => r !== null);
  },

  getTrendingPodcasts: async (limit: number = 20): Promise<SearchResult[]> => {
    // Get Apple's top podcasts list
    const topResponse = await axios.get<{ feed: { results: ItunesTopResult[] } }>(
      `https://rss.applemarketingtools.com/api/v2/fr/podcasts/top-podcasts/${Math.min(limit, 50)}/podcasts.json`,
      { timeout: 10000 }
    );

    const topItems = topResponse.data.feed.results;
    if (!topItems || topItems.length === 0) return [];

    // Batch lookup to get RSS URLs
    const ids = topItems.map((item) => item.id).join(',');
    const lookupResponse = await axios.get<ItunesSearchResponse>(
      'https://itunes.apple.com/lookup',
      {
        params: { id: ids, entity: 'podcast' },
        timeout: 10000,
      }
    );

    return lookupResponse.data.results
      .map(mapItunesResult)
      .filter((r): r is SearchResult => r !== null);
  },

  isConfigured: (): boolean => true,
};
