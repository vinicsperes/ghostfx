import { useEffect, useRef } from "react";

const BARS = 64;
const BAR_W = 3;
const GAP = 2;
const W = BARS * (BAR_W + GAP) - GAP;
const H = 56;

const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const phrase = 0.5 + 0.32 * Math.sin(i * 0.31) + 0.22 * Math.sin(i * 0.12 + 2.1);
  const jitter = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return Math.min(1, Math.max(0.12, phrase * (0.45 + 0.55 * jitter)));
});

export default function LoadingWave({
  color,
  progress,
  armed,
}: {
  color: string;
  progress: number;
  armed: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ progress, armed });
  useEffect(() => {
    stateRef.current = { progress, armed };
  }, [progress, armed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let smooth = 0;
    let calm = 0;

    const draw = (now: number) => {
      const t = now / 1000;
      smooth += (stateRef.current.progress / 100 - smooth) * 0.08;
      calm += ((stateRef.current.armed ? 1 : 0) - calm) * 0.05;
      ctx.clearRect(0, 0, W, H);

      const head = smooth * BARS;
      const pulse = 1 + 0.06 * calm * Math.sin(t * 2.4);

      for (let i = 0; i < BARS; i++) {
        const x = i * (BAR_W + GAP);
        const near = Math.max(0, 1 - Math.abs(i - head) / 4);
        const dance = (1 - calm) * near * 0.35 * Math.sin(t * 7 + i * 1.7);
        const played = i < head;
        const h = Math.max(3, HEIGHTS[i] * H * 0.92 * (1 + dance) * pulse);
        const y = (H - h) / 2;

        if (played || calm > 0.01) {
          ctx.globalAlpha = played ? 0.9 : 0.9 * calm;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6 + 4 * near + 3 * calm;
        } else {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = "rgba(255,255,255,0.09)";
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_W, h, 1.5);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [color]);

  return <canvas ref={canvasRef} style={{ width: W, height: H }} />;
}
