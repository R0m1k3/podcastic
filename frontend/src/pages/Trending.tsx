import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import Header from '../components/Header';
import { Loader, Plus, Flame } from 'lucide-react';
import { authService } from '../services/authService';

export default function Trending() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
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

  const { data: trendingData, isLoading } = useQuery({
    queryKey: ['discover', 'trending'],
    queryFn: () => discoveryService.getTrendingPodcasts(30),
    staleTime: 30 * 60 * 1000,
  });

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
      alert(`"${podcast.title}" ajouté à vos abonnements !`);
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
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

  return (
    <div className="min-h-screen bg-light-50">
      <Header
        title="Tendances"
        subtitle="Découvrez les podcasts les plus populaires"
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 mb-8">
          <Flame className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold text-light-900">Podcasts Tendances</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-light-600">Chargement des podcasts...</p>
            </div>
          </div>
        ) : trendingData?.podcasts && trendingData.podcasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingData.podcasts.map((podcast) => (
              <div key={podcast.id} className="card hover:shadow-lg transition-shadow">
                {podcast.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden aspect-video bg-light-200">
                    <img
                      src={podcast.imageUrl}
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
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
             <p className="text-light-600 text-lg mb-2">Aucun podcast tendance trouvé.</p>
          </div>
        )}
      </main>
    </div>
  );
}
