import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  barCount?: number;
  height?: number;
  gap?: number;
}

export default function AudioVisualizer({
  barCount = 28,
  height = 80,
  gap = 3,
}: AudioVisualizerProps) {
  const { isPlaying, getFrequencyData } = useAudio();
  const [heights, setHeights] = useState<number[]>(() => Array(barCount).fill(4));
  const rafRef = useRef<number>(0);
  const playingRef = useRef(isPlaying);
  const getDataRef = useRef(getFrequencyData);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { getDataRef.current = getFrequencyData; }, [getFrequencyData]);

  useEffect(() => {
    const half = Math.floor(barCount / 2);

    const animate = () => {
      const rawData = getDataRef.current?.();
      if (rawData && playingRef.current) {
        // Build symmetric mirrored heights
        const newHeights: number[] = [];

        for (let i = 0; i < barCount; i++) {
          // Mirror index: distance from center
          const distFromCenter = Math.abs(i - (barCount - 1) / 2);
          const halfIdx = Math.floor(distFromCenter);
          const dataIndex = Math.min(halfIdx, rawData.length - 1);

          const value = rawData[dataIndex] ?? 0;

          // Smooth falloff curve toward edges for aesthetic hill shape
          const edgeFade = 1 - (distFromCenter / half) * 0.35;

          // Boost mid frequencies for speech
          const midBoost = distFromCenter < half * 0.5 ? 1.1 : 1;

          const h = Math.max(4, Math.min(100, (value / 255) * 100 * edgeFade * midBoost));
          newHeights.push(h);
        }

        setHeights(newHeights);
      } else {
        setHeights(prev =>
          prev.map(h => {
            const next = h * 0.88;
            return next < 4.5 ? 4 : next;
          })
        );
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [barCount]);

  return (
    <div
      className="flex items-end justify-center"
      style={{ height, gap }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)]"
          style={{
            width: 3,
            height: `${h}%`,
            transition: playingRef.current ? 'height 60ms linear' : 'height 220ms ease-out',
            opacity: 0.45 + (h / 180),
          }}
        />
      ))}
    </div>
  );
}
