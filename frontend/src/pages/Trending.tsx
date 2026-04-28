import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import { podcastService } from '../services/podcastService';
import Header from '../components/Header';
import PodcastCard from '../components/PodcastCard';
import { authService } from '../services/authService';
import SuccessModal from '../components/SuccessModal';
import AlertModal, { AlertType } from '../components/AlertModal';
import { GENRES } from '../constants';
import { Flame, Loader, ChevronDown, Sparkles } from 'lucide-react';

export default function Trending() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPodcast, setSuccessPodcast] = useState<any>(null);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 30;

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: AlertType;
  }>({ isOpen: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    authService.getMe().then(r => setUser(r.user)).catch(() => {});
  }, []);

  const { data: subsData } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
  });

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
          const fresh = trendingData.podcasts.filter(
            (p: any) => !prev.some(old => old.id === p.id)
          );
          return [...prev, ...fresh];
        });
      }
      setHasMore(trendingData.podcasts.length === LIMIT);
    }
  }, [trendingData, skip]);

  useEffect(() => { setSkip(0); }, [selectedGenre]);

  const loadMore = () => {
    if (hasMore && !isFetching) setSkip(prev => prev + LIMIT);
  };

  const isSubscribed = (rssUrl: string) =>
    subsData?.podcasts.some((p: any) => p.rssUrl === rssUrl);

  const subscribeMutation = useMutation({
    mutationFn: (podcast: DiscoveryPodcast) =>
      discoveryService.subscribeFromDiscovery(podcast.rssUrl, {
        title: podcast.title, author: podcast.author, imageUrl: podcast.imageUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    },
    onError: () => {
      setAlertConfig({
        isOpen: true, title: "Erreur", message: "Impossible de s'abonner. Le flux est peut-être inaccessible.", type: 'error'
      });
    },
  });

  const handleSubscribe = async (podcast: DiscoveryPodcast) => {
    try {
      setSubscribingId(podcast.id);
      await subscribeMutation.mutateAsync(podcast);
      setSuccessPodcast(podcast);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    } catch { /* handled in onError */ }
    finally { setSubscribingId(null); }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      authService.clearTokens();
      window.location.href = '/login';
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen">
      <Header title="Tendances" subtitle="Exploration" user={user} onLogout={handleLogout} />

      <div>
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-rose)]/10 flex items-center justify-center text-[var(--accent-rose)] shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl">Top Podcasts</h2>
              <span className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">Mis à jour en temps réel</span>
            </div>
          </div>
        </div>

        {/* Genre pills */}
        <div className="relative mb-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar">
            {GENRES.map(genre => (
              <button key={genre.id} onClick={() => setSelectedGenre(genre.id)}
                className={`shrink-0 px-4 py-2.5 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  selectedGenre === genre.id
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
                }`}>
                {genre.label}
              </button>
            ))}
          </div>
          {/* Fade edges on mobile */}
          <div className="absolute left-0 top-0 bottom-3 w-10 bg-gradient-to-r from-[var(--bg-base)] to-transparent pointer-events-none sm:hidden" />
          <div className="absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-[var(--bg-base)] to-transparent pointer-events-none sm:hidden" />
        </div>

        {/* Results */}
        {isLoading && skip === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader className="w-10 h-10 text-[var(--accent-primary)] animate-spin-slow" />
            <span className="text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">Analyse des tendances...</span>
          </div>
        ) : podcasts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
              {podcasts.map((podcast, i) => (
                <PodcastCard
                  key={`${skip}-${podcast.id}`}
                  title={podcast.title} author={podcast.author} imageUrl={podcast.imageUrl}
                  rank={i + 1}
                  onSubscribe={() => handleSubscribe(podcast)}
                  isSubscribed={isSubscribed(podcast.rssUrl)}
                  isSubscribing={subscribingId === podcast.id}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-10 pb-32">
                <button onClick={loadMore} disabled={isFetching} className="btn-secondary min-w-[200px]">
                  {isFetching ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  {isFetching ? 'Chargement...' : 'Charger la suite'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="glass rounded-[var(--radius-xl)] p-16 text-center max-w-lg mx-auto">
            <Sparkles className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Aucune tendance pour le moment</p>
          </div>
        )}
      </div>

      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)}
        podcastTitle={successPodcast?.title || ""} podcastAuthor={successPodcast?.author || ""}
        podcastImage={successPodcast?.imageUrl || ""} />
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}
