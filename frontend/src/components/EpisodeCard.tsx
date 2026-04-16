import { Episode } from '../services/episodeService';
import { Play } from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
}

export default function EpisodeCard({ episode, onPlay }: EpisodeCardProps) {
  const podcast = typeof episode.podcastId === 'object' ? episode.podcastId : null;
  const pubDate = new Date(episode.pubDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const durationMinutes = Math.floor(episode.duration / 60);

  return (
    <div className="group cursor-pointer">
      <div className="relative rounded-2xl overflow-hidden mb-3 glossy">
        {/* Podcast Image */}
        <div className="aspect-square bg-light-200 flex items-center justify-center relative overflow-hidden">
          {podcast?.imageUrl ? (
            <img
              src={podcast.imageUrl}
              alt={podcast.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-white text-4xl">
              🎙️
            </div>
          )}

          {/* Play Button Overlay */}
          <button
            onClick={() => onPlay(episode)}
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-blue-500 ml-1" fill="currentColor" />
            </div>
          </button>
        </div>

        {/* Podcast Title */}
        <p className="text-xs font-semibold text-light-500 uppercase tracking-wider mb-1">
          {podcast?.author || 'Unknown'}
        </p>

        {/* Episode Title */}
        <h3 className="text-sm font-bold text-light-900 line-clamp-2 mb-2 group-hover:text-blue-500 transition-colors">
          {episode.title}
        </h3>

        {/* Episode Meta */}
        <div className="flex items-center justify-between text-xs text-light-500">
          <span>{pubDate}</span>
          <span>{durationMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
