import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { episodeService, Episode } from '../services/episodeService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import EpisodeDetails from '../components/EpisodeDetails';
import { useAudio } from '../context/AudioContext';
import AlertModal, { AlertType } from '../components/AlertModal';
import AudioPlayer from '../components/AudioPlayer';
import { Sparkles, Play, Clock, TrendingUp, Loader, RefreshCcw } from 'lucide-react';

export default function Dashboard() {
  const { playEpisode, currentEpisode, closePlayer, setUserId } = useAudio();
  const [user, setUser] = useState<any>(null);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 32;

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

  const handleOpenDetails = (episode: Episode) => {
    setDetailsEpisode(episode);
    setIsDetailsOpen(true);
  };

  const handleToggleRead = async (episode: Episode, completed: boolean) => {
    try {
      await episodeService.saveProgress(
        episode._id,
        completed ? episode.duration : 0,
        completed
      );
      setEpisodes(prev =>
        prev.map(ep =>
          ep._id === episode._id
            ? { ...ep, progress: { position: completed ? ep.duration : 0, isCompleted: completed } }
            : ep
        )
      );
    } catch (error) {
      console.error('Failed to toggle read state:', error);
    }
  };

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authService.getMe();
        setUser(response.user);
        setUserId(response.user._id);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Fetch episodes with pagination
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
          // Prevent duplicates
          const newEpisodes = episodesData.episodes.filter(
            (newEp: any) => !prev.some(oldEp => oldEp._id === newEp._id)
          );
          return [...prev, ...newEpisodes];
        });
      }
      setHasMore(episodesData.episodes.length === LIMIT);
    }
  }, [episodesData, skip]);

  const loadMore = () => {
    if (hasMore && !episodesFetching) {
      setSkip(prev => prev + LIMIT);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch (error) {
      setAlertConfig({
        isOpen: true,
        title: "Erreur de déconnexion",
        message: "Une erreur s'est produite lors de la déconnexion. Veuillez rafraîchir la page.",
        type: 'error'
      });
    }
  };

  // Episodes in progress: has progress, not completed, not ≥90%
  const episodesInProgress = episodes?.filter(e => {
    if (!e.progress || e.progress.isCompleted) return false;
    if (e.duration > 0 && e.progress.position / e.duration >= 0.9) return false;
    return e.progress.position > 0;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--border-color)] border-t-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={`Bon retour, ${user?.username?.split(' ')[0] || 'Ami'} !`}
        subtitle="VOTRE TABLEAU DE BORD"
        user={user}
        onLogout={handleLogout}
      />

      <main className="">
        {/* Welcome Section / Hero — becomes audio player when playing */}
        {currentEpisode ? (
          <div className="mb-12">
            <AudioPlayer
              episode={currentEpisode}
              onClose={closePlayer}
              userId={user?._id}
              mode="inline"
            />
          </div>
        ) : (
        <div className="premium-glass rounded-[var(--radius-panel)] p-8 lg:p-12 mb-12 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-glow)] blur-[80px] -mr-32 -mt-32 group-hover:bg-[var(--accent-primary)]/20 transition-all duration-700" />
           <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-4">
                 <Sparkles className="w-3 h-3" />
                 Podcastic Premium
              </div>
              <h2 className="text-4xl lg:text-5xl font-display font-black mb-4 tracking-tight leading-tight max-w-2xl text-[var(--text-primary)]">
                 Découvrez les nouveautés de votre univers audio.
              </h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-xl leading-relaxed font-medium">
                 Vous avez des nouveaux épisodes qui n'attendent que vous. Prêt pour une immersion ?
              </p>
              <div className="flex flex-wrap gap-4">
                 {episodesInProgress.length > 0 ? (
                    <button
                      onClick={() => playEpisode(episodesInProgress[0])}
                      className="neon-button flex items-center gap-2"
                    >
                       <Play className="w-4 h-4 fill-current" />
                       Reprendre : {episodesInProgress[0].title.substring(0, 20)}...
                    </button>
                 ) : (
                    <Link to="/trending" className="neon-button flex items-center gap-2">
                       <TrendingUp className="w-4 h-4" />
                       Découvrir
                    </Link>
                 )}
                 <Link to="/trending" className="px-6 py-3 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-bold text-sm hover:bg-[var(--accent-primary)]/10 transition-all border border-[var(--border-color)] flex items-center justify-center">
                    Parcourir les tendances
                 </Link>
              </div>
           </div>
        </div>
        )}

        {/* Continue Listening Section (Only if progression exists) */}
        {episodesInProgress.length > 0 && (
          <div className="mb-12 animate-fade-in">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)] shadow-glow-indigo">
                   <Play className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-2xl font-display font-black">Continuer l'écoute</h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {episodesInProgress.slice(0, 4).map((episode) => (
                  <EpisodeCard
                    key={`progress-${episode._id}`}
                    episode={episode}
                    onPlay={playEpisode}
                    onDetails={handleOpenDetails}
                    onToggleRead={handleToggleRead}
                  />
                ))}
             </div>
          </div>
        )}

        {/* Latest Episodes Section */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                 <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-display font-black">Récemment Publiés</h3>
           </div>
           <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-3 py-1 rounded-lg border border-[var(--border-color)]">{episodes.length} CHARGÉS</span>
        </div>

        {episodesLoading && skip === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="premium-glass rounded-[var(--radius-card)] h-80 shimmer" />
            ))}
          </div>
        ) : episodes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16 stagger-grid">
              {episodes.map((episode) => (
                <EpisodeCard
                  key={`${skip}-${episode._id}`}
                  episode={episode}
                  onPlay={playEpisode}
                  onDetails={handleOpenDetails}
                  onToggleRead={handleToggleRead}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="flex justify-center pb-20">
                <button
                  onClick={loadMore}
                  disabled={episodesFetching}
                  className="px-10 py-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)] transition-all flex items-center gap-3"
                >
                  {episodesFetching ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  {episodesFetching ? 'Chargement...' : 'Charger la suite'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="premium-glass p-16 rounded-[var(--radius-panel)] text-center max-w-2xl mx-auto border-dashed border-[var(--border-color)]">
            <div className="text-4xl mb-6 opacity-40">🧘</div>
            <p className="font-bold text-lg mb-2 text-[var(--text-primary)]">Silence radio...</p>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8">
              Vous n'avez pas encore d'épisodes ici. Abonnez-vous à vos podcasts favoris pour commencer votre collection.
            </p>
            <Link to="/trending" className="neon-button">Explorer les podcasts</Link>
          </div>
        )}
      </main>

      {/* Episode Slide-over Details */}
      <EpisodeDetails 
        episode={detailsEpisode}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onPlay={playEpisode}
      />

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
