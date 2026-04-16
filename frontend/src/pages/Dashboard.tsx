import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { episodeService, Episode } from '../services/episodeService';
import { authService } from '../services/authService';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import AudioPlayer from '../components/AudioPlayer';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-light">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-light-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
          <p className="text-light-600">Loading your podcasts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-50">
      <Header
        title="Podcastic"
        subtitle="Your podcast companion"
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-light-900 mb-2">
            Welcome back, {user?.username}! 👋
          </h2>
          <p className="text-light-600">
            {episodesData?.count || 0} new episodes from your subscriptions
          </p>
        </div>

        {/* Latest Episodes Grid */}
        {episodesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-light-200 border-t-blue-500 animate-spin mx-auto mb-3"></div>
              <p className="text-light-600">Loading episodes...</p>
            </div>
          </div>
        ) : episodesData?.episodes && episodesData.episodes.length > 0 ? (
          <div>
            <h3 className="text-2xl font-bold text-light-900 mb-6">Latest Episodes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {episodesData.episodes.map((episode) => (
                <EpisodeCard
                  key={episode._id}
                  episode={episode}
                  onPlay={setSelectedEpisode}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-light-600 text-lg mb-4">No episodes yet</p>
            <p className="text-light-500">
              Subscribe to podcasts to see episodes in your dashboard
            </p>
          </div>
        )}
      </main>

      {/* Audio Player */}
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
