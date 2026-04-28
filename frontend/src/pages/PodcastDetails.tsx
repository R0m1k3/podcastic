import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { podcastService, Podcast } from '../services/podcastService';
import { episodeService, Episode } from '../services/episodeService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import EpisodeDetails from '../components/EpisodeDetails';
import { useAudio } from '../context/AudioContext';
import AlertModal, { AlertType } from '../components/AlertModal';
import { Check, Loader, RefreshCw, Trash2, ArrowLeft, Rss } from 'lucide-react';

export default function PodcastDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playEpisode } = useAudio();
  const [user, setUser] = useState<any>(null);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: AlertType;
  }>({ isOpen: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    authService.getMe().then(r => setUser(r.user)).catch(() => {});
  }, []);

  const { data: podcastData, isLoading: podcastLoading } = useQuery({
    queryKey: ['podcast', id],
    queryFn: () => podcastService.getPodcast(id!),
    enabled: !!id,
  });

  const { data: episodesData, isLoading: episodesLoading } = useQuery({
    queryKey: ['episodes', 'podcast', id],
    queryFn: () => episodeService.getPodcastEpisodes(id!, 50, 0),
    enabled: !!id,
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => podcastService.unsubscribe(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
      navigate('/library');
    },
    onError: () => {
      setAlertConfig({
        isOpen: true, title: "Erreur", message: "Impossible de se désabonner.", type: 'error'
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => podcastService.syncPodcast(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', 'podcast', id] });
      queryClient.invalidateQueries({ queryKey: ['podcast', id] });
    },
  });

  const podcast: Podcast | null = podcastData?.podcast ?? null;
  const episodes: Episode[] = episodesData?.episodes ?? [];

  if (podcastLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--border-color)] border-t-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold text-[var(--text-secondary)]">Podcast introuvable</p>
        <button onClick={() => navigate('/library')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> Retour à la bibliothèque
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title={podcast.title} subtitle="Détails du podcast" user={user} />

      <div>
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="btn-ghost mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Podcast info card */}
        <div className="glass rounded-[var(--radius-xl)] overflow-hidden mb-12">
          <div className="flex flex-col md:flex-row gap-8 p-8">
            {/* Artwork */}
            <div className="shrink-0">
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)]">
                {podcast.imageUrl ? (
                  <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-5xl">🎙️</div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-accent">
                  <Check className="w-3 h-3" /> Abonné
                </span>
                <span className="badge">{podcast.episodeCount} épisodes</span>
                {podcast.language && <span className="badge">{podcast.language}</span>}
                {podcast.category?.map(cat => (
                  <span key={cat} className="badge">{cat}</span>
                ))}
              </div>

              <h2 className="text-2xl lg:text-3xl">{podcast.author}</h2>

              {podcast.description && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">{podcast.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-auto pt-4">
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="btn-secondary">
                  {syncMutation.isPending
                    ? <><Loader className="w-4 h-4 animate-spin" /> Synchro...</>
                    : <><RefreshCw className="w-4 h-4" /> Synchroniser</>}
                </button>

                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => unsubscribeMutation.mutate()}
                      className="btn-primary !bg-[var(--accent-rose)] !from-[var(--accent-rose)] !to-[var(--accent-rose)] !shadow-[var(--accent-rose)]/20">
                      Confirmer
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="btn-ghost !text-[var(--accent-rose)]">
                    <Trash2 className="w-4 h-4" /> Se désabonner
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RSS URL */}
          <div className="px-8 pb-6">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Rss className="w-3.5 h-3.5" />
              <span className="truncate">{podcast.rssUrl}</span>
            </div>
          </div>
        </div>

        {/* Episodes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl lg:text-2xl">Épisodes</h3>
            <span className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {episodes.length} épisodes
            </span>
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="skeleton aspect-[3/4] rounded-[var(--radius-lg)]" />)}
            </div>
          ) : episodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 stagger">
              {episodes.map(ep => (
                <EpisodeCard
                  key={ep._id}
                  episode={ep}
                  onPlay={playEpisode}
                  onDetails={(e) => { setDetailsEpisode(e); setIsDetailsOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="glass rounded-[var(--radius-xl)] p-12 text-center max-w-lg mx-auto">
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Aucun épisode trouvé</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Synchronisez ce podcast pour charger ses épisodes.</p>
            </div>
          )}
        </section>
      </div>

      <EpisodeDetails episode={detailsEpisode} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} onPlay={playEpisode} />
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}
