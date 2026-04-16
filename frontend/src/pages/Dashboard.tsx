import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { episodeService, Episode } from '../services/episodeService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import AudioPlayer from '../components/AudioPlayer';
import { Sparkles, Play, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authService.getMe();
        setUser(response.user);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Fetch latest episodes
  const { data: episodesData, isLoading: episodesLoading } = useQuery({
    queryKey: ['episodes', 'latest'],
    queryFn: () => episodeService.getLatestEpisodes(30),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Extract episodes in progress
  const episodesInProgress = episodesData?.episodes?.filter(e => e.progress && !e.progress.isCompleted) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-accent-indigo animate-spin" />
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
        {/* Welcome Section / Hero */}
        <div className="premium-glass rounded-[3rem] p-8 lg:p-12 mb-12 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-glow)] blur-[80px] -mr-32 -mt-32 group-hover:bg-[var(--accent-primary)]/20 transition-all duration-700" />
           <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-4">
                 <Sparkles className="w-3 h-3" />
                 Podcastic Premium
              </div>
              <h2 className="text-4xl lg:text-5xl font-display font-black mb-4 tracking-tight leading-tight max-w-2xl">
                 Découvrez les nouveautés de votre univers audio.
              </h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-xl leading-relaxed">
                 Vous avez {episodesData?.count || 0} nouveaux épisodes qui n'attendent que vous. Prêt pour une immersion ?
              </p>
              <div className="flex flex-wrap gap-4">
                 {episodesInProgress.length > 0 ? (
                    <button 
                      onClick={() => setSelectedEpisode(episodesInProgress[0])}
                      className="neon-button flex items-center gap-2"
                    >
                       <Play className="w-4 h-4 fill-current" />
                       Reprendre : {episodesInProgress[0].title.substring(0, 20)}...
                    </button>
                 ) : (
                    <button className="neon-button flex items-center gap-2">
                       <TrendingUp className="w-4 h-4" />
                       Découvrir
                    </button>
                 )}
                 <button className="px-6 py-3 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-bold text-sm hover:bg-[var(--accent-primary)]/10 transition-all border border-[var(--border-color)]">
                    Parcourir les tendances
                 </button>
              </div>
           </div>
        </div>

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
                {episodesInProgress.map((episode) => (
                  <EpisodeCard
                    key={`progress-${episode._id}`}
                    episode={episode}
                    onPlay={setSelectedEpisode}
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
           <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-3 py-1 rounded-lg border border-[var(--border-color)]">{episodesData?.episodes?.length || 0} EPISODES</span>
        </div>

        {episodesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="premium-glass rounded-[2rem] h-80 animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : episodesData?.episodes && episodesData.episodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {episodesData.episodes.map((episode) => (
              <EpisodeCard
                key={episode._id}
                episode={episode}
                onPlay={setSelectedEpisode}
              />
            ))}
          </div>
        ) : (
          <div className="premium-glass p-16 rounded-[3rem] text-center max-w-2xl mx-auto border-dashed border-white/10">
            <div className="text-4xl mb-6 opacity-40">🧘</div>
            <p className="text-white font-bold text-lg mb-2">Silence radio...</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Vous n'avez pas encore d'épisodes ici. Abonnez-vous à vos podcasts favoris pour commencer votre collection.
            </p>
            <button className="neon-button">Explorer les podcasts</button>
          </div>
        )}
      </main>

      {/* Audio Player Management */}
      {selectedEpisode && (
        <AudioPlayer
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          userId={user?._id}
        />
      )}
    </div>
  );
}
