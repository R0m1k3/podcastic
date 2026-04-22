import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  barCount?: number;
  height?: number;
  gap?: number;
}

export default function AudioVisualizer({
  barCount = 32,
  height = 64,
  gap = 2,
}: AudioVisualizerProps) {
  const { isPlaying, getFrequencyData } = useAudio();
  const [heights, setHeights] = useState<number[]>(() => Array(barCount).fill(4));
  const rafRef = useRef<number>(0);
  const playingRef = useRef(isPlaying);
  const getDataRef = useRef(getFrequencyData);

  // Keep refs in sync without triggering re-runs
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { getDataRef.current = getFrequencyData; }, [getFrequencyData]);

  useEffect(() => {
    const animate = () => {
      const data = getDataRef.current?.();
      if (data && playingRef.current) {
        const newHeights = Array.from({ length: barCount }, (_, i) => {
          const idx = Math.floor((i / barCount) * data.length);
          const value = data[idx] ?? 0;
          // Boost mid-range frequencies for better podcast speech visuals
          const boost = i > barCount * 0.2 && i < barCount * 0.8 ? 1.15 : 1;
          return Math.max(4, Math.min(100, (value / 255) * 100 * boost));
        });
        setHeights(newHeights);
      } else {
        // Smooth decay when paused or no data
        setHeights(prev =>
          prev.map(h => {
            const next = h * 0.85;
            return next < 4.5 ? 4 : next;
          })
        );
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [barCount]);

  const barWidth = Math.max(2, Math.floor((100 - (barCount - 1) * gap) / barCount));

  return (
    <div
      className="flex items-end justify-center"
      style={{ height, gap }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-90"
          style={{
            width: barWidth,
            height: `${h}%`,
            transition: playingRef.current ? 'height 60ms linear' : 'height 200ms ease-out',
            opacity: 0.5 + (h / 200),
          }}
        />
      ))}
    </div>
  );
}
