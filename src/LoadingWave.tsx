import { useEffect, useRef } from "react";

const BARS = 56;
const PASS_MS = 1500;
const FINAL_MS = 560;
const SIGMA = 0.085;

const SHAPE = Array.from({ length: BARS }, (_, i) => {
  const t = i / (BARS - 1);
  const body = Math.sin(t * Math.PI) ** 0.6;
  const grain =
    Math.sin(i * 1.7) * 0.28 + Math.sin(i * 0.53 + 1.1) * 0.22 + Math.sin(i * 3.1 + 0.4) * 0.14;
  return Math.max(0.12, Math.min(1, body * (0.62 + grain * 0.5)));
});

export default function LoadingWave({
  color,
  progress,
  armed,
  width = 260,
  height = 46,
}: {
  color: string;
  progress: number;
  armed: boolean;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const progressRef = useRef(progress);
  const armedRef = useRef(armed);
  const armedAtRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    armedRef.current = armed;
    if (armed && armedAtRef.current === null) armedAtRef.current = performance.now();
  }, [armed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      const W = canvas.width;
      const H = canvas.height;
      const mid = H / 2;

      const dt = lastRef.current === null ? 16 : Math.min(48, now - lastRef.current);
      lastRef.current = now;

      const finishing = armedRef.current;
      const since = armedAtRef.current === null ? 0 : now - armedAtRef.current;
      const period = finishing ? FINAL_MS : PASS_MS;
      phaseRef.current = (phaseRef.current + dt / period) % 1;

      const settle = finishing ? Math.min(1, since / (FINAL_MS + 120)) : 0;
      const filled = finishing ? 1 : progressRef.current / 100;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;

      const step = W / BARS;
      const barW = Math.max(1, step * 0.42);
      const maxH = mid - 2 * dpr;

      for (let i = 0; i < BARS; i++) {
        const t = i / (BARS - 1);
        let d = Math.abs(t - phaseRef.current);
        d = Math.min(d, 1 - d);
        const pulse = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));

        const reached = t <= filled;
        const base = reached ? 0.26 : 0.08;
        const alpha = Math.min(1, base + pulse * 0.85 + settle * 0.34);
        const lift = 0.42 + pulse * 0.58 + settle * 0.3;
        const h = Math.max(1 * dpr, SHAPE[i] * lift * maxH);

        ctx.globalAlpha = alpha;
        ctx.fillRect(i * step + (step - barW) / 2, mid - h, barW, h * 2);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        display: "block",
        filter: `drop-shadow(0 0 5px ${color}66)`,
      }}
      aria-hidden
    />
  );
}
