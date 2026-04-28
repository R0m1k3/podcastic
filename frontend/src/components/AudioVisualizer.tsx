import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  barCount?: number;
  height?: number;
  gap?: number;
}

export default function AudioVisualizer({
  barCount = 40,
  height = 96,
  gap = 2,
}: AudioVisualizerProps) {
  const { isPlaying, getFrequencyData } = useAudio();
  const [heights, setHeights] = useState<number[]>(() => Array(barCount).fill(3));
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
        const newHeights: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const distFromCenter = Math.abs(i - (barCount - 1) / 2);
          const halfIdx = Math.floor(distFromCenter);
          const dataIndex = Math.min(halfIdx, rawData.length - 1);
          const value = rawData[dataIndex] ?? 0;

          // Smoother edge fade — keep center bars taller
          const edgeFade = 1 - (distFromCenter / half) * 0.2;

          // Mid boost for vocals/speech
          const midBoost = distFromCenter < half * 0.6 ? 1.15 : 1;

          // More dynamic range — minimum height of 6%
          const h = Math.max(6, Math.min(100, (value / 255) * 100 * edgeFade * midBoost));
          newHeights.push(h);
        }
        setHeights(newHeights);
      } else {
        // Gentle decay when paused — slower falloff for smoother look
        setHeights(prev =>
          prev.map(h => {
            const next = h * 0.92;
            return next < 3.5 ? 3 : next;
          })
        );
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [barCount]);

  const barWidth = Math.max(2, (100 - gap * (barCount - 1)) / barCount);

  return (
    <div
      className="flex items-end justify-center w-full"
      style={{ height, gap: `${gap}%` }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: `${barWidth}%`,
            height: `${h}%`,
            background: `linear-gradient(to top, var(--accent-primary), var(--accent-secondary))`,
            transition: playingRef.current ? 'height 80ms linear' : 'height 300ms ease-out',
            opacity: 0.55 + (h / 200),
            boxShadow: h > 40 ? `0 0 ${Math.floor(h / 6)}px rgba(99, 102, 241, ${Math.min(0.5, h / 200)})` : 'none',
          }}
        />
      ))}
    </div>
  );
}
