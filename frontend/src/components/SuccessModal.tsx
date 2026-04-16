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
        className="absolute inset-0 bg-obsidian/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative premium-glass rounded-[3.5rem] w-full max-w-sm overflow-hidden animate-slide-up shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10">
        {/* Decorative Aura */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-indigo/20 blur-[60px] rounded-full" />
        
        <div className="p-10 flex flex-col items-center text-center relative z-10">
          {/* Header Actions */}
          <button onClick={onClose} className="absolute top-0 right-0 p-6 text-slate-500 hover:text-white transition-colors">
             <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="w-20 h-20 bg-accent-cyan/10 rounded-3xl flex items-center justify-center mb-8 shadow-glow-cyan border border-accent-cyan/20">
            <Sparkles className="w-8 h-8 text-accent-cyan animate-pulse" />
          </div>

          <h3 className="text-2xl font-display font-black text-white mb-2 leading-tight">
            {message}
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Nouveau membre de votre univers</p>
          
          <div className="w-full bg-white/[0.03] rounded-[2rem] p-5 mb-10 flex items-center gap-5 border border-white/5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
               {podcastImage ? (
                 <img src={podcastImage} alt={podcastTitle} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-accent-indigo to-accent-rose flex items-center justify-center text-2xl">🎙️</div>
               )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-lg font-bold text-white truncate mb-1">{podcastTitle}</p>
              {podcastAuthor && (
                <p className="text-xs font-bold text-accent-indigo truncate uppercase tracking-widest">{podcastAuthor}</p>
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
              className="w-full py-4 rounded-2xl bg-white/5 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
