import { CheckCircle2, ChevronRight, BookOpen, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  podcastTitle: string;
  podcastAuthor?: string;
  podcastImage?: string;
  message?: string;
}

export default function SuccessModal({
  isOpen,
  onClose,
  podcastTitle,
  podcastAuthor,
  podcastImage,
  message = "Podcast ajouté avec succès !"
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative premium-glass rounded-[3.5rem] w-full max-w-sm overflow-hidden animate-slide-up shadow-2xl border-[var(--border-color)]">
        {/* Decorative Aura */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--accent-glow)] blur-[60px] rounded-full" />
        
        <div className="p-10 flex flex-col items-center text-center relative z-10">
          {/* Header Actions */}
          <button onClick={onClose} className="absolute top-0 right-0 p-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
             <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="w-20 h-20 bg-[var(--accent-glow)] rounded-3xl flex items-center justify-center mb-8 shadow-glow-indigo border border-[var(--border-color)]">
            <Sparkles className="w-8 h-8 text-[var(--accent-primary)] animate-pulse" />
          </div>

          <h3 className="text-2xl font-display font-black mb-2 leading-tight">
            {message}
          </h3>
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-8">Nouveau membre de votre univers</p>
          
          <div className="w-full bg-[var(--bg-secondary)] rounded-[2rem] p-5 mb-10 flex items-center gap-5 border border-[var(--border-color)]">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)] shrink-0">
               {podcastImage ? (
                 <img src={podcastImage} alt={podcastTitle} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-2xl">🎙️</div>
               )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-lg font-bold truncate mb-1">{podcastTitle}</p>
              {podcastAuthor && (
                <p className="text-xs font-bold text-[var(--accent-primary)] truncate uppercase tracking-widest">{podcastAuthor}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col w-full gap-4">
            <Link
              to="/library"
              className="neon-button !rounded-2xl !py-4 flex items-center justify-center gap-3"
              onClick={onClose}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.2em]">Ma Bibliothèque</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] transition-all border border-[var(--border-color)]"
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
