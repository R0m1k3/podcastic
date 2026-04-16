import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import { podcastService } from '../services/podcastService';
import Header from '../components/Header';
import { Loader, Plus, Flame, Check, Sparkles, TrendingUp } from 'lucide-react';
import { authService } from '../services/authService';
import SuccessModal from '../components/SuccessModal';
import AlertModal, { AlertType } from '../components/AlertModal';

export default function Trending() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  
  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPodcast, setSuccessPodcast] = useState<any>(null);

  // Alert state
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

  const GENRES = [
    { id: '', label: 'Tout' },
    { id: '1318', label: 'Technologie' },
    { id: '1303', label: 'Humour' },
    { id: '1321', label: 'Business' },
    { id: '1311', label: 'News' },
    { id: '1324', label: 'Société' },
    { id: '1316', label: 'Sports' },
    { id: '1310', label: 'Musique' },
    { id: '1301', label: 'Arts' },
    { id: '1315', label: 'Science' },
  ];

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

  const { data: subsData } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
  });

  const [skip, setSkip] = useState(0);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 30;

  const { data: trendingData, isLoading, isFetching } = useQuery({
    queryKey: ['discover', 'trending', selectedGenre, skip],
    queryFn: () => discoveryService.getTrendingPodcasts(LIMIT, selectedGenre),
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (trendingData?.podcasts) {
      if (skip === 0) {
        setPodcasts(trendingData.podcasts);
      } else {
        setPodcasts(prev => {
          const newItems = trendingData.podcasts.filter(
            (p: any) => !prev.some(old => old.id === p.id)
          );
          return [...prev, ...newItems];
        });
      }
      setHasMore(trendingData.podcasts.length === LIMIT);
    }
  }, [trendingData, skip]);

  // Reset skip when genre changes
  useEffect(() => {
    setSkip(0);
  }, [selectedGenre]);

  const loadMore = () => {
    if (hasMore && !isFetching) {
      setSkip(prev => prev + LIMIT);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    },
    onError: (error: any) => {
      setAlertConfig({
        isOpen: true,
        title: "Échec de l'abonnement",
        message: error.response?.data?.message || "Une erreur est survenue. Le flux de ce podcast est peut-être temporairement inaccessible.",
        type: 'error'
      });
    }
  });

  const handleSubscribe = async (podcast: DiscoveryPodcast) => {
    try {
      setSubscribingId(podcast.id);
      await subscribeMutation.mutateAsync(podcast);
      setSuccessPodcast(podcast);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    } catch (error: any) {
      setAlertConfig({
        isOpen: true,
        title: "Action impossible",
        message: "Une erreur critique est survenue lors de la tentative d'abonnement.",
        type: 'error'
      });
    } finally {
      setSubscribingId(null);
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
    <div className="min-h-screen">
      <Header
        title="Tendances"
        subtitle="EXPLORATION"
        user={user}
        onLogout={handleLogout}
      />

      <main className="">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-rose/10 flex items-center justify-center text-accent-rose">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
               <h2 className="text-2xl font-display font-black">Top Podcasts</h2>
               <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Mis à jour en temps réel</p>
            </div>
          </div>

          {/* Genre Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
             {GENRES.map(genre => (
               <button
                 key={genre.id}
                 onClick={() => setSelectedGenre(genre.id)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                   selectedGenre === genre.id 
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-glow-indigo' 
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]'
                 }`}
               >
                 {genre.label}
               </button>
             ))}
          </div>
        </div>

        {isLoading && skip === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
             <div className="w-12 h-12 rounded-full border-4 border-[var(--border-color)] border-t-[var(--accent-primary)] animate-spin mb-4" />
             <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[10px]">Analyse des tendances...</p>
          </div>
        ) : podcasts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {podcasts.map((podcast, index) => (
                <div key={`${skip}-${podcast.id}`} className="group premium-glass rounded-[var(--radius-card)] overflow-hidden flex flex-col hover:bg-[var(--bg-secondary)] transition-all duration-500">
                  <div className="relative aspect-[16/10] overflow-hidden">
                     {podcast.imageUrl ? (
                       <img
                         src={podcast.imageUrl}
                         alt={podcast.title}
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                       />
                     ) : (
                       <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-800 dark:to-obsididan flex items-center justify-center text-4xl">🎙️</div>
                     )}
                     <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                        Rank #{index + 1}
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent opacity-60" />
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
                      {podcast.title}
                    </h3>
                    {podcast.author && (
                      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 truncate">{podcast.author}</p>
                    )}
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-6 leading-relaxed flex-1 opacity-80">
                      {podcast.description}
                    </p>
                    
                    <button
                      onClick={() => handleSubscribe(podcast)}
                      disabled={subscribingId === podcast.id || subscribeMutation.isPending || isSubscribed(podcast.rssUrl)}
                      className={`w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300 flex items-center justify-center gap-2 ${
                        isSubscribed(podcast.rssUrl)
                          ? 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/20 cursor-default'
                          : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-primary)] hover:text-white shadow-lg active:scale-95'
                      }`}
                    >
                      {subscribingId === podcast.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : isSubscribed(podcast.rssUrl) ? (
                        <>
                          <Check className="w-4 h-4" />
                          À l'écoute
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          S'abonner
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pb-32">
                 <button 
                  onClick={loadMore}
                  disabled={isFetching}
                  className="px-10 py-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)] transition-all flex items-center gap-3"
                 >
                    {isFetching ? <Loader className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    {isFetching ? 'Chargement...' : 'Charger la suite'}
                 </button>
              </div>
            )}
          </>
        ) : (
           <div className="premium-glass p-20 rounded-[3rem] text-center">
              <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-6" />
              <p className="text-white font-bold uppercase tracking-widest">Aucune tendance pour le moment</p>
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
