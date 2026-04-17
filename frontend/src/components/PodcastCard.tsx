import React from 'react';
import { Play, Plus, Check, Loader, Trash2, RefreshCw } from 'lucide-react';

interface PodcastCardProps {
  title: string;
  author?: string;
  imageUrl?: string;
  rank?: number;
  episodeCount?: number;
  language?: string;
  lastEpisodeTitle?: string;
  lastEpisodeDate?: string;
  // Subscribe action
  onSubscribe?: () => void;
  isSubscribed?: boolean;
  isSubscribing?: boolean;
  // Library actions
  onSync?: () => void;
  isSyncing?: boolean;
  onUnsubscribe?: () => void;
  confirmDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}

export default function PodcastCard({
  title,
  author,
  imageUrl,
  rank,
  episodeCount,
  language,
  lastEpisodeTitle,
  lastEpisodeDate,
  onSubscribe,
  isSubscribed,
  isSubscribing,
  onSync,
  isSyncing,
  onUnsubscribe,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
}: PodcastCardProps) {
  return (
    <div className="group premium-card premium-glass rounded-[var(--radius-card)] p-4 hover:bg-[var(--bg-secondary)] transition-all duration-500 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 flex flex-col h-full relative">
      {/* Image */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-4 shadow-xl border border-[var(--border-color)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-4xl">🎙️</div>
        )}

        {rank && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest shadow-lg z-10">
            #{rank}
          </div>
        )}

        {isSubscribed && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 backdrop-blur-md border border-emerald-300/30 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1 shadow-lg z-10">
            <Check className="w-3 h-3" />
            Abonné
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-16 h-16 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo transform scale-90 group-hover:scale-100 transition-transform duration-500">
            <Play className="w-6 h-6 fill-current ml-1" />
          </div>
        </div>

        {(episodeCount !== undefined || language) && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
            {episodeCount !== undefined && (
              <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
                {episodeCount} ép.
              </div>
            )}
            {language && (
              <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
                {language}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {author && (
          <span className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] truncate mb-1">
            {author}
          </span>
        )}

        <h3 className="text-sm font-bold line-clamp-2 leading-relaxed group-hover:text-[var(--accent-primary)] transition-colors flex-1 mb-4">
          {title}
        </h3>

        {lastEpisodeTitle && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 mb-4">
            <p className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-[0.15em] mb-1">Dernier épisode</p>
            <p className="text-xs font-bold line-clamp-1">{lastEpisodeTitle}</p>
            {lastEpisodeDate && (
              <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">
                {new Date(lastEpisodeDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-color)] mt-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <button onClick={onConfirmDelete} className="flex-1 py-2 bg-accent-rose text-white rounded-xl text-[10px] font-black uppercase hover:bg-accent-rose/80 transition-all">Confirmer</button>
              <button onClick={onCancelDelete} className="flex-1 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl text-[10px] font-black uppercase hover:bg-[var(--bg-primary)] transition-all">Annuler</button>
            </div>
          ) : onUnsubscribe ? (
            <div className="flex items-center justify-end gap-4">
              {onSync && (
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-widest disabled:opacity-50"
                >
                  {isSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Resync
                </button>
              )}
              <button
                onClick={onUnsubscribe}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:text-accent-rose transition-all uppercase tracking-widest"
              >
                <Trash2 className="w-3 h-3" />
                Désabonner
              </button>
            </div>
          ) : onSubscribe ? (
            <button
              onClick={onSubscribe}
              disabled={isSubscribing || isSubscribed}
              className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${
                isSubscribed
                  ? 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/20'
                  : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-primary)] hover:text-white active:scale-95'
              }`}
            >
              {isSubscribing ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : isSubscribed ? (
                <><Check className="w-3.5 h-3.5" /> Abonné</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> S'abonner</>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
