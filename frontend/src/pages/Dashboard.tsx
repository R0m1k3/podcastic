import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { episodeService, Episode } from '../services/episodeService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import EpisodeDetails from '../components/EpisodeDetails';
import { useAudio } from '../context/AudioContext';
import AlertModal, { AlertType } from '../components/AlertModal';
import AudioPlayer from '../components/AudioPlayer';
import { Sparkles, Play, Clock, Loader, ChevronDown } from 'lucide-react';

export default function Dashboard() {
  const { playEpisode, currentEpisode, closePlayer, setUserId } = useAudio();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 32;

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: AlertType;
  }>({ isOpen: false, title: '', message: '', type: 'error' });

  const handleOpenDetails = (episode: Episode) => {
    setDetailsEpisode(episode);
    setIsDetailsOpen(true);
  };

  const handleToggleRead = async (episode: Episode, completed: boolean) => {
    const newProgress = { position: completed ? episode.duration : 0, isCompleted: completed };
    setEpisodes(prev =>
      prev.map(ep => ep._id === episode._id ? { ...ep, progress: newProgress } : ep)
    );
    queryClient.setQueriesData<any>(
      { queryKey: ['episodes', 'latest'], exact: false },
      (old: any) => {
        if (!old?.episodes) return old;
        return {
          ...old,
          episodes: old.episodes.map((ep: Episode) =>
            ep._id === episode._id ? { ...ep, progress: newProgress } : ep
          ),
        };
      }
    );
    try {
      await episodeService.saveProgress(episode._id, newProgress.position, completed);
    } catch {
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const r = await authService.getMe();
        setUser(r.user);
        setUserId(r.user._id);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    loadUser();
  }, []);

  const { data: episodesData, isLoading: episodesLoading, isFetching: episodesFetching } = useQuery({
    queryKey: ['episodes', 'latest', skip],
    queryFn: () => episodeService.getLatestEpisodes(LIMIT, skip),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (episodesData?.episodes) {
      if (skip === 0) {
        setEpisodes(episodesData.episodes);
      } else {
        setEpisodes(prev => {
          const fresh = episodesData.episodes.filter(
            (e: any) => !prev.some(p => p._id === e._id)
          );
          return [...prev, ...fresh];
        });
      }
      setHasMore(episodesData.episodes.length === LIMIT);
    }
  }, [episodesData, skip]);

  const loadMore = () => {
    if (hasMore && !episodesFetching) setSkip(prev => prev + LIMIT);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch {
      setAlertConfig({
        isOpen: true, title: "Erreur", message: "Impossible de se déconnecter.", type: 'error'
      });
    }
  };

  const inProgress = episodes?.filter(e => {
    if (!e.progress || e.progress.isCompleted) return false;
    if (e.duration > 0 && e.progress.position / e.duration >= 0.9) return false;
    return e.progress.position > 0;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--border-color)] border-t-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={`Bon retour, ${user?.username?.split(' ')[0] || 'ami'} !`}
        subtitle="Votre tableau de bord"
        user={user}
        onLogout={handleLogout}
      />

      <div>
        {/* ── Hero / Now Playing ── */}
        {currentEpisode ? (
          <div className="mb-12">
            <AudioPlayer episode={currentEpisode} onClose={closePlayer} userId={user?._id} mode="inline" />
          </div>
        ) : (
          <div className="glass rounded-[var(--radius-xl)] p-8 lg:p-12 mb-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--accent-primary)]/10 blur-[80px] -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 w-96 h-48 bg-[var(--accent-secondary)]/5 blur-[60px] pointer-events-none" />
            <div className="relative z-10">
              <span className="badge badge-accent mb-4">
                <Sparkles className="w-3 h-3" /> Podcastic
              </span>
              <h2 className="text-3xl lg:text-4xl xl:text-5xl mb-4 max-w-2xl">
                Découvrez les nouveautés de votre univers audio.
              </h2>
              <p className="text-[var(--text-secondary)] text-base lg:text-lg mb-8 max-w-xl leading-relaxed font-medium">
                Vos nouveaux épisodes n'attendent que vous. Prêt pour l'immersion ?
              </p>
              <div className="flex flex-wrap gap-3">
                {inProgress.length > 0 ? (
                  <button onClick={() => playEpisode(inProgress[0])} className="btn-primary">
                    <Play className="w-4 h-4 fill-current" />
                    Reprendre : {inProgress[0].title.substring(0, 24)}...
                  </button>
                ) : (
                  <Link to="/add" className="btn-primary">
                    <Sparkles className="w-4 h-4" />
                    Découvrir des podcasts
                  </Link>
                )}
                <Link to="/trending" className="btn-secondary">
                  Parcourir les tendances
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Continuer l'écoute ── */}
        {inProgress.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-xl lg:text-2xl">Continuer l'écoute</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
              {inProgress.slice(0, 4).map(ep => (
                <EpisodeCard key={`cp-${ep._id}`} episode={ep} onPlay={playEpisode} onDetails={handleOpenDetails} onToggleRead={handleToggleRead} />
              ))}
            </div>
          </section>
        )}

        {/* ── Récemment publiés ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-color)]">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-xl lg:text-2xl">Récemment publiés</h3>
            </div>
            <span className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
              {episodes.length} chargés
            </span>
          </div>

          {episodesLoading && skip === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="skeleton aspect-[3/4] rounded-[var(--radius-lg)]" />)}
            </div>
          ) : episodes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
                {episodes.map(ep => (
                  <EpisodeCard key={`${skip}-${ep._id}`} episode={ep} onPlay={playEpisode} onDetails={handleOpenDetails} onToggleRead={handleToggleRead} />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-10 pb-20">
                  <button onClick={loadMore} disabled={episodesFetching}
                    className="btn-secondary min-w-[200px]">
                    {episodesFetching ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                    {episodesFetching ? 'Chargement...' : 'Charger la suite'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="glass rounded-[var(--radius-xl)] p-16 text-center max-w-xl mx-auto border-dashed">
              <div className="text-4xl mb-4 opacity-40">🎧</div>
              <h3 className="text-lg mb-2">Silence radio...</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
                Abonnez-vous à vos podcasts favoris pour voir leurs épisodes ici.
              </p>
              <Link to="/trending" className="btn-primary">Explorer les podcasts</Link>
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
