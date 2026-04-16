import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Episode } from '../services/episodeService';

interface AudioContextType {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  playEpisode: (episode: Episode) => void;
  togglePlay: () => void;
  closePlayer: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const closePlayer = () => {
    setCurrentEpisode(null);
    setIsPlaying(false);
  };

  return (
    <AudioContext.Provider value={{ 
      currentEpisode, 
      isPlaying, 
      playEpisode, 
      togglePlay, 
      closePlayer,
      setIsPlaying 
    }}>
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
