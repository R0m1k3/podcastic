import { useState, useRef, useEffect } from 'react';
import { Episode } from '../services/episodeService';
import { episodeService } from '../services/episodeService';
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
  AlertCircle
} from 'lucide-react';
import AlertModal from './AlertModal';
import { useTheme } from '../context/ThemeContext';

interface AudioPlayerProps {
  episode: Episode | null;
  onClose: () => void;
  userId?: string;
}

export default function AudioPlayer({ episode, onClose, userId }: AudioPlayerProps) {
  const { isPlaying, setIsPlaying, togglePlay } = useAudio();
  const { theme } = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('podcastic-volume') || '1'));
  const [playbackSpeed, setPlaybackSpeed] = useState(() => parseFloat(localStorage.getItem('podcastic-speed') || '1'));
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for stable tracking without re-renders
  const currentTimeRef = useRef(0);
  const episodeIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Sync refs with state
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    episodeIdRef.current = episode?._id || null;
    userIdRef.current = userId || null;
  }, [episode, userId]);

  const podcast = typeof episode?.podcastId === 'object' ? episode.podcastId : null;

  // Sync settings to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed, episode]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('podcastic-volume', volume.toString());
    localStorage.setItem('podcastic-speed', playbackSpeed.toString());
  }, [volume, playbackSpeed]);

  // Save progress periodically and on unmount
  useEffect(() => {
    if (!episode || !userId) return;

    // Save every 20 seconds only if playing
    const interval = setInterval(() => {
      if (isPlaying && episodeIdRef.current) {
        episodeService.saveProgress(episodeIdRef.current, Math.floor(currentTimeRef.current), false).catch(() => {});
      }
    }, 20000);

    // Cleanup: SAVE FINAL PROGRESS ON UNMOUNT OR EPISODE CHANGE
    return () => {
      clearInterval(interval);
      if (episodeIdRef.current && userIdRef.current) {
        console.log(`[AudioPlayer] Final save for ${episodeIdRef.current} at ${Math.floor(currentTimeRef.current)}s`);
        episodeService.saveProgress(episodeIdRef.current, Math.floor(currentTimeRef.current), false).catch(() => {});
      }
    };
  }, [episode?._id, userId, isPlaying]); // Restart if episode or isPlaying changes to maintain correct interval behavior

  // Load previous progress
  useEffect(() => {
    if (!episode || !userId) return;
    setIsResuming(true);
    episodeService.getProgress(episode._id).then((r) => {
      if (r.progress?.position && audioRef.current) {
        console.log(`[AudioPlayer] Resuming at ${r.progress.position}s`);
        audioRef.current.currentTime = r.progress.position;
        setCurrentTime(r.progress.position);
      }
      setIsResuming(false);
    }).catch(() => {
      setIsResuming(false);
    });
  }, [episode, userId]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const changeSpeed = () => {
      const speeds = [1, 1.25, 1.5, 2, 0.75];
      const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
      setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleSeek = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + delta));
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const muted = !isMuted;
    setIsMuted(muted);
    audioRef.current.volume = muted ? 0 : volume;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!episode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const inverseTheme = theme === 'light' ? 'dark-theme' : 'light-theme';

  return (
    <div className={`fixed z-[100] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${inverseTheme} text-[var(--text-primary)] ${
      isExpanded
        ? 'inset-0 rounded-none'
        : 'bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-5xl rounded-[2rem] h-[88px]'
    } ${theme === 'light' ? 'bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl' : 'premium-glass'} border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col`}>

      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError("Impossible de charger ce fichier audio. Le lien est peut-être expiré ou protégé.")}
        autoPlay
      />

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

      {/* ── COMPACT BAR ── */}
      <div className={`flex items-center gap-4 px-5 h-[88px] shrink-0 ${isExpanded ? 'hidden' : 'flex'}`}>

        {/* Artwork + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[280px]">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border-color)] shrink-0 shadow-lg">
            {(episode.imageUrl || podcast?.imageUrl)
              ? <img src={episode.imageUrl || podcast!.imageUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-xl">🎙️</div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-tight">{episode.title}</p>
            {isResuming ? (
               <p className="text-[9px] text-[var(--accent-primary)] font-black uppercase animate-pulse">Reprise de lecture...</p>
            ) : (
               <p className="text-[10px] text-[var(--text-secondary)] font-bold truncate uppercase tracking-wider">{podcast?.title || ''}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-5">
            <button onClick={() => handleSeek(-30)} className="group flex flex-col items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <RotateCcw className="w-4 h-4" />
              <span className="text-[8px] font-black">30</span>
            </button>
            <button onClick={handlePlayPause}
              className="w-11 h-11 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={() => handleSeek(30)} className="group flex flex-col items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <RotateCw className="w-4 h-4" />
              <span className="text-[8px] font-black">30</span>
            </button>
          </div>
        </div>

        {/* Floating Progress Bar at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 flex items-center gap-2 group cursor-pointer px-4">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-4 text-[9px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-white tabular-nums border border-white/10">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-1">
            <input type="range" min="0" max={duration || 0} value={currentTime}
              onChange={handleProgressChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className="w-full h-full bg-[var(--text-primary)]/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 right-4 text-[9px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-white tabular-nums border border-white/10">{formatTime(duration)}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={changeSpeed} className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[10px] font-black text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all uppercase tracking-tighter w-10">
            {playbackSpeed}x
          </button>
          <button onClick={toggleMute} className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsExpanded(true)}
            className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-accent-rose hover:bg-accent-rose/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── EXPANDED VIEW ── */}
      {isExpanded && (
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
                <button onClick={() => handleSeek(-30)}
                  className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group">
                  <RotateCcw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black">-30s</span>
                </button>

                <button onClick={handlePlayPause}
                  className="w-20 h-20 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>

                <button onClick={() => handleSeek(30)}
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
      )}
    </div>
  );
}
