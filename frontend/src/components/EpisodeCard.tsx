import { Play, Pause, Calendar, Activity, CheckCircle2, Circle } from 'lucide-react';
import { Episode } from '../services/episodeService';
import { useAudio } from '../context/AudioContext';

interface EpisodeCardProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
  onDetails?: (episode: Episode) => void;
  onToggleRead?: (episode: Episode, completed: boolean) => void;
}

export default function EpisodeCard({ episode, onPlay, onDetails, onToggleRead }: EpisodeCardProps) {
  const { currentEpisode, isPlaying, togglePlay } = useAudio();
  const isCurrent = currentEpisode?._id === episode._id;
  const podcast = typeof episode.podcastId === 'object' ? episode.podcastId : null;

  const pubDate = new Date(episode.pubDate).toLocaleDateString('fr-FR', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  const durationMin = Math.floor(episode.duration / 60);

  const progressPct = episode.progress && episode.duration > 0
    ? (episode.progress.position / episode.duration) * 100 : 0;
  const isCompleted = episode.progress?.isCompleted === true || progressPct >= 90;
  const isInProgress = !isCompleted && episode.progress && episode.progress.position > 0;

  const handleClick = () => onDetails?.(episode);
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    isCurrent ? togglePlay() : onPlay(episode);
  };
  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRead?.(episode, !isCompleted);
  };

  return (
    <div
      className="card rounded-[var(--radius-lg)] overflow-hidden flex flex-col h-full cursor-pointer group relative"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {(episode.imageUrl || podcast?.imageUrl) ? (
          <img src={episode.imageUrl || podcast!.imageUrl} alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-3xl">🎙️</div>
        )}

        {/* Top left: completed badge */}
        <div className="absolute top-3 left-3">
          {isCompleted && (
            <span className="px-2 py-1 rounded-md bg-[var(--accent-emerald)]/90 backdrop-blur-md text-white text-[0.6rem] font-extrabold uppercase tracking-wider border border-emerald-300/20">
              LU
            </span>
          )}
        </div>

        {/* Hover play overlay */}
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 flex items-center justify-center ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div
            onClick={handlePlay}
            className="w-14 h-14 rounded-full bg-white/90 text-[var(--bg-base)] flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 active:scale-95"
          >
            {isCurrent && isPlaying
              ? <Pause className="w-5 h-5 fill-current" />
              : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </div>
        </div>

        {/* Bottom right: now playing + duration */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {isCurrent && (
            <span className={`px-2 py-1 rounded-md text-white text-[0.6rem] font-extrabold uppercase tracking-wider flex items-center gap-1 border animate-pulse ${
              isPlaying
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]/30'
                : 'bg-[var(--bg-elevated)] border-[var(--border-hover)]'
            }`}>
              <Activity className="w-3 h-3" />
              {isPlaying ? 'En cours' : 'Pause'}
            </span>
          )}
          <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[0.6rem] font-bold uppercase tracking-wider border border-white/10">
            {durationMin} min
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        <p className="text-[0.65rem] font-bold text-[var(--accent-primary)] uppercase tracking-wider truncate mb-1">
          {podcast?.author || ''}
        </p>
        <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-3 flex-1 group-hover:text-[var(--accent-primary)] transition-colors">
          {episode.title}
        </h3>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)] text-[0.65rem] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {pubDate}
          </span>
          {onToggleRead && (
            <button onClick={handleToggleRead}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all border ${
                isCompleted
                  ? 'text-[var(--accent-emerald)] border-[var(--accent-emerald)]/30 hover:bg-[var(--accent-emerald)]/10'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--accent-emerald)] hover:border-[var(--accent-emerald)]/30 hover:bg-[var(--accent-emerald)]/10'
              }`}>
              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              <span>{isCompleted ? 'Lu' : 'Marquer lu'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isInProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--border-color)]">
          <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-500"
            style={{ width: `${Math.min(100, progressPct)}%` }} />
        </div>
      )}
    </div>
  );
}
