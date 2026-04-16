import React from 'react';
import { Episode } from '../services/episodeService';
import { Play, Calendar } from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
  onDetails?: (episode: Episode) => void;
}

export default function EpisodeCard({ episode, onPlay, onDetails }: EpisodeCardProps) {
  const podcast = typeof episode.podcastId === 'object' ? episode.podcastId : null;
  const pubDate = new Date(episode.pubDate).toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const durationMinutes = Math.floor(episode.duration / 60);

  const handleDetailsClick = (e: React.MouseEvent) => {
    if (onDetails) {
      e.stopPropagation();
      onDetails(episode);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(episode);
  };

  return (
    <div 
      className="group premium-glass rounded-[2rem] p-4 hover:bg-[var(--bg-secondary)] transition-all duration-500 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 flex flex-col h-full cursor-pointer relative"
      onClick={handleDetailsClick}
    >
      {/* Visual Header */}
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-5 shadow-xl border border-[var(--border-color)]">
        {(episode.imageUrl || podcast?.imageUrl) ? (
          <img
            src={episode.imageUrl || podcast!.imageUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-4xl">🎙️</div>
        )}
        
        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <div 
            onClick={handlePlayClick}
            className="w-16 h-16 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo transform scale-90 group-hover:scale-100 transition-transform duration-500 active:scale-95"
          >
            <Play className="w-6 h-6 fill-current ml-1" />
          </div>
        </div>
        
        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
           {durationMinutes} MIN
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
        </div>
      </div>

      {/* Local Progress Bar */}
      {episode.progress && !episode.progress.isCompleted && (
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
