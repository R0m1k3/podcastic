import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { podcastService, Podcast } from '../services/podcastService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import PodcastCard from '../components/PodcastCard';
import { Link } from 'react-router-dom';
import AlertModal, { AlertType } from '../components/AlertModal';
import { BookOpen, Plus, Loader } from 'lucide-react';

export default function Library() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: AlertType;
  }>({ isOpen: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    authService.getMe().then(r => setUser(r.user)).catch(() => {});
  }, []);

  const { data: subsData, isLoading } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
    staleTime: 2 * 60 * 1000,
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (podcastId: string) => podcastService.unsubscribe(podcastId),
    onMutate: async (podcastId: string) => {
      await queryClient.cancelQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.setQueryData(['podcasts', 'subscriptions'], (old: any) => {
        if (!old?.podcasts) return old;
        const filtered = old.podcasts.filter((p: any) =>
          String(p.subscriptionId || p._id) !== String(podcastId)
        );
        return { ...old, podcasts: filtered, count: filtered.length };
      });
      setConfirmDeleteId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      setAlertConfig({
        isOpen: true, title: "Erreur", message: "Impossible de se désabonner. Réessayez.", type: 'error'
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch { /* ignore */ }
  };

  const podcasts: Podcast[] = subsData?.podcasts ?? [];

  return (
    <div className="min-h-screen">
      <Header title="Ma Bibliothèque" subtitle="Votre collection" user={user} onLogout={handleLogout} />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="glass rounded-[var(--radius-lg)] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">Abonnements</span>
            <p className="text-2xl font-display font-extrabold">{podcasts.length}</p>
          </div>
        </div>
        <Link to="/add"
          className="glass rounded-[var(--radius-lg)] p-5 flex items-center gap-4 group hover:border-[var(--accent-primary)]/30 transition-all cursor-pointer">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-[var(--accent-primary)]/20">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">Action</span>
            <p className="text-base font-bold">Ajouter un podcast</p>
          </div>
        </Link>
      </div>

      {/* Podcast grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader className="w-10 h-10 text-[var(--accent-primary)] animate-spin-slow" />
          <span className="text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] animate-pulse">
            Chargement de votre univers...
          </span>
        </div>
      ) : podcasts.length === 0 ? (
        <div className="glass rounded-[var(--radius-xl)] py-20 px-8 text-center max-w-lg mx-auto border-dashed">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-3xl mx-auto mb-6 border border-[var(--border-color)]">
            🎙️
          </div>
          <h2 className="text-2xl mb-3">Bibliothèque vide</h2>
          <p className="text-[var(--text-secondary)] mb-8 leading-relaxed text-sm">
            Commencez votre voyage audio en ajoutant vos podcasts préférés.
          </p>
          <Link to="/add" className="btn-primary">
            <Plus className="w-4 h-4" /> Découvrir des podcasts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10 stagger">
          {podcasts.map(podcast => (
            <PodcastCard
              key={podcast._id}
              title={podcast.title}
              author={podcast.author}
              imageUrl={podcast.imageUrl}
              episodeCount={podcast.episodeCount}
              language={podcast.language}
              description={(podcast as any).description}
              lastEpisodeTitle={podcast.lastEpisodeTitle}
              lastEpisodeDate={podcast.lastEpisodeDate}
              onSync={() => syncMutation.mutate(podcast._id)}
              isSyncing={syncMutation.isPending && syncMutation.variables === podcast._id}
              onUnsubscribe={() => setConfirmDeleteId(podcast.subscriptionId || podcast._id)}
              confirmDelete={confirmDeleteId === (podcast.subscriptionId || podcast._id)}
              onConfirmDelete={() => unsubscribeMutation.mutate(confirmDeleteId!)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onClick={() => navigate(`/podcast/${podcast._id}`)}
            />
          ))}
        </div>
      )}

      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}
