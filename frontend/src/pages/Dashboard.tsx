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
           <div className="absolute top-0 right-0 w-64 h-64 bg-accent-indigo/10 blur-[80px] -mr-32 -mt-32 group-hover:bg-accent-indigo/20 transition-all duration-700" />
           <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 text-[10px] font-black text-accent-indigo uppercase tracking-widest mb-4">
                 <Sparkles className="w-3 h-3" />
                 Podcastic Premium
              </div>
              <h2 className="text-4xl lg:text-5xl font-display font-black text-white mb-4 tracking-tight leading-tight max-w-2xl">
                 Découvrez les nouveautés de votre univers audio.
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-xl leading-relaxed">
                 Vous avez {episodesData?.count || 0} nouveaux épisodes qui n'attendent que vous. Prêt pour une immersion ?
              </p>
              <div className="flex flex-wrap gap-4">
                 <button className="neon-button flex items-center gap-2">
                    <Play className="w-4 h-4 fill-current" />
                    Reprendre la lecture
                 </button>
                 <button className="px-6 py-3 rounded-2xl bg-white/5 text-slate-300 font-bold text-sm hover:bg-white/10 transition-all border border-white/5">
                    Parcourir les tendances
                 </button>
              </div>
           </div>
        </div>

        {/* Latest Episodes Section */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                 <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-display font-black text-white">Récemment Publiés</h3>
           </div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1 rounded-lg border border-white/5">{episodesData?.episodes?.length || 0} EPISODES</span>
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
