import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import { podcastService } from '../services/podcastService';
import { authService } from '../services/authService';
import SuccessModal from '../components/SuccessModal';

export default function AddPodcast() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [rssUrl, setRssUrl] = useState('');
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [rssSuccess, setRssSuccess] = useState<string | null>(null);
  
  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPodcast, setSuccessPodcast] = useState<any>(null);

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

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['discover', 'search', searchQuery],
    queryFn: () => discoveryService.discoverPodcasts(searchQuery, 30),
    enabled: searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  });

  const { data: subsData } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
  });

  const isSubscribed = (rssUrl: string) => {
    return subsData?.podcasts.some(p => p.rssUrl === rssUrl);
  };

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
      setSuccessPodcast(podcast);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to subscribe';
      alert(`Erreur : ${errorMessage}`);
    } finally {
      setSubscribingId(null);
    }
  };

  const handleRssSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rssUrl.trim()) return;
    setRssLoading(true);
    setRssError(null);
    setRssSuccess(null);
    try {
      const result = await podcastService.subscribe(rssUrl.trim());
      setRssSuccess(`"${result.podcast.title}" — ${result.message === 'Déjà abonné' ? 'Déjà dans vos abonnements' : 'ajouté à vos abonnements !'}`);
      setRssUrl('');
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
    } catch (error: any) {
      setRssError(error.response?.data?.message || 'Impossible d\'ajouter ce podcast');
    } finally {
      setRssLoading(false);
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
        title="Ajouter un Podcast"
        subtitle="Trouvez et abonnez-vous à vos podcasts favoris"
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* RSS URL Section */}
        <div className="mb-12 card bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Rss className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-light-900 uppercase tracking-wider">Ajouter via URL RSS</h3>
          </div>
          <form onSubmit={handleRssSubscribe} className="flex gap-3">
            <input
              type="url"
              placeholder="https://feeds.example.com/podcast.rss"
              value={rssUrl}
              onChange={(e) => { setRssUrl(e.target.value); setRssError(null); setRssSuccess(null); }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-light-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={rssLoading || !rssUrl.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {rssLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {rssLoading ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>
          {rssError && <p className="mt-2 text-sm text-red-600">{rssError}</p>}
          {rssSuccess && <p className="mt-2 text-sm text-green-600">{rssSuccess}</p>}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-light-900 uppercase tracking-wider">Rechercher dans l'annuaire</h3>
          </div>
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

        {/* Results Grid */}
        {isSearching ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-light-600">Recherche en cours...</p>
            </div>
          </div>
        ) : searchResults?.podcasts && searchResults.podcasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.podcasts.map((podcast) => (
              <div key={podcast.id} className="card hover:shadow-lg transition-shadow bg-white">
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
                      disabled={subscribingId === podcast.id || subscribeMutation.isPending || isSubscribed(podcast.rssUrl)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                        isSubscribed(podcast.rssUrl)
                          ? 'bg-light-200 text-light-500 cursor-default'
                          : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {subscribingId === podcast.id ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Ajout...
                        </>
                      ) : isSubscribed(podcast.rssUrl) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Abonné
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
        ) : searchQuery.length >= 2 ? (
          <div className="text-center py-20">
            <p className="text-light-600 text-lg mb-2">Aucun podcast trouvé.</p>
            <p className="text-light-500">Essayez de rechercher des titres, auteurs ou sujets</p>
          </div>
        ) : (
          <div className="text-center py-20">
             <p className="text-light-600 text-lg">Entrez au moins 2 caractères pour lancer la recherche.</p>
          </div>
        )}

      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        podcastTitle={successPodcast?.title || ""}
        podcastAuthor={successPodcast?.author || ""}
        podcastImage={successPodcast?.imageUrl || ""}
      />
    </div>
  );
}
