import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  width?: number;
  height?: number;
  barCount?: number;
}

export default function AudioVisualizer({
  width,
  height = 72,
  barCount = 48,
}: AudioVisualizerProps) {
  const { isPlaying, getFrequencyData } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const heightsRef = useRef<number[]>(Array(barCount).fill(3));
  const playingRef = useRef(isPlaying);
  const getDataRef = useRef(getFrequencyData);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { getDataRef.current = getFrequencyData; }, [getFrequencyData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = width || canvas.parentElement?.clientWidth || 300;
    const displayH = height;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    const half = barCount / 2;
    const barW = Math.max(2, (displayW - barCount * 2) / barCount);
    const gap = (displayW - barW * barCount) / (barCount + 1);
    const midY = displayH / 2;

    let frame = 0;

    const animate = () => {
      if (!ctx || !canvas) return;
      frame++;
      const raw = getDataRef.current?.();
      const currentHeights = heightsRef.current;

      // Update target heights from frequency data
      if (raw && playingRef.current && frame % 2 === 0) {
        for (let i = 0; i < barCount; i++) {
          const distFromCenter = Math.abs(i - (barCount - 1) / 2);
          const halfIdx = Math.floor(distFromCenter);
          const dataIndex = Math.min(halfIdx, raw.length - 1);
          const value = raw[dataIndex] ?? 0;

          // Edge fade — center bars are taller
          const edgeFade = 1 - (distFromCenter / half) * 0.25;
          // Boost mid frequencies
          const midBoost = distFromCenter < half * 0.5 ? 1.2 : 1;
          const target = Math.max(4, Math.min(100, (value / 255) * 100 * edgeFade * midBoost));

          // Smooth easing toward target
          currentHeights[i] += (target - currentHeights[i]) * 0.35;
        }
      } else if (!playingRef.current) {
        // Gentle decay when paused
        for (let i = 0; i < barCount; i++) {
          currentHeights[i] += (3 - currentHeights[i]) * 0.08;
        }
      }

      // Clear
      ctx.clearRect(0, 0, displayW, displayH);

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const h = currentHeights[i];
        const barH = Math.max(2, (h / 100) * midY * 0.9);
        const x = gap + i * (barW + gap);
        const radius = barW / 2;

        // Glow on taller bars
        if (h > 25) {
          const glowAlpha = Math.min(0.35, h / 300);
          const glowGrad = ctx.createRadialGradient(x + barW / 2, midY, barW, x + barW / 2, midY, barH + barW);
          glowGrad.addColorStop(0, `rgba(108, 111, 247, ${glowAlpha})`);
          glowGrad.addColorStop(1, 'rgba(108, 111, 247, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(x - barW, midY - barH - barW, barW * 3, barH * 2 + barW * 2);
        }

        // Bar gradient (top half = cyan, bottom half = indigo)
        const barGrad = ctx.createLinearGradient(x, midY - barH, x, midY + barH);
        barGrad.addColorStop(0, '#0dc5e0');
        barGrad.addColorStop(0.4, '#6c6ff7');
        barGrad.addColorStop(0.6, '#6c6ff7');
        barGrad.addColorStop(1, '#0dc5e0');
        ctx.fillStyle = barGrad;

        // Draw upper bar (rounded top)
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x, midY - barH + radius);
        ctx.arcTo(x, midY - barH, x + barW, midY - barH, radius);
        ctx.lineTo(x + barW, midY);
        ctx.fill();

        // Draw lower bar (mirrored, rounded bottom)
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x, midY + barH - radius);
        ctx.arcTo(x, midY + barH, x + barW, midY + barH, radius);
        ctx.lineTo(x + barW, midY);
        ctx.fill();

        // Bright top highlight on peak bars
        if (h > 50) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.5, (h - 50) / 100)})`;
          ctx.beginPath();
          ctx.arc(x + barW / 2, midY - barH + radius, radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + barW / 2, midY + barH - radius, radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center line — thin subtle separator
        if (i === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, midY);
          ctx.lineTo(displayW, midY);
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      aria-hidden="true"
    />
  );
}
