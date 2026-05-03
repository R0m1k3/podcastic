import { useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';

interface AudioVisualizerProps {
  height?: number;
}

const NUM_POINTS = 42;
const MAX_AMPLITUDE = 0.42;
const PADDING = 6;

export default function AudioVisualizer({ height = 80 }: AudioVisualizerProps) {
  const { isPlaying, getFrequencyData } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const heightsRef = useRef<number[]>(Array(NUM_POINTS).fill(0));
  const playingRef = useRef(isPlaying);
  const getDataRef = useRef(getFrequencyData);
  const hasRealDataRef = useRef(false);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { getDataRef.current = getFrequencyData; }, [getFrequencyData]);

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
    const drawW = displayW - PADDING * 2;

    const HALF = Math.floor(NUM_POINTS / 2); // 21 — center outward
    let frame = 0;

    const animate = () => {
      if (!ctx || !canvas) return;
      frame++;
      const raw = getDataRef.current?.();
      const hts = heightsRef.current;
      const step = drawW / (NUM_POINTS - 1);
      const playing = playingRef.current;

      // Detect if real frequency data is available
      if (raw && playing) {
        const sum = raw.reduce((a, b) => a + b, 0);
        hasRealDataRef.current = sum > 0;
      }

      // Update heights — only HALF entries, mirrored in point computation
      if (playing) {
        if (raw && hasRealDataRef.current) {
          // Real frequency data: index 0 = center (low freq), HALF-1 = edge (high freq)
          for (let i = 0; i < HALF; i++) {
            const bucketSize = raw.length / HALF;
            const startIdx = Math.floor(i * bucketSize);
            const endIdx = Math.floor((i + 1) * bucketSize);
            let sum = 0;
            let count = 0;
            for (let j = startIdx; j < endIdx && j < raw.length; j++) {
              sum += raw[j];
              count++;
            }
            const avg = count > 0 ? sum / count : 0;
            const boosted = Math.pow(avg / 255, 0.6);
            const target = boosted * MAX_AMPLITUDE;
            hts[i] += (target - hts[i]) * 0.22;
          }
        } else {
          // Simulated — symmetric wave emanating from center
          for (let i = 0; i < HALF; i++) {
            const slow = Math.sin(frame * 0.025 + i * 0.38) * 0.5 + 0.5;
            const fast = Math.sin(frame * 0.08 + i * 1.1) * 0.35 + 0.65;
            const pulse = Math.sin(frame * 0.012) * 0.2 + 0.8;
            const target = MAX_AMPLITUDE * slow * fast * pulse;
            hts[i] += (target - hts[i]) * 0.18;
          }
        }
      } else {
        for (let i = 0; i < HALF; i++) {
          hts[i] += (0 - hts[i]) * 0.1;
        }
      }

      // Compute mirrored path: center (i=20/21) → edges (i=0/41)
      const centerIdx = (NUM_POINTS - 1) / 2;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        const x = PADDING + i * step;
        const dist = Math.abs(i - centerIdx);
        const htIdx = Math.min(Math.floor(dist), HALF - 1);
        const phase = dist * 0.7 + frame * 0.022;
        const y = midY + Math.sin(phase) * hts[htIdx] * midY;
        points.push({ x, y });
      }

      ctx.clearRect(0, 0, displayW, displayH);

      // ── Background muted line ──
      ctx.save();
      ctx.globalAlpha = playing ? 0.18 : 0.22;
      drawSmoothPath(ctx, points, 'rgb(148, 163, 184)', 1.5, displayW, midY);
      ctx.restore();

      // ── Active glowing waveform ──
      ctx.save();
      ctx.shadowColor = 'rgba(34, 211, 238, 0.3)';
      ctx.shadowBlur = 8;
      const grad = ctx.createLinearGradient(PADDING, 0, displayW - PADDING, 0);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.35, '#22d3ee');
      grad.addColorStop(0.65, '#a78bfa');
      grad.addColorStop(1, '#c084fc');
      drawSmoothPath(ctx, points, grad, 2, displayW, midY);
      ctx.restore();


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