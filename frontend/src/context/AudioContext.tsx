import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Episode, episodeService } from '../services/episodeService';

interface AudioContextType {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  isMuted: boolean;
  isResuming: boolean;
  error: string | null;
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
  setIsPlaying: (playing: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  // Main audio: direct URL, plays instantly
  const audioRef = useRef<HTMLAudioElement>(null);
  // Analysis audio: proxy URL, muted, Web Audio source only
  const analysisRef = useRef<HTMLAudioElement>(null);

  const webAudioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const savedPositionRef = useRef<number | null>(null);
  const shouldResumeCtxRef = useRef(false); // set when user plays before Web Audio effect runs

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

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const episodeIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { episodeIdRef.current = currentEpisode?._id || null; }, [currentEpisode]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Apply volume / speed to main audio only
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackSpeed;
    }
    if (analysisRef.current) {
      analysisRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed, currentEpisode]);

  useEffect(() => {
    localStorage.setItem('podcastic-volume', volume.toString());
    localStorage.setItem('podcastic-speed', playbackSpeed.toString());
  }, [volume, playbackSpeed]);

  // Periodic progress saving
  useEffect(() => {
    if (!currentEpisode || !userId) return;
    const saveNow = () => {
      if (!episodeIdRef.current || !userIdRef.current) return;
      const pos = Math.floor(currentTimeRef.current);
      const d = durationRef.current;
      const completed = d > 0 && (pos / d) >= 0.9;
      episodeService.saveProgress(episodeIdRef.current, pos, completed).catch(() => {});
    };
    const interval = setInterval(() => { if (isPlaying) saveNow(); }, 20000);
    return () => { clearInterval(interval); saveNow(); };
  }, [currentEpisode?._id, userId, isPlaying]);

  // Resume at saved position — applied on loadedmetadata so it survives element remounts
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

  // Web Audio analyser — uses the hidden analysis element (proxy URL → always CORS)
  useEffect(() => {
    if (!analysisRef.current || !currentEpisode) return;

    let ctx: AudioContext | null = null;
    const setup = () => {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx || !analysisRef.current) return;
        ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(analysisRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.55;
        const sink = ctx.createGain();
        sink.gain.value = 0; // silent output — but graph stays active so analyser gets data
        source.connect(analyser);
        analyser.connect(sink);
        sink.connect(ctx.destination);
        webAudioRef.current = ctx;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        // If main audio already started playing before this effect ran, resume now
        if (shouldResumeCtxRef.current || (audioRef.current && !audioRef.current.paused)) {
          ctx.resume();
          analysisRef.current?.play().catch(() => {});
        }
      } catch {
        // Proxy unavailable — visualizer falls back to simulation
      }
    };
    setup();

    return () => {
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
      analyserRef.current = null;
      dataArrayRef.current = null;
      webAudioRef.current = null;
    };
  }, [currentEpisode?._id]);

  const getFrequencyData = () => {
    if (!analyserRef.current || !dataArrayRef.current) return null;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
    return dataArrayRef.current;
  };

  // Sync analysis element to main audio on play/pause/seek
  const syncAnalysis = (time?: number) => {
    const el = analysisRef.current;
    if (!el) return;
    if (time !== undefined && Math.abs(el.currentTime - time) > 1) {
      el.currentTime = time;
    }
  };

  const handleMainPlay = () => {
    setIsPlaying(true);
    shouldResumeCtxRef.current = true;
    if (webAudioRef.current?.state === 'suspended') webAudioRef.current.resume();
    const el = analysisRef.current;
    if (el) {
      syncAnalysis(audioRef.current?.currentTime);
      el.play().catch(() => {});
    }
  };

  const handleMainPause = () => {
    setIsPlaying(false);
    analysisRef.current?.pause();
  };

  const handleMainSeeked = () => {
    const t = audioRef.current?.currentTime;
    if (t !== undefined) syncAnalysis(t);
  };

  // Actions
  const playEpisode = (episode: Episode) => {
    shouldResumeCtxRef.current = false;
    setError(null);
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  const closePlayer = () => {
    audioRef.current?.pause();
    analysisRef.current?.pause();
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
    syncAnalysis(time);
  };

  const seekRelative = (delta: number) => {
    if (!audioRef.current) return;
    seek(Math.max(0, Math.min(duration, audioRef.current.currentTime + delta)));
  };

  const setVolume = (v: number) => { setVolumeState(v); setIsMuted(v === 0); };
  const toggleMute = () => setIsMuted(m => !m);
  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    setPlaybackSpeedState(prev => speeds[(speeds.indexOf(prev) + 1) % speeds.length]);
  };

  const proxyUrl = currentEpisode
    ? `/api/audio/proxy?url=${encodeURIComponent(currentEpisode.audioUrl)}`
    : '';

  return (
    <AudioContext.Provider value={{
      currentEpisode, isPlaying, currentTime, duration, volume, playbackSpeed, isMuted, isResuming, error,
      playEpisode, closePlayer, togglePlay, seek, seekRelative, setVolume, toggleMute, changeSpeed,
      setUserId, setError, getFrequencyData, setIsPlaying,
    }}>
      {currentEpisode && (
        <>
          {/* Main audio: direct URL, instant start */}
          <audio
            key={`main-${currentEpisode._id}`}
            ref={audioRef}
            src={currentEpisode.audioUrl}
            onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
            onLoadedMetadata={() => {
              if (!audioRef.current) return;
              setDuration(audioRef.current.duration);
              if (savedPositionRef.current !== null) {
                audioRef.current.currentTime = savedPositionRef.current;
                setCurrentTime(savedPositionRef.current);
                syncAnalysis(savedPositionRef.current);
                savedPositionRef.current = null;
              }
            }}
            onPlay={handleMainPlay}
            onPause={handleMainPause}
            onSeeked={handleMainSeeked}
            onEnded={() => { setIsPlaying(false); analysisRef.current?.pause(); }}
            onError={() => setError("Impossible de charger ce fichier audio. Le lien est peut-être expiré ou protégé.")}
            autoPlay
          />
          {/* Analysis audio: proxy URL, muted, Web Audio source only */}
          <audio
            key={`analysis-${currentEpisode._id}`}
            ref={analysisRef}
            src={proxyUrl}
            crossOrigin="anonymous"
            muted
            autoPlay
            preload="auto"
            onError={() => { /* proxy fail: visualizer uses simulation */ }}
          />
        </>
      )}
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) throw new Error('useAudio must be used within an AudioProvider');
  return context;
}
