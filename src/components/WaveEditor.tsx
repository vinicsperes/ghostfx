import { useEffect, useRef } from "react";
import type { Region } from "../hooks/useRecorder";

const HANDLE_GRAB = 8;

export function WaveEditor({
  lanes,
  duration,
  region,
  color,
  accent,
  height = 180,
  getPosition,
  onSeek,
  onRegion,
}: {
  lanes: Float32Array[];
  duration: number;
  region: Region;
  color: string;
  accent: string;
  height?: number;
  getPosition: () => number;
  onSeek?: (seconds: number) => void;
  onRegion?: (start: number, end: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const dragRef = useRef<"start" | "end" | null>(null);
  const regionRef = useRef(region);

  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 640;
      const cssH = canvas.clientHeight || height;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      const W = canvas.width;
      const H = canvas.height;
      c.clearRect(0, 0, W, H);
      if (!lanes.length || duration <= 0) return;

      const xOf = (t: number) => (t / duration) * W;
      const { start, end } = regionRef.current;
      const xStart = xOf(start);
      const xEnd = xOf(end);
      const at = getPosition();
      const headX = xOf(at);

      c.fillStyle = "rgba(0,0,0,0.35)";
      c.fillRect(0, 0, xStart, H);
      c.fillRect(xEnd, 0, W - xEnd, H);

      const gap = Math.max(2, Math.round(3 * dpr));
      const laneH = (H - gap * (lanes.length - 1)) / lanes.length;
      const BARW = Math.max(1, Math.round(2 * dpr));
      const STEP = BARW + Math.max(1, Math.round(1.6 * dpr));

      lanes.forEach((peaks, index) => {
        const top = index * (laneH + gap);
        const mid = top + laneH / 2;
        const maxH = Math.max(2, laneH / 2 - 2 * dpr);
        let peak = 0;
        for (const v of peaks) if (v > peak) peak = v;
        const scale = 1 / Math.max(0.12, peak);
        const bars = Math.floor(W / STEP);
        for (let b = 0; b < bars; b++) {
          const from = Math.floor((b / bars) * peaks.length);
          const to = Math.max(from + 1, Math.floor(((b + 1) / bars) * peaks.length));
          let p = 0;
          for (let i = from; i < to; i++) if (peaks[i] > p) p = peaks[i];
          const v = Math.min(1, p * scale);
          const h = Math.max(dpr, Math.pow(v, 0.8) * maxH);
          const x = b * STEP;
          const inside = x >= xStart && x <= xEnd;
          c.fillStyle = color;
          c.globalAlpha = inside ? (x <= headX ? 0.85 : 0.4) : 0.12;
          c.fillRect(x, mid - h, BARW, h * 2);
        }
      });

      c.globalAlpha = 1;
      if (onRegion) {
        const bar = Math.max(2, 2 * dpr);
        const grip = Math.max(8, 9 * dpr);
        const gripH = Math.min(H * 0.5, Math.max(22, 26 * dpr));
        const gripY = (H - gripH) / 2;
        c.fillStyle = accent;
        c.fillRect(xStart, 0, bar, H);
        c.fillRect(xEnd - bar, 0, bar, H);
        c.beginPath();
        c.roundRect(xStart, gripY, grip, gripH, 3 * dpr);
        c.roundRect(xEnd - grip, gripY, grip, gripH, 3 * dpr);
        c.fill();
        c.fillStyle = "rgba(0,0,0,0.55)";
        for (const gx of [xStart + grip / 2, xEnd - grip / 2]) {
          c.fillRect(gx - Math.max(1, dpr), gripY + gripH * 0.3, Math.max(1, dpr), gripH * 0.4);
          c.fillRect(gx + Math.max(1, dpr), gripY + gripH * 0.3, Math.max(1, dpr), gripH * 0.4);
        }
      }

      c.globalAlpha = 1;
      c.fillStyle = "#e7e4dc";
      c.fillRect(headX, 0, Math.max(1, dpr), H);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [lanes, duration, color, accent, height, getPosition, onRegion]);

  const timeAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xOf = (t: number) => (t / duration) * rect.width;
    if (onRegion) {
      if (Math.abs(x - xOf(region.start)) <= HANDLE_GRAB) dragRef.current = "start";
      else if (Math.abs(x - xOf(region.end)) <= HANDLE_GRAB) dragRef.current = "end";
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!dragRef.current) onSeek?.(timeAt(e));
  };

  const nearHandle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onRegion || duration <= 0) return false;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xOf = (t: number) => (t / duration) * rect.width;
    return (
      Math.abs(x - xOf(region.start)) <= HANDLE_GRAB || Math.abs(x - xOf(region.end)) <= HANDLE_GRAB
    );
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      e.currentTarget.style.cursor = nearHandle(e) ? "ew-resize" : "pointer";
      return;
    }
    if (!onRegion) return;
    const t = timeAt(e);
    if (dragRef.current === "start") onRegion(t, region.end);
    else onRegion(region.start, t);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 10,
        overflow: "hidden",
        background: "rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        touchAction: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
