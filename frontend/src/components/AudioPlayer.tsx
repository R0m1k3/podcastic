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

  if (!episode) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-light z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-light-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-light-900">En cours de lecture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-100 rounded-lg transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Player Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Artwork */}
        <div className="aspect-square max-w-sm mx-auto mb-8 rounded-3xl overflow-hidden shadow-2xl">
          {podcast?.imageUrl ? (
            <img
              src={podcast.imageUrl}
              alt={podcast.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-white text-9xl">
              🎙️
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-light-500 uppercase mb-2">
            {podcast?.author || 'Podcast inconnu'}
          </p>
          <h1 className="text-4xl font-bold text-light-900 mb-3">{episode.title}</h1>
          <p className="text-light-600 line-clamp-3">{episode.description}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 card">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-2 bg-light-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-light-600 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {/* Previous 15s */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, currentTime - 15);
              }
            }}
            className="p-3 hover:bg-light-100 rounded-full transition-colors"
            title="Reculer de 15s"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="w-20 h-20 rounded-full bg-gradient-primary text-white flex items-center justify-center hover:shadow-lg transition-shadow"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 ml-1" fill="currentColor" />
            ) : (
              <Play className="w-8 h-8 ml-1" fill="currentColor" />
            )}
          </button>

          {/* Next 30s */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.min(duration, currentTime + 30);
              }
            }}
            className="p-3 hover:bg-light-100 rounded-full transition-colors"
            title="Avancer de 30s"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Speed & Volume */}
        <div className="grid grid-cols-2 gap-6">
          {/* Playback Speed */}
          <div className="card">
            <h3 className="text-sm font-semibold text-light-900 mb-3">Vitesse</h3>
            <div className="flex gap-2">
              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-500 text-white'
                      : 'bg-light-100 text-light-700 hover:bg-light-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="w-4 h-4 text-light-600" />
              <h3 className="text-sm font-semibold text-light-900">Volume</h3>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-light-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={episode.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
}
