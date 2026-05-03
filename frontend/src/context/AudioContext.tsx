import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Episode, episodeService } from '../services/episodeService';

interface AudioContextType {
  // State
  currentEpisode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  isMuted: boolean;
  isResuming: boolean;
  error: string | null;

  // Actions
  playEpisode: (episode: Episode) => void;
  closePlayer: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  changeSpeed: () => void;
  setUserId: (id: string | null) => void;
  setError: (err: string | null) => void;
  getFrequencyData: () => Uint8Array | null;
  // Legacy (kept for compatibility)
  setIsPlaying: (playing: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const webAudioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const savedPositionRef = useRef<number | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => parseFloat(localStorage.getItem('podcastic-volume') || '1'));
  const [playbackSpeed, setPlaybackSpeedState] = useState(() => parseFloat(localStorage.getItem('podcastic-speed') || '1'));
  const [isMuted, setIsMuted] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Audio source mode: direct CORS → backend proxy (always CORS) → give up
  const [corsMode, setCorsMode] = useState<'cors' | 'proxy' | 'no-cors'>('cors');

  // Refs for interval-based progress saving
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const episodeIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { episodeIdRef.current = currentEpisode?._id || null; }, [currentEpisode]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Apply volume / speed to the audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed, currentEpisode]);

  // Persist volume / speed to localStorage
  useEffect(() => {
    localStorage.setItem('podcastic-volume', volume.toString());
    localStorage.setItem('podcastic-speed', playbackSpeed.toString());
  }, [volume, playbackSpeed]);

  // Periodic + unmount progress saving. Considered completed at >= 90%.
  useEffect(() => {
    if (!currentEpisode || !userId) return;

    const saveNow = () => {
      if (!episodeIdRef.current || !userIdRef.current) return;
      const pos = Math.floor(currentTimeRef.current);
      const d = durationRef.current;
      const completed = d > 0 && (pos / d) >= 0.9;
      episodeService.saveProgress(episodeIdRef.current, pos, completed).catch(() => {});
    };

    const interval = setInterval(() => {
      if (isPlaying) saveNow();
    }, 20000);

    return () => {
      clearInterval(interval);
      saveNow();
    };
  }, [currentEpisode?._id, userId, isPlaying]);

  // Resume at previous position: store in ref, applied on loadedmetadata
  // (handles the case where CORS failure remounts the audio element)
  useEffect(() => {
    if (!currentEpisode || !userId) return;
    savedPositionRef.current = null;
    setIsResuming(true);
    episodeService.getProgress(currentEpisode._id).then(r => {
      const pos = r.progress?.position;
      if (pos && pos > 5) {
        savedPositionRef.current = pos;
        if (audioRef.current && audioRef.current.readyState >= 1) {
          audioRef.current.currentTime = pos;
          setCurrentTime(pos);
          savedPositionRef.current = null;
        }
      }
      setIsResuming(false);
    }).catch(() => setIsResuming(false));
  }, [currentEpisode?._id, userId]);

  // Initialize Web Audio Analyser (CORS or proxy mode — both have CORS headers)
  useEffect(() => {
    if (corsMode === 'no-cors' || !audioRef.current || !currentEpisode) return;

    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      webAudioRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Fallback: audio plays without visualizer
    }

    return () => {
      if (webAudioRef.current && webAudioRef.current.state !== 'closed') {
        webAudioRef.current.close().catch(() => {});
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      webAudioRef.current = null;
    };
  }, [currentEpisode?._id, corsMode]);

  const getFrequencyData = () => {
    if (!analyserRef.current || !dataArrayRef.current) return null;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
    return dataArrayRef.current;
  };

  // Actions
  const playEpisode = (episode: Episode) => {
    setCorsMode('cors');
    setError(null);
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  const closePlayer = () => {
    if (audioRef.current) audioRef.current.pause();
    if (webAudioRef.current && webAudioRef.current.state !== 'closed') {
      webAudioRef.current.close().catch(() => {});
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    webAudioRef.current = null;
    setCurrentEpisode(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCorsMode('cors');
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const seekRelative = (delta: number) => {
    if (!audioRef.current) return;
    const t = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    seek(t);
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => setIsMuted(m => !m);

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    setPlaybackSpeedState(prev => speeds[(speeds.indexOf(prev) + 1) % speeds.length]);
  };

  const handleAudioError = () => {
    if (corsMode === 'cors') {
      // Direct CORS failed — retry via backend proxy (adds CORS headers, Web Audio works)
      setCorsMode('proxy');
      setError(null);
    } else if (corsMode === 'proxy') {
      // Proxy also failed — last resort: plain audio, no Web Audio analysis
      setCorsMode('no-cors');
      setError(null);
    } else {
      setError("Impossible de charger ce fichier audio. Le lien est peut-être expiré ou protégé.");
    }
  };

  return (
    <AudioContext.Provider value={{
      currentEpisode, isPlaying, currentTime, duration, volume, playbackSpeed, isMuted, isResuming, error,
      playEpisode, closePlayer, togglePlay, seek, seekRelative, setVolume, toggleMute, changeSpeed,
      setUserId, setError, getFrequencyData, setIsPlaying,
    }}>
      {/* Persistent audio element — lives at provider level so it survives page navigation */}
      {currentEpisode && (
        <audio
          key={`${currentEpisode._id}-${corsMode}`}
          ref={audioRef}
          src={corsMode === 'proxy'
            ? `/api/audio/proxy?url=${encodeURIComponent(currentEpisode.audioUrl)}`
            : currentEpisode.audioUrl}
          crossOrigin={corsMode !== 'no-cors' ? 'anonymous' : undefined}
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => {
            if (!audioRef.current) return;
            setDuration(audioRef.current.duration);
            if (savedPositionRef.current !== null) {
              audioRef.current.currentTime = savedPositionRef.current;
              setCurrentTime(savedPositionRef.current);
              savedPositionRef.current = null;
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={handleAudioError}
          autoPlay
        />
      )}
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}