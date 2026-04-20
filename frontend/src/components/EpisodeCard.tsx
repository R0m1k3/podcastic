import React from 'react';
import { Episode } from '../services/episodeService';
import { Play, Pause, Calendar, Activity, Check, CheckCircle2, Circle } from 'lucide-react';
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
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const durationMinutes = Math.floor(episode.duration / 60);

  // Badges — consider completed if flagged OR if ≥90% listened
  const progressPercent =
    episode.progress && episode.duration > 0
      ? episode.progress.position / episode.duration
      : 0;
  const isCompleted =
    episode.progress?.isCompleted === true || progressPercent >= 0.9;
  const isNew =
    !episode.progress &&
    Date.now() - new Date(episode.pubDate).getTime() < 7 * 24 * 60 * 60 * 1000;

  const handleDetailsClick = (e: React.MouseEvent) => {
    if (onDetails) {
      e.stopPropagation();
      onDetails(episode);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      onPlay(episode);
    }
  };

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleRead) onToggleRead(episode, !isCompleted);
  };

  return (
    <div 
      className="group premium-card premium-glass rounded-[var(--radius-card)] p-4 hover:bg-[var(--bg-secondary)] transition-all duration-500 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 flex flex-col h-full cursor-pointer relative"
      onClick={handleDetailsClick}
    >
      {/* Visual Header */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-5 shadow-xl border border-[var(--border-color)]">
        {(episode.imageUrl || podcast?.imageUrl) ? (
          <img
            src={episode.imageUrl || podcast!.imageUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-4xl">🎙️</div>
        )}
        
        {/* Status Badges - top left */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          {isCompleted && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/90 backdrop-blur-md border border-emerald-300/30 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Check className="w-3 h-3" />
              LU
            </div>
          )}
        </div>

        {/* Hover Play Button Overlay */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div
            onClick={handlePlayClick}
            className="w-16 h-16 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo transform scale-90 group-hover:scale-100 transition-transform duration-500 active:scale-95"
          >
            {isCurrent && isPlaying
              ? <Pause className="w-6 h-6 fill-current" />
              : <Play className="w-6 h-6 fill-current ml-1" />
            }
          </div>
        </div>
        
        {/* Duration/Status Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
           {isCurrent && (
             <div className="px-2 py-1 rounded-lg bg-[var(--accent-primary)] border border-[var(--accent-primary)]/20 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-glow-indigo animate-pulse">
                <Activity className="w-3 h-3" />
                {isPlaying ? "EN COURS" : "EN PAUSE"}
             </div>
           )}
           <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
              {durationMinutes} MIN
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
           <span className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] truncate flex-1">
             {podcast?.author || 'Artiste Premium'}
           </span>
        </div>
        
        <h3 className="text-sm font-bold line-clamp-2 mb-4 leading-relaxed group-hover:text-[var(--accent-primary)] transition-colors flex-1">
          {episode.title}
        </h3>

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{pubDate}</span>
           </div>
           {onToggleRead && (
             <button
               onClick={handleToggleRead}
               title={isCompleted ? 'Marquer comme non lu' : 'Marquer comme lu'}
               className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 border ${
                 isCompleted
                   ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                   : 'text-[var(--text-secondary)] border-transparent hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10'
               }`}
             >
               {isCompleted
                 ? <CheckCircle2 className="w-3.5 h-3.5" />
                 : <Circle className="w-3.5 h-3.5" />
               }
               <span>{isCompleted ? 'Lu' : 'Lu ?'}</span>
             </button>
           )}
        </div>
      </div>

      {/* Local Progress Bar */}
      {episode.progress && !isCompleted && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-[2rem] overflow-hidden">
           <div 
             className="h-full bg-[var(--accent-primary)] shadow-glow-indigo transition-all duration-1000"
             style={{ width: `${Math.min(100, (episode.progress.position / episode.duration) * 100)}%` }}
           />
        </div>
      )}
    </div>
  );
}
