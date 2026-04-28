import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  width?: number;
  height?: number;
}

export default function AudioVisualizer({
  width,
  height = 64,
}: AudioVisualizerProps) {
  const { isPlaying, getFrequencyData } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const playingRef = useRef(isPlaying);
  const getDataRef = useRef(getFrequencyData);
  const historyRef = useRef<number[][]>([]);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { getDataRef.current = getFrequencyData; }, [getFrequencyData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size accounting for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const displayW = width || canvas.parentElement?.clientWidth || 300;
    const displayH = height;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    // Init history with flatline
    if (historyRef.current.length === 0) {
      historyRef.current = Array.from({ length: 8 }, () =>
        Array(Math.floor(displayW / 3)).fill(displayH / 2)
      );
    }

    const animate = () => {
      if (!ctx || !canvas) return;
      const raw = getDataRef.current?.();
      const w = displayW;
      const h = displayH;
      const mid = h / 2;

      // Compute a new row from frequency data
      const sampleCount = Math.floor(w / 3);
      const newRow: number[] = [];

      if (raw && playingRef.current) {
        for (let i = 0; i < sampleCount; i++) {
          // Map sample across the frequency bins
          const idx = Math.floor((i / sampleCount) * raw.length);
          const val = raw[idx] ?? 0;
          // Convert to y offset from center — stronger signal = bigger wave
          const amplitude = (val / 255) * (h * 0.42);
          newRow.push(mid + (Math.random() - 0.5) * amplitude * 2);
        }
      } else {
        // When paused, flatline decays to center
        for (let i = 0; i < sampleCount; i++) {
          newRow.push(mid);
        }
      }

      // Push new row, keep last 8 rows
      historyRef.current.push(newRow);
      if (historyRef.current.length > 12) historyRef.current.shift();

      // Draw
      ctx.clearRect(0, 0, w, h);

      // Draw each row as a thin horizontal line, fading older ones
      const rows = historyRef.current;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const age = rows.length - 1 - r;
        const alpha = 0.08 + (age / rows.length) * 0.75;
        const thickness = 1 + (age / rows.length) * 1.5;

        ctx.strokeStyle = r === rows.length - 1
          ? `rgba(108, 111, 247, ${alpha + 0.15})`
          : age < 3
            ? `rgba(13, 197, 224, ${alpha})`
            : `rgba(108, 111, 247, ${alpha * 0.6})`;

        ctx.lineWidth = thickness;
        ctx.beginPath();
        for (let i = 0; i < row.length; i++) {
          const x = (i / row.length) * w;
          const y = row[i];
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      aria-hidden="true"
    />
  );
}
