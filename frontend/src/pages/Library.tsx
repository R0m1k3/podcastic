import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { podcastService, Podcast } from '../services/podcastService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import { BookOpen, Rss } from 'lucide-react';
import PodcastCard from '../components/PodcastCard';
import { Link } from 'react-router-dom';
import AlertModal, { AlertType } from '../components/AlertModal';

export default function Library() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Alert states
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: AlertType;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

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
    onMutate: async (podcastId: string) => {
      await queryClient.cancelQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.setQueryData(
        ['podcasts', 'subscriptions'],
        (old: any) => {
          if (!old || !old.podcasts) return old;
          const filtered = old.podcasts.filter((p: any) => 
            String(p.subscriptionId || p._id) !== String(podcastId)
          );
          return { ...old, podcasts: filtered, count: filtered.length };
        }
      );
      setConfirmDeleteId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      setAlertConfig({
        isOpen: true,
        title: "Erreur de désabonnement",
        message: "Une erreur est survenue lors de la tentative de désabonnement. Veuillez réessayer plus tard.",
        type: 'error'
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (podcastId: string) => podcastService.syncPodcast(podcastId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    },
  });

  const handleConfirmUnsubscribe = () => {
    if (confirmDeleteId) {
      unsubscribeMutation.mutate(confirmDeleteId);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch (error) {
       console.error(error);
    }
  };

  const podcasts: Podcast[] = subscriptionsData?.podcasts ?? [];

  return (
    <div className="min-h-screen">
      <Header
        title="Ma Bibliothèque"
        subtitle="VOTRE COLLECTION"
        user={user}
        onLogout={handleLogout}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="premium-card premium-glass p-5 rounded-[var(--radius-card)] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Abonnements</p>
            <h3 className="text-2xl font-display font-black">{podcasts.length}</h3>
          </div>
        </div>
        <Link to="/add" className="premium-card premium-glass p-5 rounded-[var(--radius-card)] flex items-center gap-4 group hover:bg-[var(--accent-primary)]/5 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white shadow-glow-indigo group-hover:scale-110 transition-transform shrink-0">
            <Rss className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Action</p>
            <h3 className="text-base font-bold">Ajouter un podcast</h3>
          </div>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border-color)] border-t-[var(--accent-primary)] animate-spin mb-6" />
          <p className="text-[var(--text-secondary)] font-medium animate-pulse text-[10px] uppercase tracking-widest">Chargement de votre univers...</p>
        </div>
      ) : podcasts.length === 0 ? (
        <div className="premium-glass py-24 px-12 rounded-[var(--radius-panel)] text-center max-w-2xl mx-auto">
          <div className="w-24 h-24 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] flex items-center justify-center text-4xl mx-auto mb-8 border border-[var(--border-color)]">🕳️</div>
          <h2 className="text-3xl font-display font-black mb-4">Bibliothèque vide</h2>
          <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">Commencez votre voyage audio en ajoutant vos podcasts préférés dès maintenant.</p>
          <Link to="/add" className="neon-button inline-flex items-center gap-3">
            <Rss className="w-5 h-5" />
            Découvrir des podcasts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
          {podcasts.map((podcast) => (
            <PodcastCard
              key={podcast._id}
              title={podcast.title}
              author={podcast.author}
              imageUrl={podcast.imageUrl}
              episodeCount={podcast.episodeCount}
              language={podcast.language}
              lastEpisodeTitle={podcast.lastEpisodeTitle}
              lastEpisodeDate={podcast.lastEpisodeDate}
              onSync={() => syncMutation.mutate(podcast._id)}
              isSyncing={syncMutation.isPending && syncMutation.variables === podcast._id}
              onUnsubscribe={() => setConfirmDeleteId(podcast.subscriptionId || podcast._id)}
              confirmDelete={confirmDeleteId === (podcast.subscriptionId || podcast._id)}
              onConfirmDelete={handleConfirmUnsubscribe}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
