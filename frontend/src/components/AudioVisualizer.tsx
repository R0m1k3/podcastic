import { useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  height?: number;
}

const NUM_POINTS = 64;
const MAX_AMPLITUDE = 0.22;

export default function AudioVisualizer({ height = 80 }: AudioVisualizerProps) {
  const { isPlaying, currentTime, duration, getFrequencyData } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const heightsRef = useRef<number[]>(Array(NUM_POINTS).fill(0));
  const playingRef = useRef(isPlaying);
  const getDataRef = useRef(getFrequencyData);
  const timeRef = useRef({ currentTime, duration });

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { getDataRef.current = getFrequencyData; }, [getFrequencyData]);
  useEffect(() => { timeRef.current = { currentTime, duration }; }, [currentTime, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const parentW = canvas.parentElement?.clientWidth || 300;
    const maxW = Math.min(parentW, 800);
    const displayW = maxW;
    const displayH = height;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    const midY = displayH / 2;

    let frame = 0;

    const animate = () => {
      if (!ctx || !canvas) return;
      frame++;
      const raw = getDataRef.current?.();
      const hts = heightsRef.current;
      const step = displayW / (NUM_POINTS - 1);
      const { currentTime: ct, duration: dur } = timeRef.current;
      const progress = dur > 0 ? ct / dur : 0;
      const playing = playingRef.current;

      // Update heights from frequency data
      if (raw && playing && frame % 2 === 0) {
        for (let i = 0; i < NUM_POINTS; i++) {
          const bucketSize = raw.length / NUM_POINTS;
          const startIdx = Math.floor(i * bucketSize);
          const endIdx = Math.floor((i + 1) * bucketSize);
          let sum = 0;
          let count = 0;
          for (let j = startIdx; j < endIdx && j < raw.length; j++) {
            sum += raw[j];
            count++;
          }
          const avg = count > 0 ? sum / count : 0;
          const target = (avg / 255) * MAX_AMPLITUDE;
          const rate = target > hts[i] ? 0.35 : 0.1;
          hts[i] += (target - hts[i]) * rate;
        }
      } else if (!playing) {
        for (let i = 0; i < NUM_POINTS; i++) {
          hts[i] += (0 - hts[i]) * 0.04;
        }
      }

      // Compute path: organic oscillation around midline using sign from a sine wave
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        const x = i * step;
        const sign = Math.sin(i * 0.55 + frame * 0.03) > 0 ? 1 : -1;
        const y = midY + sign * hts[i] * midY;
        points.push({ x, y });
      }

      ctx.clearRect(0, 0, displayW, displayH);

      // ── Background muted waveform ──
      drawSmoothPath(ctx, points, 'rgba(100, 116, 139, 0.2)', 1.5, displayW, midY);

      // ── Active glowing waveform ──
      ctx.save();
      ctx.shadowColor = 'rgba(34, 211, 238, 0.5)';
      ctx.shadowBlur = 12;
      const grad = ctx.createLinearGradient(0, 0, displayW, 0);
      grad.addColorStop(0, '#22d3ee');
      grad.addColorStop(0.5, '#818cf8');
      grad.addColorStop(1, '#c084fc');
      drawSmoothPath(ctx, points, grad, 2.5, displayW, midY);
      ctx.restore();

      // ── Progress indicator dot ──
      const dotX = progress * displayW;
      const dotIdx = Math.floor(progress * (NUM_POINTS - 1));
      const clampedIdx = Math.min(dotIdx, NUM_POINTS - 1);
      const dotY = points[clampedIdx]?.y ?? midY;

      const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 10);
      dotGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      dotGlow.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
      dotGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = dotGlow;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className="block mx-auto"
      aria-hidden="true"
    />
  );
}

/** Draw a smooth waveform using quadratic bezier curves */
function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  stroke: string | CanvasGradient,
  lineWidth: number,
  _displayW: number,
  midY: number,
) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  const firstCpX = (points[0].x + points[1].x) / 2;
  const firstCpY = midY + (midY - points[0].y);
  ctx.quadraticCurveTo(firstCpX, firstCpY, points[1].x, points[1].y);

  let prevCpX = firstCpX;
  let prevCpY = firstCpY;
  let prevX = points[1].x;
  let prevY = points[1].y;

  for (let i = 2; i < points.length; i++) {
    const reflectedCpX = 2 * prevX - prevCpX;
    const reflectedCpY = 2 * prevY - prevCpY;
    ctx.quadraticCurveTo(reflectedCpX, reflectedCpY, points[i].x, points[i].y);
    prevCpX = reflectedCpX;
    prevCpY = reflectedCpY;
    prevX = points[i].x;
    prevY = points[i].y;
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
