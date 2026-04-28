import { Play, Plus, Check, Loader, Trash2, RefreshCw, Calendar } from 'lucide-react';

interface PodcastCardProps {
  title: string;
  author?: string;
  imageUrl?: string;
  rank?: number;
  episodeCount?: number;
  language?: string;
  description?: string;
  lastEpisodeTitle?: string;
  lastEpisodeDate?: string;
  // Subscribe
  onSubscribe?: () => void;
  isSubscribed?: boolean;
  isSubscribing?: boolean;
  // Library
  onSync?: () => void;
  isSyncing?: boolean;
  onUnsubscribe?: () => void;
  confirmDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
  // Navigation
  onClick?: () => void;
}

export default function PodcastCard({
  title, author, imageUrl, rank, episodeCount, language, description,
  lastEpisodeTitle, lastEpisodeDate,
  onSubscribe, isSubscribed, isSubscribing,
  onSync, isSyncing, onUnsubscribe,
  confirmDelete, onConfirmDelete, onCancelDelete,
  onClick,
}: PodcastCardProps) {
  return (
    <div
      className="card rounded-[var(--radius-lg)] overflow-hidden flex flex-col h-full cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-4xl">🎙️</div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/85 text-white flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {rank && (
              <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[0.6rem] font-extrabold uppercase tracking-wider border border-white/10">
                #{rank}
              </span>
            )}
          </div>
          {isSubscribed && (
            <span className="px-2 py-1 rounded-md bg-[var(--accent-emerald)]/90 backdrop-blur-md text-white text-[0.6rem] font-extrabold uppercase tracking-wider flex items-center gap-1 border border-emerald-300/20">
              <Check className="w-3 h-3" /> Abonné
            </span>
          )}
        </div>

        {/* Bottom badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {episodeCount !== undefined && (
            <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[0.6rem] font-bold uppercase tracking-wider border border-white/10">
              {episodeCount} ép.
            </span>
          )}
          {language && (
            <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[0.6rem] font-bold uppercase tracking-wider border border-white/10">
              {language}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        {author && (
          <p className="text-[0.65rem] font-bold text-[var(--accent-primary)] uppercase tracking-wider truncate mb-1">
            {author}
          </p>
        )}

        <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-3 group-hover:text-[var(--accent-primary)] transition-colors flex-1">
          {title}
        </h3>

        {description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">{description}</p>
        )}

        {/* Last episode preview */}
        {lastEpisodeTitle && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-sm)] p-2.5 mb-3">
            <p className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Dernier épisode</p>
            <p className="text-xs font-semibold line-clamp-1">{lastEpisodeTitle}</p>
            {lastEpisodeDate && (
              <p className="text-[0.6rem] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(lastEpisodeDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-[var(--border-color)] mt-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <button onClick={(e) => { e.stopPropagation(); onConfirmDelete?.(); }}
                className="flex-1 py-2 rounded-lg bg-[var(--accent-rose)] text-white text-[0.65rem] font-bold uppercase tracking-wider hover:bg-[var(--accent-rose)]/80 transition-all">
                Confirmer
              </button>
              <button onClick={(e) => { e.stopPropagation(); onCancelDelete?.(); }}
                className="flex-1 py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[0.65rem] font-bold uppercase tracking-wider hover:bg-[var(--bg-elevated)] transition-all border border-[var(--border-color)]">
                Annuler
              </button>
            </div>
          ) : onUnsubscribe ? (
            <div className="flex items-center justify-end gap-3">
              {onSync && (
                <button onClick={(e) => { e.stopPropagation(); onSync(); }}
                  disabled={isSyncing}
                  className="btn-ghost text-[0.65rem]">
                  {isSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Resync
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onUnsubscribe(); }}
                className="btn-ghost text-[0.65rem] !text-[var(--accent-rose)] hover:!text-[var(--accent-rose)]">
                <Trash2 className="w-3 h-3" />
                Retirer
              </button>
            </div>
          ) : onSubscribe ? (
            <button
              onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
              disabled={isSubscribing || isSubscribed}
              className={`w-full py-2.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isSubscribed
                  ? 'bg-[var(--accent-emerald)]/10 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/20'
                  : 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:bg-[var(--accent-primary)] hover:text-white active:scale-[0.98]'
              }`}>
              {isSubscribing ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
               isSubscribed  ? <><Check className="w-3.5 h-3.5" /> Abonné</> :
                               <><Plus className="w-3.5 h-3.5" /> S'abonner</>}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
