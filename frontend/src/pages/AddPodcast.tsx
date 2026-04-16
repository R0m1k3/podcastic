import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService, DiscoveryPodcast } from '../services/discoveryService';
import { podcastService } from '../services/podcastService';
import { episodeService, Episode } from '../services/episodeService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import EpisodeDetails from '../components/EpisodeDetails';
import { useAudio } from '../context/AudioContext';
import AlertModal, { AlertType } from '../components/AlertModal';
import { Search, Plus, Loader, Rss, Check, Globe, Sparkles, PlusCircle, LayoutGrid, ListMusic } from 'lucide-react';
import { authService } from '../services/authService';
import SuccessModal from '../components/SuccessModal';
import { GENRES } from '../constants';

export default function AddPodcast() {
  const queryClient = useQueryClient();
  const { playEpisode } = useAudio();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'podcasts' | 'episodes'>('podcasts');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [rssUrl, setRssUrl] = useState('');
  const [rssLoading, setRssLoading] = useState(false);
  
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

  const [rssSuccess, setRssSuccess] = useState<string | null>(null);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>(GENRES[1].id); // Tech by default or first genre
  
  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPodcast, setSuccessPodcast] = useState<any>(null);

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

  const handleOpenDetails = (episode: Episode) => {
    setDetailsEpisode(episode);
    setIsDetailsOpen(true);
  };

  // Podcast Discovery Query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['discover', 'search', searchQuery],
    queryFn: () => discoveryService.discoverPodcasts(searchQuery, 30),
    enabled: searchQuery.length > 2 && searchType === 'podcasts',
    staleTime: 5 * 60 * 1000,
  });

  // Episode Global Search Query
  const { data: episodeResults, isLoading: isSearchingEpisodes } = useQuery({
      queryKey: ['episodes', 'search', searchQuery],
      queryFn: () => episodeService.searchEpisodes(searchQuery, 40),
      enabled: searchQuery.length > 2 && searchType === 'episodes',
      staleTime: 2 * 60 * 1000,
  });

  // Trending discovery for the "Add" page when no search is active
  const { data: trendingResults, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['discover', 'trending', selectedGenre],
    queryFn: () => discoveryService.getTrendingPodcasts(18, selectedGenre),
    enabled: searchQuery.length === 0 && searchType === 'podcasts',
    staleTime: 30 * 60 * 1000,
  });

  const { data: subsData } = useQuery({
    queryKey: ['podcasts', 'subscriptions'],
    queryFn: () => podcastService.getUserSubscriptions(),
  });

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
    },
  });

  const handleSubscribe = async (podcast: DiscoveryPodcast) => {
    try {
      setSubscribingId(podcast.id);
      await subscribeMutation.mutateAsync(podcast);
      setSuccessPodcast(podcast);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['episodes', 'latest'] });
    } catch (error: any) {
      console.error(error);
    } finally {
      setSubscribingId(null);
    }
  };

  const handleRssSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rssUrl.trim()) return;
    setRssLoading(true);
    setRssSuccess(null);
    try {
      const result = await podcastService.subscribe(rssUrl.trim());
      setRssSuccess(`"${result.podcast.title}" ajouté !`);
      setRssUrl('');
      queryClient.invalidateQueries({ queryKey: ['podcasts', 'subscriptions'] });
    } catch (error: any) {
      setAlertConfig({
        isOpen: true,
        title: "Échec de l'ajout",
        message: error.response?.data?.message || "Impossible d'ajouter ce podcast. Vérifiez que l'URL du flux RSS est correcte et accessible.",
        type: 'error'
      });
    } finally {
      setRssLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Exploration"
        subtitle="DÉCOUVRIR"
        user={user}
        onLogout={() => {}}
      />

      <main className="max-w-5xl mx-auto">
        {/* RSS Input Area */}
        <div className="premium-glass p-8 rounded-[var(--radius-panel)] mb-12 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/5 blur-[50px]" />
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-rose/10 flex items-center justify-center text-accent-rose shadow-glow-indigo">
                   <Rss className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-black">Flux RSS Direct</h3>
              </div>
              
              <form onSubmit={handleRssSubscribe} className="flex flex-col sm:flex-row gap-4">
                 <input
                    type="url"
                    placeholder="URL du flux RSS (ex: https://feed.podbean.com/...)"
                    value={rssUrl}
                    onChange={(e) => { setRssUrl(e.target.value); setRssSuccess(null); }}
                    className="input-premium flex-1"
                 />
                 <button
                    type="submit"
                    disabled={rssLoading || !rssUrl.trim()}
                    className="neon-button !from-accent-rose !to-accent-rose/80 shrink-0"
                 >
                    {rssLoading ? <Loader className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    <span>Ajouter</span>
                 </button>
              </form>
              
              {rssSuccess && <p className="mt-4 text-xs font-bold text-accent-cyan animate-fade-in">✨ {rssSuccess}</p>}
           </div>
        </div>

        {/* Global Search Bar with Tabs */}
        <div className="mb-12">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-accent-indigo/10 flex items-center justify-center text-accent-indigo shadow-glow-indigo">
                    <Search className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-display font-black">Recherche Intelligente</h3>
              </div>

              {/* Tabs */}
              <div className="flex p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                 <button 
                  onClick={() => setSearchType('podcasts')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${searchType === 'podcasts' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 >
                    <LayoutGrid className="w-3 h-3" />
                    Podcasts
                 </button>
                 <button 
                  onClick={() => setSearchType('episodes')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${searchType === 'episodes' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 >
                    <ListMusic className="w-3 h-3" />
                    Épisodes
                 </button>
              </div>
           </div>
           
           <div className="relative group">
              <input
                type="text"
                placeholder={searchType === 'podcasts' ? "Trouvez un podcast (Base iTunes FR)..." : "Cherchez un sujet dans tous les épisodes..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-premium !py-6 !pl-16 text-xl shadow-2xl transition-all group-hover:bg-[var(--bg-secondary)]"
              />
              <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-[var(--accent-primary)] transition-colors" />
           </div>

           {/* Category Discovery Pills */}
           {searchType === 'podcasts' && (
             <div className="flex items-center gap-2 overflow-x-auto pb-4 mt-8 no-scrollbar">
               {GENRES.map(genre => (
                 <button
                   key={genre.id}
                   onClick={() => {
                       setSelectedGenre(genre.id);
                       setSearchQuery(''); 
                   }}
                   className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                     selectedGenre === genre.id && searchQuery === ''
                      ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-glow-indigo' 
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]'
                   }`}
                 >
                   {genre.label || 'Explorer'}
                 </button>
               ))}
             </div>
           )}
        </div>

        {/* Dynamic Results Grid */}
        {(isSearching || isSearchingEpisodes || isTrendingLoading) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3,4,5,6].map(i => <div key={i} className="premium-glass rounded-[var(--radius-card)] h-64 animate-pulse opacity-50" />)}
          </div>
        ) : searchType === 'podcasts' && (searchQuery.length > 0 ? searchResults?.podcasts : trendingResults?.podcasts) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
            {(searchQuery.length > 0 ? searchResults?.podcasts : trendingResults?.podcasts).map((podcast: any) => (
              <div key={podcast.id} className="group premium-card premium-glass rounded-[var(--radius-card)] overflow-hidden flex flex-col hover:bg-[var(--bg-secondary)] transition-all duration-500 border-[var(--border-color)]">
                <div className="relative aspect-[16/10] overflow-hidden">
                   {podcast.imageUrl ? (
                     <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-br from-slate-800 to-obsidian flex items-center justify-center text-4xl">🎙️</div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent opacity-60" />
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight group-hover:text-[var(--accent-primary)] transition-colors">{podcast.title}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 truncate">{podcast.author || 'Inconnu'}</p>
                  
                  <button
                    onClick={() => handleSubscribe(podcast)}
                    disabled={subscribingId === podcast.id || subscribeMutation.isPending || isSubscribed(podcast.rssUrl)}
                    className={`mt-auto w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300 flex items-center justify-center gap-2 ${
                      isSubscribed(podcast.rssUrl)
                        ? 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/20'
                        : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-primary)] hover:text-white'
                    }`}
                  >
                    {subscribingId === podcast.id ? <Loader className="w-4 h-4 animate-spin" /> : isSubscribed(podcast.rssUrl) ? <><Check className="w-4 h-4" /> Membre</> : <><Plus className="w-4 h-4" /> S'abonner</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : searchType === 'episodes' && episodeResults?.episodes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
            {episodeResults.episodes.map((episode) => (
              <EpisodeCard 
                key={episode._id}
                episode={episode}
                onPlay={playEpisode}
                onDetails={handleOpenDetails}
              />
            ))}
          </div>
        ) : searchQuery.length >= 2 && !isSearching && !isSearchingEpisodes ? (
          <div className="premium-glass p-20 rounded-[var(--radius-panel)] text-center max-w-lg mx-auto">
            <Globe className="w-12 h-12 text-slate-700 mx-auto mb-6" />
            <p className="font-bold uppercase tracking-widest text-sm mb-2">Aucun résultat sur iTunes FR</p>
            <p className="text-[var(--text-secondary)] text-xs">Vérifiez l'orthographe ou essayez un nom d'auteur.</p>
          </div>
        ) : (
          <div className="text-center py-20 opacity-30">
             <div className="p-8 inline-block rounded-full bg-white/[0.02] border border-white/5">
                <Search className="w-12 h-12 text-slate-700" />
             </div>
          </div>
        )}
      </main>

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

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        podcastTitle={successPodcast?.title || ""}
        podcastAuthor={successPodcast?.author || ""}
        podcastImage={successPodcast?.imageUrl || ""}
      />
    </div>
  );
}
