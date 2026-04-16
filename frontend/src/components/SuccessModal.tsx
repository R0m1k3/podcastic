import { CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Top Gradient */}
        <div className="h-2 bg-gradient-primary w-full" />
        
        <div className="p-8 flex flex-col items-center text-center">
          {/* Animated Success Icon */}
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>

          <h3 className="text-xl font-bold text-light-900 mb-2">
            {message}
          </h3>
          
          <div className="w-full bg-light-50 rounded-2xl p-4 mb-8 flex items-center gap-4 border border-light-100">
            {podcastImage ? (
              <img 
                src={podcastImage} 
                alt={podcastTitle} 
                className="w-16 h-16 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-light-200 flex items-center justify-center text-2xl">
                🎙️
              </div>
            )}
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-light-900 truncate">{podcastTitle}</p>
              {podcastAuthor && (
                <p className="text-sm text-light-500 truncate">{podcastAuthor}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Link
              to="/library"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all shadow-soft active:scale-[0.98]"
              onClick={onClose}
            >
              <BookOpen className="w-5 h-5" />
              Voir dans ma Bibliothèque
              <ChevronRight className="w-4 h-4" />
            </Link>
            
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-light-100 text-light-700 font-bold hover:bg-light-200 transition-all"
            >
              Continuer la recherche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
