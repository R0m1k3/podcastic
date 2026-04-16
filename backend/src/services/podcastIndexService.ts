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
    const term = query.trim();
    if (!term) return [];

    const response = await axios.get<ItunesSearchResponse>(
      'https://itunes.apple.com/search',
      {
        params: {
          term,
          media: 'podcast',
          entity: 'podcast',
          country: 'FR',
          lang: 'fr_fr', // Force French localized search
          limit: 100, // Fetch more candidates to improve quality
        },
        timeout: 10000,
      }
    );

    return response.data.results
      .map(mapItunesResult)
      .filter((r): r is SearchResult => r !== null)
      .slice(0, limit); // Respect requested limit after fetching candidates
  },

  getTrendingPodcasts: async (limit: number = 20, genreId?: string): Promise<SearchResult[]> => {
    // iTunes official top podcasts RSS
    // Format: https://itunes.apple.com/fr/rss/toppodcasts/limit=X/genre=Y/json
    const cap = Math.min(limit, 50);
    const genrePath = genreId ? `/genre=${genreId}` : '';
    const rssResponse = await axios.get<{
      feed: {
        entry: Array<{
          id: { label: string; attributes: { 'im:id': string } };
          'im:name': { label: string };
          'im:artist': { label: string };
          'im:image': Array<{ label: string; attributes: { height: string } }>;
        }>;
      };
    }>(`https://itunes.apple.com/fr/rss/toppodcasts/limit=${cap}${genrePath}/json`, {
      timeout: 10000,
    });

    const entries = rssResponse.data.feed.entry;
    if (!entries || entries.length === 0) return [];

    // Batch lookup to get feedUrls
    const ids = entries.map((e) => e.id.attributes['im:id']).join(',');
    const lookupResponse = await axios.get<ItunesSearchResponse>(
      'https://itunes.apple.com/lookup',
      { params: { id: ids, entity: 'podcast' }, timeout: 10000 }
    );

    return lookupResponse.data.results
      .map(mapItunesResult)
      .filter((r): r is SearchResult => r !== null);
  },

  isConfigured: (): boolean => true,
};
