import { useState, useRef, useEffect } from 'react';
import { Episode } from '../services/episodeService';
import { episodeService } from '../services/episodeService';
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

interface AudioPlayerProps {
  episode: Episode | null;
  onClose: () => void;
  userId?: string;
}

export default function AudioPlayer({ episode, onClose, userId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const podcast = typeof episode?.podcastId === 'object' ? episode.podcastId : null;

  // Save progress periodically
  useEffect(() => {
    if (!episode || !userId) return;
    const interval = setInterval(async () => {
      if (isPlaying) {
        try {
          await episodeService.saveProgress(episode._id, Math.floor(currentTime), false);
        } catch {}
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [episode, userId, currentTime, isPlaying]);

  // Load previous progress
  useEffect(() => {
    if (!episode || !userId) return;
    episodeService.getProgress(episode._id).then((r) => {
      if (r.progress?.position && audioRef.current) {
        audioRef.current.currentTime = r.progress.position;
      }
    }).catch(() => {});
  }, [episode, userId]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
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

  return (
    <div className={`fixed z-[100] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
      isExpanded
        ? 'inset-0 rounded-none'
        : 'bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-5xl rounded-[2rem] h-[88px]'
    } premium-glass border-white/10 shadow-2xl overflow-hidden flex flex-col`}>

      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
        autoPlay
      />

      {/* ── COMPACT BAR ── */}
      <div className={`flex items-center gap-4 px-5 h-[88px] shrink-0 ${isExpanded ? 'hidden' : 'flex'}`}>

        {/* Artwork + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[280px]">
          <div className="w-13 h-13 w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
            {podcast?.imageUrl
              ? <img src={podcast.imageUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center text-xl">🎙️</div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">{episode.title}</p>
            <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-wider">{podcast?.title || ''}</p>
          </div>
        </div>

        {/* Controls + progress */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-5">
            <button onClick={() => handleSeek(-30)} className="group flex flex-col items-center gap-0.5 text-slate-500 hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
              <span className="text-[8px] font-black">30</span>
            </button>
            <button onClick={handlePlayPause}
              className="w-11 h-11 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={() => handleSeek(30)} className="group flex flex-col items-center gap-0.5 text-slate-500 hover:text-white transition-colors">
              <RotateCw className="w-4 h-4" />
              <span className="text-[8px] font-black">30</span>
            </button>
          </div>
          <div className="w-full max-w-lg flex items-center gap-2">
            <span className="text-[9px] text-slate-600 tabular-nums w-8 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 h-1 group cursor-pointer">
              <input type="range" min="0" max={duration || 0} value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="w-full h-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent-indigo to-accent-cyan rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-[9px] text-slate-600 tabular-nums w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleMute} className="p-2 text-slate-500 hover:text-white transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsExpanded(true)}
            className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-accent-rose hover:bg-accent-rose/10 transition-all">
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
              className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all">
              <ChevronDown className="w-5 h-5" />
            </button>
            <p className="text-[10px] font-black text-accent-indigo uppercase tracking-[0.3em]">En cours de lecture</p>
            <button onClick={onClose}
              className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-accent-rose transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center flex-1">
            {/* Artwork */}
            <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 shrink-0">
              {podcast?.imageUrl
                ? <img src={podcast.imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center text-7xl">🎙️</div>
              }
            </div>

            {/* Info + controls */}
            <div className="flex flex-col gap-8 flex-1 w-full max-w-lg">
              <div>
                <p className="text-xs font-black text-accent-indigo uppercase tracking-widest mb-2">{podcast?.title}</p>
                <h2 className="text-3xl lg:text-4xl font-display font-black text-white leading-tight mb-3">{episode.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{episode.description}</p>
              </div>

              {/* Progress */}
              <div>
                <div className="relative h-1.5 group cursor-pointer mb-2">
                  <input type="range" min="0" max={duration || 0} value={currentTime}
                    onChange={handleProgressChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-full h-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent-indigo to-accent-cyan rounded-full"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-8">
                <button onClick={() => handleSeek(-30)}
                  className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors group">
                  <RotateCcw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black">-30s</span>
                </button>

                <button onClick={handlePlayPause}
                  className="w-20 h-20 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>

                <button onClick={() => handleSeek(30)}
                  className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors group">
                  <RotateCw className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black">+30s</span>
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-4">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors shrink-0">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
