import { Episode } from '../services/episodeService';
import { Play, Clock, Calendar } from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
}

export default function EpisodeCard({ episode, onPlay }: EpisodeCardProps) {
  const podcast = typeof episode.podcastId === 'object' ? episode.podcastId : null;
  const pubDate = new Date(episode.pubDate).toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const durationMinutes = Math.floor(episode.duration / 60);

  return (
    <div 
      className="group premium-glass rounded-[2rem] p-4 hover:bg-white/5 transition-all duration-500 border-white/5 hover:border-white/10 flex flex-col h-full cursor-pointer"
      onClick={() => onPlay(episode)}
    >
      {/* Visual Header */}
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-5 shadow-xl border border-white/5">
        {podcast?.imageUrl ? (
          <img
            src={podcast.imageUrl}
            alt={podcast.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-indigo to-accent-rose flex items-center justify-center text-4xl">🎙️</div>
        )}
        
        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-obsidian/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-16 h-16 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo transform scale-90 group-hover:scale-100 transition-transform duration-500">
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
           <span className="text-[9px] font-black text-accent-indigo uppercase tracking-[0.2em] truncate flex-1">
             {podcast?.author || 'Artiste Premium'}
           </span>
        </div>
        
        <h3 className="text-sm font-bold text-white line-clamp-2 mb-4 leading-relaxed group-hover:text-accent-indigo transition-colors flex-1">
          {episode.title}
        </h3>

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{pubDate}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
