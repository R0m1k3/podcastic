import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Episode } from '../services/episodeService';
import { useAudio } from '../context/AudioContext';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  Maximize2,
  X,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import AlertModal from './AlertModal';
import AudioVisualizer from './AudioVisualizer';
import { useTheme } from '../context/ThemeContext';

interface AudioPlayerProps {
  episode: Episode | null;
  onClose: () => void;
  userId?: string;
  mode?: 'floating' | 'inline';
}

export default function AudioPlayer({ episode, onClose, userId, mode = 'floating' }: AudioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    isMuted,
    isResuming,
    error,
    togglePlay,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    changeSpeed,
    setError,
    setUserId,
  } = useAudio();
  const { theme } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showMiniBar, setShowMiniBar] = useState(false);
  const inlineWrapperRef = useRef<HTMLDivElement>(null);

  // Sync userId into context so context can save/load progress
  useEffect(() => {
    setUserId(userId ?? null);
  }, [userId, setUserId]);

  // IntersectionObserver: show mini-bar when inline player scrolls out of view
  useEffect(() => {
    if (mode !== 'inline' || !inlineWrapperRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMiniBar(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-40px 0px 0px 0px' }
    );
    observer.observe(inlineWrapperRef.current);
    return () => observer.disconnect();
  }, [mode, episode?._id]);

  const podcast = typeof episode?.podcastId === 'object' ? episode.podcastId : null;

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!episode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const inverseTheme = theme === 'light' ? 'dark-theme' : 'light-theme';

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  // ── INLINE MODE (embedded in hero card) ──
  if (mode === 'inline') {
    return (
      <>
      <div ref={inlineWrapperRef} className="premium-glass rounded-[var(--radius-panel)] p-8 lg:p-10 relative overflow-hidden border border-[var(--border-color)]">
        <AlertModal
          isOpen={!!error}
          title="Erreur de lecture"
          message={error || ""}
          type="error"
          onClose={() => {
            setError(null);
            onClose();
          }}
        />

        {/* Glow backdrop */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-[var(--accent-glow)] blur-[80px] -mr-32 -mt-32 pointer-events-none transition-opacity duration-700 ${isPlaying ? 'animate-aura opacity-100' : 'opacity-40'}`} />

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
          {/* Artwork */}
          <div className="relative shrink-0">
            {/* Halo aura derrière l'artwork */}
            {isPlaying && (
              <div
                className="absolute inset-0 rounded-[var(--radius-card)] bg-[var(--accent-primary)]/20 blur-xl animate-aura scale-110 pointer-events-none -z-10"
                aria-hidden="true"
              />
            )}
            <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-[var(--border-color)]">
              {(episode.imageUrl || podcast?.imageUrl)
                ? <img
                    src={episode.imageUrl || podcast!.imageUrl}
                    alt=""
                    className={`w-full h-full object-cover transition-all duration-500 ${isPlaying ? 'animate-spin-slow' : 'animate-spin-slow animate-spin-paused'}`}
                  />
                : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-5xl">🎙️</div>
              }
            </div>
            {isPlaying && (
              <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-white text-[9px] font-black uppercase tracking-widest shadow-glow-indigo animate-pulse">
                En cours
              </div>
            )}
          </div>

          {/* Info + controls */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-3">
                  Lecture en cours
                </div>
                <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1 truncate">
                  {podcast?.title || ''}
                </p>
                <h2 className="text-2xl lg:text-3xl font-display font-black leading-tight mb-2 line-clamp-2">
                  {episode.title}
                </h2>
                {isResuming && (
                  <p className="text-[10px] text-[var(--accent-primary)] font-black uppercase animate-pulse">Reprise de lecture...</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-accent-rose hover:bg-accent-rose/10 transition-all shrink-0"
                aria-label="Fermer le lecteur"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="relative h-1.5 group cursor-pointer mb-2">
                <input type="range" min="0" max={duration || 0} value={currentTime}
                  onChange={handleProgressChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="w-full h-full bg-[var(--text-primary)]/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] tabular-nums font-bold">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Visualiseur audio */}
            <div className="w-full flex justify-center my-5">
              <AudioVisualizer barCount={28} height={80} gap={3} />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-5">
                <button onClick={() => seekRelative(-30)}
                  className="flex flex-col items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[8px] font-black">-30s</span>
                </button>
                <button onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button onClick={() => seekRelative(30)}
                  className="flex flex-col items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  <RotateCw className="w-5 h-5" />
                  <span className="text-[8px] font-black">+30s</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={changeSpeed}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] text-[10px] font-black text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-widest">
                  {playbackSpeed}x
                </button>
                <button onClick={toggleMute}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-[var(--text-primary)]/10 rounded-full appearance-none cursor-pointer accent-[var(--accent-primary)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mini sticky bar appears when inline player scrolls out of view */}
      {showMiniBar && createPortal(
        <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-auto lg:right-8 lg:bottom-8 lg:w-[calc(100%-22rem)] xl:w-[calc(100%-24rem)] z-[90] max-w-5xl mx-auto animate-slide-up">
          <div className="premium-glass rounded-[var(--radius-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 h-[72px]">
              {/* Artwork */}
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-[var(--border-color)] shrink-0">
                {(episode.imageUrl || podcast?.imageUrl)
                  ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-lg">🎙️</div>
                }
              </div>

              {/* Title */}
              <div className="min-w-0 flex-1 hidden sm:block">
                <p className="text-xs font-bold truncate leading-tight">{episode.title}</p>
                <p className="text-[9px] text-[var(--text-secondary)] font-bold truncate uppercase tracking-wider">{podcast?.title || ''}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => seekRelative(-30)} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" aria-label="-30s">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button onClick={() => seekRelative(30)} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" aria-label="+30s">
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Time + scroll up */}
              <div className="hidden md:flex items-center gap-3 shrink-0 text-[10px] text-[var(--text-secondary)] tabular-nums font-bold">
                <span>{formatTime(currentTime)}</span>
                <span className="opacity-40">/</span>
                <span>{formatTime(duration)}</span>
              </div>

              <button onClick={() => inlineWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all shrink-0"
                aria-label="Remonter au lecteur"
                title="Remonter au lecteur">
                <ChevronDown className="w-4 h-4 rotate-180" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="relative h-1 group cursor-pointer">
              <input type="range" min="0" max={duration || 0} value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="w-full h-full bg-[var(--text-primary)]/10">
                <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-100"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </>
    );
  }

  // ── FLOATING MODE (all pages except dashboard) ──
  return (
    <>
      <AlertModal
        isOpen={!!error}
        title="Erreur de lecture"
        message={error || ""}
        type="error"
        onClose={() => {
          setError(null);
          onClose();
        }}
      />

      {/* ── COMPACT UNIFIED MINI-BAR ── */}
      {!isExpanded && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-auto lg:right-8 lg:bottom-8 lg:w-[calc(100%-22rem)] xl:w-[calc(100%-24rem)] z-[90] max-w-5xl mx-auto animate-slide-up">
          <div className="premium-glass rounded-[var(--radius-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 h-[72px]">
              {/* Artwork */}
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-[var(--border-color)] shrink-0">
                {(episode.imageUrl || podcast?.imageUrl)
                  ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-lg">🎙️</div>
                }
              </div>

              {/* Title */}
              <div className="min-w-0 flex-1 hidden sm:block">
                <p className="text-xs font-bold truncate leading-tight">{episode.title}</p>
                {isResuming ? (
                  <p className="text-[9px] text-[var(--accent-primary)] font-black uppercase animate-pulse">Reprise de lecture...</p>
                ) : (
                  <p className="text-[9px] text-[var(--text-secondary)] font-bold truncate uppercase tracking-wider">{podcast?.title || ''}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => seekRelative(-30)} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" aria-label="-30s">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button onClick={() => seekRelative(30)} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" aria-label="+30s">
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Time */}
              <div className="hidden md:flex items-center gap-2 shrink-0 text-[10px] text-[var(--text-secondary)] tabular-nums font-bold">
                <span>{formatTime(currentTime)}</span>
                <span className="opacity-40">/</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Speed + Volume + Expand + Close */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={changeSpeed} className="hidden sm:block px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[10px] font-black text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-tighter w-10">
                  {playbackSpeed}x
                </button>
                <button onClick={toggleMute} className="hidden sm:block p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsExpanded(true)}
                  className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all"
                  aria-label="Agrandir">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-accent-rose transition-all"
                  aria-label="Fermer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-1 group cursor-pointer">
              <input type="range" min="0" max={duration || 0} value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="w-full h-full bg-[var(--text-primary)]/10">
                <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-100"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPANDED VIEW ── */}
      {isExpanded && (
        <div className={`fixed inset-0 z-[100] ${inverseTheme} text-[var(--text-primary)] ${theme === 'light' ? 'bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl' : 'premium-glass'} overflow-hidden flex flex-col`}>
          <div className="flex-1 flex flex-col p-8 lg:p-16 overflow-y-auto">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-10">
              <button onClick={() => setIsExpanded(false)}
                className="p-3 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all">
                <ChevronDown className="w-5 h-5" />
              </button>
              <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.3em]">En cours de lecture</p>
              <button onClick={onClose}
                className="p-3 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-accent-rose transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 items-center flex-1">
              {/* Artwork */}
              <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl border border-[var(--border-color)] shrink-0">
                {(episode.imageUrl || podcast?.imageUrl)
                  ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-7xl">🎙️</div>
                }
              </div>

              {/* Info + controls */}
              <div className="flex flex-col gap-8 flex-1 w-full max-w-lg">
                <div>
                  <p className="text-xs font-black text-[var(--accent-primary)] uppercase tracking-widest mb-2">{podcast?.title}</p>
                  <h2 className="text-3xl lg:text-4xl font-display font-black leading-tight mb-3">{episode.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">{episode.description}</p>
                </div>

                {/* Progress */}
                <div>
                  <div className="relative h-1.5 group cursor-pointer mb-2">
                    <input type="range" min="0" max={duration || 0} value={currentTime}
                      onChange={handleProgressChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-full h-full bg-[var(--text-primary)]/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button onClick={() => seekRelative(-30)}
                    className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group">
                    <RotateCcw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black">-30s</span>
                  </button>

                  <button onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                  </button>

                  <button onClick={() => seekRelative(30)}
                    className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group">
                    <RotateCw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black">+30s</span>
                  </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-4">
                  <button onClick={changeSpeed} className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] text-xs font-black text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-widest">
                    {playbackSpeed}x Speed
                  </button>
                  <button onClick={toggleMute} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors shrink-0">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1 bg-[var(--text-primary)]/10 rounded-full appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
