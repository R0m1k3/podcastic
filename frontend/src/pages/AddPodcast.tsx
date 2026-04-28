import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import { podcastService } from '../services/podcastService';
import { episodeService, Episode } from '../services/episodeService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import EpisodeDetails from '../components/EpisodeDetails';
import PodcastCard from '../components/PodcastCard';
import { useAudio } from '../context/AudioContext';
import AlertModal, { AlertType } from '../components/AlertModal';
import SuccessModal from '../components/SuccessModal';
import { authService } from '../services/authService';
import { Search, Loader, Rss, PlusCircle, LayoutGrid, ListMusic, Sparkles } from 'lucide-react';

export default function AddPodcast() {
  const queryClient = useQueryClient();
  const { playEpisode } = useAudio();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'podcasts' | 'episodes'>('podcasts');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [rssUrl, setRssUrl] = useState('');
  const [rssLoading, setRssLoading] = useState(false);
  const [rssSuccess, setRssSuccess] = useState<string | null>(null);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPodcast, setSuccessPodcast] = useState<any>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: AlertType;
  }>({ isOpen: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    authService.getMe().then(r => setUser(r.user)).catch(() => {});
  }, []);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['discover', 'search', searchQuery],
    queryFn: () => discoveryService.discoverPodcasts(searchQuery, 30),
    enabled: searchQuery.length >= 2 && searchType === 'podcasts',
    staleTime: 5 * 60 * 1000,
  });

  const { data: episodeResults, isLoading: isSearchingEpisodes } = useQuery({
    queryKey: ['episodes', 'search', searchQuery],
    queryFn: () => episodeService.searchEpisodes(searchQuery, 40),
    enabled: searchQuery.length >= 2 && searchType === 'episodes',
    staleTime: 2 * 60 * 1000,
  });

  const { data: trendingResults } = useQuery({
    queryKey: ['discover', 'trending', ''],
    queryFn: () => discoveryService.getTrendingPodcasts(18, ''),
    enabled: searchQuery.length === 0 && searchType === 'podcasts',
    staleTime: 30 * 60 * 1000,
  });

  const { data: subsData } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
  });

  const isSubscribed = (rssUrl: string) =>
    subsData?.podcasts.some((p: any) => p.rssUrl === rssUrl);

  const subscribeMutation = useMutation({
    mutationFn: (podcast: DiscoveryPodcast) =>
      discoveryService.subscribeFromDiscovery(podcast.rssUrl, {
        title: podcast.title, author: podcast.author, imageUrl: podcast.imageUrl,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] }); },
  });

  const handleSubscribe = async (podcast: DiscoveryPodcast) => {
    try {
      setSubscribingId(podcast.id);
      await subscribeMutation.mutateAsync(podcast);
      setSuccessPodcast(podcast);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    } catch { /* handled */ }
    finally { setSubscribingId(null); }
  };

  const handleRssSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rssUrl.trim()) return;
    setRssLoading(true);
    setRssSuccess(null);
    try {
      const result = await podcastService.subscribe(rssUrl.trim());
      setRssSuccess(`"${result.podcast.title}" ajouté avec succès !`);
      setRssUrl('');
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
    } catch (error: any) {
      setAlertConfig({
        isOpen: true, title: "Flux inaccessible",
        message: error.response?.data?.message || "Vérifiez que l'URL RSS est correcte et accessible.",
        type: 'error'
      });
    } finally { setRssLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <Header title="Exploration" subtitle="Découvrir" user={user} onLogout={() => {}} />

      <div>
        {/* RSS Section */}
        <div className="glass rounded-[var(--radius-xl)] p-8 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent-primary)]/5 blur-[50px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Rss className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-extrabold">Flux RSS direct</h3>
            </div>
            <form onSubmit={handleRssSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input type="url" placeholder="https://example.com/feed.xml" value={rssUrl}
                onChange={e => { setRssUrl(e.target.value); setRssSuccess(null); }}
                className="input flex-1" />
              <button type="submit" disabled={rssLoading || !rssUrl.trim()}
                className="btn-primary shrink-0 !bg-[var(--accent-primary)] !from-[var(--accent-primary)] !to-[var(--accent-primary)]">
                {rssLoading ? <Loader className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Ajouter
              </button>
            </form>
            {rssSuccess && (
              <p className="mt-3 text-xs font-semibold text-[var(--accent-emerald)] animate-fade-in flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {rssSuccess}
              </p>
            )}
          </div>
        </div>

        {/* Search section */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-color)]">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-extrabold">Recherche intelligente</h3>
            </div>

            {/* Tabs */}
            <div className="flex p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <button onClick={() => setSearchType('podcasts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                  searchType === 'podcasts'
                    ? 'bg-[var(--accent-primary)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Podcasts
              </button>
              <button onClick={() => setSearchType('episodes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                  searchType === 'episodes'
                    ? 'bg-[var(--accent-primary)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>
                <ListMusic className="w-3.5 h-3.5" /> Épisodes
              </button>
            </div>
          </div>

          <div className="relative">
            <input type="text"
              placeholder={searchType === 'podcasts'
                ? "Recherchez un podcast par nom ou auteur..."
                : "Cherchez un sujet dans tous les épisodes..."}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="input !py-5 !pl-14 !text-lg" />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          </div>
        </div>

        {/* Results */}
        {isSearching || isSearchingEpisodes ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton aspect-[3/4] rounded-[var(--radius-lg)]" />)}
          </div>
        ) : searchType === 'podcasts' && (searchQuery.length > 0 ? searchResults?.podcasts : trendingResults?.podcasts) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32 stagger">
            {(searchQuery.length > 0 ? searchResults!.podcasts : trendingResults!.podcasts).map((podcast: any) => (
              <PodcastCard
                key={podcast.id} title={podcast.title} author={podcast.author} imageUrl={podcast.imageUrl}
                onSubscribe={() => handleSubscribe(podcast)}
                isSubscribed={isSubscribed(podcast.rssUrl)}
                isSubscribing={subscribingId === podcast.id}
              />
            ))}
          </div>
        ) : searchType === 'episodes' && episodeResults?.episodes ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
            {episodeResults.episodes.map((ep: Episode) => (
              <EpisodeCard key={ep._id} episode={ep} onPlay={playEpisode}
                onDetails={(e) => { setDetailsEpisode(e); setIsDetailsOpen(true); }} />
            ))}
          </div>
        ) : searchQuery.length >= 2 ? (
          <div className="glass rounded-[var(--radius-xl)] p-16 text-center max-w-lg mx-auto">
            <Search className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Aucun résultat</p>
            <p className="text-xs text-[var(--text-muted)]">Vérifiez l'orthographe ou essayez un nom d'auteur.</p>
          </div>
        ) : null}
      </div>

      <EpisodeDetails episode={detailsEpisode} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} onPlay={playEpisode} />
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)}
        podcastTitle={successPodcast?.title || ""} podcastAuthor={successPodcast?.author || ""}
        podcastImage={successPodcast?.imageUrl || ""} />
    </div>
  );
}
