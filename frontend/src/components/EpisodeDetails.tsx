import React from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Clock, Calendar, BarChart2 } from 'lucide-react';
import { Episode } from '../services/episodeService';

interface EpisodeDetailsProps {
  episode: Episode | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (episode: Episode) => void;
}

export default function EpisodeDetails({ episode, isOpen, onClose, onPlay }: EpisodeDetailsProps) {
  if (!episode) return null;

  const podcast = typeof episode.podcastId === 'object' ? episode.podcastId : null;
  const durationMinutes = Math.floor(episode.duration / 60);
  const pubDate = new Date(episode.pubDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-[var(--bg-primary)] z-[120] shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header Image Area */}
        <div className="relative h-80 w-full overflow-hidden">
           {episode.imageUrl || podcast?.imageUrl ? (
             <img 
               src={episode.imageUrl || podcast?.imageUrl} 
               alt={episode.title} 
               className="w-full h-full object-cover"
             />
           ) : (
             <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/40 to-transparent" />
           
           <button 
             onClick={onClose}
             className="absolute top-6 right-6 p-3 rounded-2xl bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all"
           >
             <X className="w-6 h-6" />
           </button>

           <div className="absolute bottom-8 left-8 right-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-4">
                 Episode Détails
              </span>
              <h2 className="text-3xl lg:text-4xl font-display font-black leading-tight">{episode.title}</h2>
           </div>
        </div>

        {/* Content */}
        <div className="p-8 lg:p-12">
           {/* Meta Info */}
           <div className="flex flex-wrap gap-8 mb-10 pb-8 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]">
                    <Clock className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Durée</p>
                    <p className="font-bold">{durationMinutes} minutes</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]">
                    <Calendar className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Publié le</p>
                    <p className="font-bold">{pubDate}</p>
                 </div>
              </div>
              {episode.progress && (
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent-primary)]">
                       <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Progression</p>
                       <p className="font-bold">{Math.floor((episode.progress.position / episode.duration) * 100)}% écouté</p>
                    </div>
                 </div>
              )}
           </div>

           {/* Action Bar */}
           <div className="mb-12">
              <button 
                onClick={() => { onPlay(episode); onClose(); }}
                className="w-full py-5 rounded-3xl bg-[var(--accent-primary)] text-white font-black uppercase tracking-[0.2em] shadow-glow-indigo hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                <Play className="w-6 h-6 fill-current" />
                Lancer l'épisode
              </button>
           </div>

           {/* Description */}
           <div className="space-y-6">
              <h3 className="text-xl font-display font-black">À propos de cet épisode</h3>
              <div 
                className="prose dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed text-lg"
                dangerouslySetInnerHTML={{ __html: episode.description }}
              />
           </div>

           {/* Podcast Info */}
           {podcast && (
              <div className="mt-16 p-8 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-color)] group hover:border-[var(--accent-primary)] transition-all">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl border border-[var(--border-color)]">
                       <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-1">Disponible sur le podcast</p>
                       <h4 className="text-xl font-bold mb-1">{podcast.title}</h4>
                       <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-widest">{podcast.author}</p>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>
    </>,
    document.body
  );
}
