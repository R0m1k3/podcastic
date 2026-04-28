import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Episode } from '../services/episodeService';
import { useAudio } from '../context/AudioContext';
import {
  Play, Pause, Volume2, VolumeX, ChevronDown,
  Maximize2, X, RotateCcw, RotateCw, Headphones,
} from 'lucide-react';
import AlertModal from './AlertModal';
import AudioVisualizer from './AudioVisualizer';

interface AudioPlayerProps {
  episode: Episode | null;
  onClose: () => void;
  userId?: string;
  mode?: 'floating' | 'inline';
}

export default function AudioPlayer({ episode, onClose, userId, mode = 'floating' }: AudioPlayerProps) {
  const {
    isPlaying, currentTime, duration, volume, playbackSpeed,
    isMuted, isResuming, error,
    togglePlay, seek, seekRelative, setVolume, toggleMute, changeSpeed,
    setError, setUserId,
  } = useAudio();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showMiniBar, setShowMiniBar] = useState(false);
  const inlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUserId(userId ?? null); }, [userId, setUserId]);

  // IntersectionObserver with debounce to prevent flicker
  const miniTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode !== 'inline' || !inlineRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (miniTimer.current) clearTimeout(miniTimer.current);
        miniTimer.current = setTimeout(() => {
          setShowMiniBar(!entry.isIntersecting);
        }, 250);
      },
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' }
    );
    obs.observe(inlineRef.current);
    return () => {
      obs.disconnect();
      if (miniTimer.current) clearTimeout(miniTimer.current);
    };
  }, [mode, episode?._id]);

  const podcast = typeof episode?.podcastId === 'object' ? episode.podcastId : null;

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!episode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => seek(parseFloat(e.target.value));
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value));

  const closeAlert = () => { setError(null); onClose(); };

  const MiniPlayer = ({ fullWidth }: { fullWidth?: boolean }) => (
    <div className={`fixed z-[90] mx-auto animate-slide-up max-w-5xl ${fullWidth
      ? 'bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-auto lg:right-8 lg:bottom-8 lg:w-[calc(100%-22rem)] xl:w-[calc(100%-24rem)]'
      : 'bottom-6 left-4 right-4 sm:left-6 sm:right-6'}`}>
      <div className="glass rounded-[var(--radius-lg)] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-[68px]">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border-color)] shrink-0 shadow-md">
            {(episode.imageUrl || podcast?.imageUrl)
              ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-base">🎙️</div>}
          </div>

          <div className="min-w-0 flex-1 hidden sm:block">
            <p className="text-xs font-bold truncate leading-tight">{episode.title}</p>
            {isResuming
              ? <p className="text-[0.6rem] text-[var(--accent-primary)] font-bold uppercase animate-pulse">Reprise...</p>
              : <p className="text-[0.6rem] text-[var(--text-muted)] font-semibold truncate uppercase tracking-wider">{podcast?.title || ''}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => seekRelative(-30)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" aria-label="-30s">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95 transition-transform">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={() => seekRelative(30)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" aria-label="+30s">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 shrink-0 text-[0.65rem] text-[var(--text-secondary)] tabular-nums font-semibold">
            <span>{fmt(currentTime)}</span><span className="opacity-30">/</span><span>{fmt(duration)}</span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={changeSpeed} className="hidden sm:block px-2 py-1 rounded-md text-[0.6rem] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] transition-all uppercase">
              {playbackSpeed}x
            </button>
            <button onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] transition-all"
              aria-label="Agrandir">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--accent-rose)] hover:bg-[var(--bg-surface)] transition-all"
              aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative h-[3px] group cursor-pointer">
          <input type="range" min="0" max={duration || 0} value={currentTime}
            onChange={handleProgress}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="w-full h-full bg-[var(--border-color)]">
            <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-150"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );

  // ── INLINE MODE ──
  if (mode === 'inline') {
    return (
      <>
        <div ref={inlineRef} className="glass rounded-[var(--radius-xl)] p-8 lg:p-10 relative overflow-hidden">
          <AlertModal isOpen={!!error} title="Erreur de lecture" message={error || ""} type="error" onClose={closeAlert} />

          <div className={`absolute top-0 right-0 w-64 h-64 bg-[var(--accent-primary)]/8 blur-[80px] -mr-32 -mt-32 pointer-events-none transition-opacity duration-700 ${isPlaying ? 'animate-aura opacity-100' : 'opacity-40'}`} />

          <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
            <div className="relative shrink-0">
              {isPlaying && (
                <div className="absolute inset-0 rounded-2xl bg-[var(--accent-primary)]/20 blur-xl animate-aura scale-110 pointer-events-none -z-10" aria-hidden="true" />
              )}
              <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)] player-artwork-ring">
                {(episode.imageUrl || podcast?.imageUrl)
                  ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-5xl">🎙️</div>}
              </div>
              {isPlaying && (
                <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-white text-[0.6rem] font-extrabold uppercase tracking-wider shadow-lg shadow-[var(--accent-primary)]/30 animate-pulse">
                  En cours
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-w-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <span className="badge badge-accent mb-3">
                    <Headphones className="w-3 h-3" /> Lecture en cours
                  </span>
                  <p className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 truncate">
                    {podcast?.title || ''}
                  </p>
                  <h2 className="text-2xl lg:text-3xl mb-2 line-clamp-2">{episode.title}</h2>
                  {isResuming && (
                    <p className="text-[0.6rem] text-[var(--accent-primary)] font-bold uppercase animate-pulse">Reprise de lecture...</p>
                  )}
                </div>
                <button onClick={onClose}
                  className="p-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 transition-all shrink-0"
                  aria-label="Fermer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Audio Visualizer */}
              <div className="w-full flex justify-center my-3">
                <AudioVisualizer height={56} />
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="relative h-1.5 group cursor-pointer mb-2">
                  <input type="range" min="0" max={duration || 0} value={currentTime}
                    onChange={handleProgress}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-full h-full bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[0.65rem] text-[var(--text-muted)] tabular-nums font-semibold">
                  <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-5">
                  <button onClick={() => seekRelative(-30)}
                    className="flex flex-col items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                    <RotateCcw className="w-5 h-5" /><span className="text-[0.55rem] font-extrabold">-30s</span>
                  </button>
                  <button onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95 transition-transform">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  <button onClick={() => seekRelative(30)}
                    className="flex flex-col items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                    <RotateCw className="w-5 h-5" /><span className="text-[0.55rem] font-extrabold">+30s</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={changeSpeed}
                    className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] text-[0.65rem] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-wider">
                    {playbackSpeed}x
                  </button>
                  <button onClick={toggleMute} className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                    onChange={handleVolume} className="w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {showMiniBar && createPortal(<MiniPlayer fullWidth />, document.body)}
      </>
    );
  }

  // ── FLOATING MODE ──
  return (
    <>
      <AlertModal isOpen={!!error} title="Erreur de lecture" message={error || ""} type="error" onClose={closeAlert} />

      {!isExpanded ? (
        <MiniPlayer />
      ) : (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-base)]/95 backdrop-blur-2xl overflow-hidden flex flex-col">
          <div className="flex-1 flex flex-col p-8 lg:p-16 overflow-y-auto">
            <div className="flex items-center justify-between mb-10">
              <button onClick={() => setIsExpanded(false)}
                className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--border-hover)] transition-all">
                <ChevronDown className="w-5 h-5" />
              </button>
              <span className="text-[0.65rem] font-bold text-[var(--accent-primary)] uppercase tracking-[0.2em]">En cours de lecture</span>
              <button onClick={onClose}
                className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-rose)] hover:border-[var(--border-hover)] transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 items-center flex-1">
              <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-[2rem] overflow-hidden shadow-2xl border border-[var(--border-color)] shrink-0 player-artwork-ring">
                {(episode.imageUrl || podcast?.imageUrl)
                  ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-7xl">🎙️</div>}
              </div>

              <div className="flex flex-col gap-8 flex-1 w-full max-w-lg">
                <div>
                  <p className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-2">
                    {podcast?.title}
                  </p>
                  <h2 className="text-3xl lg:text-4xl mb-3">{episode.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                    {episode.description}
                  </p>
                </div>

                <AudioVisualizer height={72} />

                <div>
                  <div className="relative h-1.5 group cursor-pointer mb-2">
                    <input type="range" min="0" max={duration || 0} value={currentTime}
                      onChange={handleProgress}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-full h-full bg-[var(--border-color)] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] tabular-nums">
                    <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8">
                  <button onClick={() => seekRelative(-30)}
                    className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group">
                    <RotateCcw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[0.6rem] font-extrabold">-30s</span>
                  </button>
                  <button onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform">
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                  </button>
                  <button onClick={() => seekRelative(30)}
                    className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group">
                    <RotateCw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[0.6rem] font-extrabold">+30s</span>
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button onClick={changeSpeed}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-wider border border-[var(--border-color)]">
                    {playbackSpeed}x Speed
                  </button>
                  <button onClick={toggleMute} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors shrink-0">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                    onChange={handleVolume} className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
