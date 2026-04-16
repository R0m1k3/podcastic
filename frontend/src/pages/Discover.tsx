import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import { podcastService } from '../services/podcastService';
import Header from '../components/Header';
import { Search, Plus, Loader } from 'lucide-react';
import { authService } from '../services/authService';

export default function Discover() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'search' | 'trending'>('trending');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  // Load user
  useState(() => {
    const loadUser = async () => {
      try {
        const response = await authService.getMe();
        setUser(response.user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Search podcasts
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['discover', 'search', searchQuery],
    queryFn: () => discoveryService.discoverPodcasts(searchQuery, 30),
    enabled: selectedTab === 'search' && searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  });

  // Trending podcasts
  const { data: trendingData, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['discover', 'trending'],
    queryFn: () => discoveryService.getTrendingPodcasts(30),
    enabled: selectedTab === 'trending',
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: (podcast: DiscoveryPodcast) =>
      discoveryService.subscribeFromDiscovery(podcast.rssUrl, {
        title: podcast.title,
        author: podcast.author,
        imageUrl: podcast.imageUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
    },
  });

  const handleSubscribe = async (podcast: DiscoveryPodcast) => {
    try {
      setSubscribingId(podcast.id);
      await subscribeMutation.mutateAsync(podcast);
      // Show success toast (you might want to add a toast library)
      alert(`"${podcast.title}" ajouté à vos abonnements !`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to subscribe';
      alert(`Erreur : ${errorMessage}`);
    } finally {
      setSubscribingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayData = selectedTab === 'search' ? searchResults?.podcasts : trendingData?.podcasts;
  const isLoading = selectedTab === 'search' ? isSearching : isTrendingLoading;

  return (
    <div className="min-h-screen bg-light-50">
      <Header
        title="Discover"
        subtitle="Trouvez et abonnez-vous à des podcasts"
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-light-400" />
            <input
              type="text"
              placeholder="Rechercher des podcasts, auteurs, sujets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-light-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-lg"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setSelectedTab('trending')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedTab === 'trending'
                ? 'bg-blue-500 text-white'
                : 'bg-light-200 text-light-700 hover:bg-light-300'
            }`}
          >
            🔥 Tendances
          </button>
          <button
            onClick={() => setSelectedTab('search')}
            disabled={searchQuery.length < 2}
            className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedTab === 'search'
                ? 'bg-blue-500 text-white'
                : 'bg-light-200 text-light-700 hover:bg-light-300'
            }`}
          >
            🔍 Résultats de recherche
          </button>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-light-600">Chargement des podcasts...</p>
            </div>
          </div>
        ) : displayData && displayData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayData.map((podcast) => (
              <div key={podcast.id} className="card hover:shadow-lg transition-shadow">
                {/* Podcast Image */}
                {podcast.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden aspect-video bg-light-200">
                    <img
                      src={podcast.imageUrl}
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-light-900 mb-1 line-clamp-2">
                    {podcast.title}
                  </h3>

                  {podcast.author && (
                    <p className="text-sm text-light-600 mb-2">{podcast.author}</p>
                  )}

                  <p className="text-sm text-light-500 line-clamp-3 mb-4">
                    {podcast.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs text-light-500">
                      {podcast.episodeCount && (
                        <span>{podcast.episodeCount} épisodes</span>
                      )}
                      {podcast.language && <span>{podcast.language}</span>}
                    </div>

                    <button
                      onClick={() => handleSubscribe(podcast)}
                      disabled={subscribingId === podcast.id || subscribeMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {subscribingId === podcast.id ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Ajout...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Ajouter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-light-600 text-lg mb-2">
              {selectedTab === 'search' && searchQuery.length < 2
                ? 'Tapez au moins 2 caractères pour rechercher'
                : 'Aucun podcast trouvé'}
            </p>
            {selectedTab === 'search' && (
              <p className="text-light-500">
                Essayez de rechercher des titres, auteurs ou sujets
              </p>
            )}
          </div>
        )}

        {/* Source Info */}
        {(searchResults || trendingData) && (
          <div className="mt-8 text-center text-sm text-light-500">
            <p>
              Propulsé par{' '}
              <a
                href="https://podcastindex.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Podcast Index
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
