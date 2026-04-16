import { useState, useRef, useEffect } from 'react';
import { Episode } from '../services/episodeService';
import { episodeService } from '../services/episodeService';
import {
  Play,
  Pause,
  Volume2,
  SkipBack,
  SkipForward,
  ChevronDown,
  Maximize2,
  Minimize2,
  List,
  VolumeX,
  FastForward,
  Rewind,
  X,
  Info
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const podcast = typeof episode?.podcastId === 'object' ? episode.podcastId : null;

  // Save progress periodically
  useEffect(() => {
    if (!episode || !userId) return;

    const saveProgressInterval = setInterval(async () => {
      if (isPlaying) {
        try {
          setIsSaving(true);
          await episodeService.saveProgress(
            episode._id,
            Math.floor(currentTime),
            false
          );
        } catch (error) {
          console.error('Failed to save progress:', error);
        } finally {
          setIsSaving(false);
        }
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveProgressInterval);
  }, [episode, userId, currentTime, isPlaying]);

  // Load previous progress
  useEffect(() => {
    if (!episode || !userId) return;

    const loadProgress = async () => {
      try {
        const response = await episodeService.getProgress(episode._id);
        if (response.progress) {
          if (audioRef.current) {
            audioRef.current.currentTime = response.progress.position;
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    };

    loadProgress();
  }, [episode, userId]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!episode) return null;

  return (
    <div 
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-[100] transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        isExpanded ? 'h-[80vh] bottom-1/2 translate-y-1/2 rounded-[3rem]' : 'h-24 rounded-[2.5rem]'
      } premium-glass p-0 shadow-2xl border-white/10 flex flex-col overflow-hidden animate-slide-up`}
    >
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
        autoPlay
      />

      {/* COMPACT VIEW (DOCK) */}
      <div className={`flex items-center gap-6 p-4 h-24 shrink-0 transition-opacity duration-300 ${isExpanded ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
        {/* Info */}
        <div className="flex items-center gap-4 min-w-[200px] lg:min-w-[300px] max-w-[400px]">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-white/10 shrink-0">
            {podcast?.imageUrl ? (
              <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent-indigo to-accent- violet flex items-center justify-center text-2xl">🎙️</div>
            )}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-white truncate leading-tight mb-1">{episode.title}</h4>
            <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest">{podcast?.title || 'Unknown Podcast'}</p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => audioRef.current && (audioRef.current.currentTime -= 15)}
              className="text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90"
            >
              <Rewind className="w-5 h-5" />
            </button>
            <button 
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-white text-obsidian flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-glow-indigo hover:shadow-white/50"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button 
              onClick={() => audioRef.current && (audioRef.current.currentTime += 30)}
              className="text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90"
            >
              <FastForward className="w-5 h-5" />
            </button>
          </div>
          
          <div className="w-full max-w-xl flex items-center gap-3 group">
            <span className="text-[10px] font-bold text-slate-500 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
            <div className="relative flex-1 h-1.5 flex items-center cursor-pointer">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent-indigo to-accent-cyan shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-100"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 w-10 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Sidebar-like utility */}
        <div className="flex items-center gap-4 min-w-[200px] justify-end">
           <button 
            onClick={() => setIsExpanded(true)}
            className="p-3 rounded-2xl bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/10 transition-all"
           >
             <Maximize2 className="w-4 h-4" />
           </button>
           <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-white/[0.03] text-slate-400 hover:text-accent-rose hover:bg-accent-rose/10 transition-all"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* EXPANDED VIEW */}
      {isExpanded && (
        <div className="flex-1 flex flex-col p-12 transition-all duration-500 reveal">
          <div className="flex justify-between items-start mb-12">
             <button onClick={() => setIsExpanded(false)} className="p-4 rounded-3xl bg-white/5 text-slate-400 hover:text-white transition-all">
                <ChevronDown className="w-6 h-6" />
             </button>
             <div className="text-center">
                <span className="text-[11px] font-bold text-accent-indigo uppercase tracking-[0.3em] mb-2 block">Premium Experience</span>
                <h2 className="text-xl font-display font-extrabold text-white">Now Playing</h2>
             </div>
             <button onClick={onClose} className="p-4 rounded-3xl bg-white/5 text-slate-400 hover:text-accent-rose transition-all">
                <X className="w-6 h-6" />
             </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center flex-1">
             <div className="aspect-square w-full max-w-md mx-auto rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white/10 transform rotate-1">
                {podcast?.imageUrl ? (
                  <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover scale-105" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-accent-indigo via-accent-violet to-accent-rose flex items-center justify-center text-9xl">🎙️</div>
                )}
             </div>

             <div className="flex flex-col gap-8">
                <div>
                   <h1 className="text-5xl font-display font-black text-white leading-tight mb-4">{episode.title}</h1>
                   <p className="text-lg text-slate-400 font-medium leading-relaxed line-clamp-4">{episode.description}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-accent-indigo tabular-nums">{formatTime(currentTime)}</span>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleProgressChange}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent-indigo"
                  />
                </div>

                <div className="flex items-center justify-center gap-12">
                   <button onClick={() => handleSpeedChange(playbackSpeed === 2 ? 1 : playbackSpeed + 0.5)} className="text-xs font-bold text-slate-400 hover:text-white">
                      SPEED {playbackSpeed}x
                   </button>
                   <button onClick={handlePlayPause} className="w-24 h-24 rounded-full bg-white text-obsidian flex items-center justify-center shadow-glow-indigo transform active:scale-90 transition-transform">
                      {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                   </button>
                   <div className="flex items-center gap-4">
                      <Volume2 className="w-5 h-5 text-slate-400" />
                      <input type="range" min="0" max="1" step="0.1" value={volume} onChange={handleVolumeChange} className="w-32 h-1 bg-white/10 rounded-full accent-white" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
