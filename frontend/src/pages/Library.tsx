import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { podcastService, Podcast } from '../services/podcastService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import { BookOpen, Trash2, Loader, Rss } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Library() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
    staleTime: 2 * 60 * 1000,
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (podcastId: string) => podcastService.unsubscribe(podcastId),
    onSuccess: () => {
      // Invalidate subscriptions and latest episodes so dashboard refreshes too
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
      setConfirmDeleteId(null);
    },
    onError: (error: any) => {
      alert(`Erreur : ${error.response?.data?.message || 'Impossible de se désabonner'}`);
      setConfirmDeleteId(null);
    },
  });

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleUnsubscribeRequest = (podcastId: string) => {
    setConfirmDeleteId(podcastId);
  };

  const handleConfirmUnsubscribe = () => {
    if (confirmDeleteId) {
      unsubscribeMutation.mutate(confirmDeleteId);
    }
  };

  const podcasts: Podcast[] = subscriptionsData?.podcasts ?? [];

  return (
    <div className="min-h-screen bg-light-50">
      <Header
        title="Ma Bibliothèque"
        subtitle="Gérez vos abonnements aux podcasts"
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-light-900">
              {isLoading ? 'Chargement...' : `${podcasts.length} abonnement${podcasts.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
          <Link
            to="/add"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium text-sm"
          >
            <Rss className="w-4 h-4" />
            Ajouter un podcast
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-light-600">Chargement de vos abonnements...</p>
            </div>
          </div>
        ) : podcasts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-light-300 mx-auto mb-4" />
            <p className="text-light-600 text-lg mb-2">Votre bibliothèque est vide</p>
            <p className="text-light-500 mb-6">Abonnez-vous à des podcasts pour les retrouver ici</p>
            <Link
              to="/add"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
            >
              <Rss className="w-5 h-5" />
              Ajouter mon premier podcast
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {podcasts.map((podcast) => (
              <div key={podcast._id} className="card bg-white hover:shadow-lg transition-shadow flex flex-col">
                {/* Podcast cover */}
                {podcast.imageUrl ? (
                  <div className="mb-4 rounded-lg overflow-hidden aspect-square w-24 h-24 bg-light-200 flex-shrink-0">
                    <img
                      src={podcast.imageUrl}
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-4 w-24 h-24 rounded-lg bg-light-200 flex items-center justify-center flex-shrink-0">
                    <Rss className="w-8 h-8 text-light-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-base font-bold text-light-900 mb-1 line-clamp-2">
                    {podcast.title}
                  </h3>
                  {podcast.author && (
                    <p className="text-sm text-light-500 mb-2">{podcast.author}</p>
                  )}
                  <div className="flex gap-3 text-xs text-light-400 mb-4">
                    {podcast.episodeCount > 0 && (
                      <span>{podcast.episodeCount} épisodes</span>
                    )}
                    {podcast.language && <span>{podcast.language}</span>}
                  </div>
                </div>

                {/* Unsubscribe button */}
                {confirmDeleteId === podcast._id ? (
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-light-100">
                    <span className="text-xs text-light-600 flex-1">Confirmer le désabonnement ?</span>
                    <button
                      onClick={handleConfirmUnsubscribe}
                      disabled={unsubscribeMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors text-xs font-medium"
                    >
                      {unsubscribeMutation.isPending ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 rounded-lg bg-light-200 text-light-700 hover:bg-light-300 transition-colors text-xs font-medium"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUnsubscribeRequest(podcast._id)}
                    className="mt-auto pt-3 border-t border-light-100 flex items-center gap-2 text-sm text-light-500 hover:text-red-600 transition-colors w-full"
                  >
                    <Trash2 className="w-4 h-4" />
                    Se désabonner
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirm modal overlay (backdrop click to cancel) */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
