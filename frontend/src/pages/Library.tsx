import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { podcastService, Podcast } from '../services/podcastService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import { BookOpen, Trash2, Loader, Rss, Play, RefreshCw, AlertCircle } from 'lucide-react';
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
            <div key={podcast._id} className="group premium-card premium-glass rounded-[var(--radius-card)] p-6 hover:bg-[var(--bg-secondary)] transition-all duration-500 flex flex-col h-full border-[var(--border-color)]">
              <div className="flex gap-6 mb-6">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-color)] group-hover:scale-105 transition-transform duration-500">
                    {podcast.imageUrl ? (
                      <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-3xl">🎙️</div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white text-obsidian flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                     <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold truncate leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
                      {podcast.title}
                    </h3>
                  </div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">{podcast.author || 'Artiste Inconnu'}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">
                       {podcast.episodeCount} EPISODES
                    </span>
                    {podcast.language && (
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[9px] font-black text-[var(--text-secondary)] uppercase">
                        {podcast.language}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex-1">
                {podcast.episodeCount === 0 ? (
                  <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 mb-4">
                     <div className="flex items-center gap-3 mb-3">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Besoin de synchronisation</span>
                     </div>
                     <button
                        onClick={() => syncMutation.mutate(podcast._id)}
                        disabled={syncMutation.isPending}
                        className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-[11px] font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                      >
                        {syncMutation.isPending && syncMutation.variables === podcast._id ? (
                           <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                           <RefreshCw className="w-3 h-3" />
                        )}
                        Synchroniser maintenant
                      </button>
                  </div>
                ) : podcast.lastEpisodeTitle && (
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 mb-6 group-hover:bg-[var(--accent-primary)]/5 transition-colors">
                    <p className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-[0.2em] mb-2">Dernier épisode</p>
                    <p className="text-sm font-bold line-clamp-1 mb-1">{podcast.lastEpisodeTitle}</p>
                    <p className="text-[10px] font-medium text-[var(--text-secondary)] italic">
                      {new Date(podcast.lastEpisodeDate!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)] mt-auto">
                 {confirmDeleteId === (podcast.subscriptionId || podcast._id) ? (
                    <div className="flex items-center gap-3 w-full animate-fade-in">
                       <button onClick={handleConfirmUnsubscribe} className="flex-1 py-2 bg-accent-rose text-white rounded-xl text-[11px] font-black uppercase hover:bg-accent-rose/80">Confirmer</button>
                       <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl text-[11px] font-black uppercase hover:bg-[var(--bg-primary)]">Annuler</button>
                    </div>
                 ) : (
                    <div className="flex items-center gap-4 ml-auto">
                      <button
                        onClick={() => syncMutation.mutate(podcast._id)}
                        disabled={syncMutation.isPending && syncMutation.variables === podcast._id}
                        className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-widest disabled:opacity-50"
                        title="Resynchroniser les métadonnées et épisodes"
                      >
                        {syncMutation.isPending && syncMutation.variables === podcast._id ? (
                          <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Resync
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(podcast.subscriptionId || podcast._id)}
                        className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] hover:text-accent-rose transition-all uppercase tracking-widest"
                      >
                        <Trash2 className="w-3 h-3" />
                        Désabonner
                      </button>
                    </div>
                 )}
              </div>
            </div>
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
