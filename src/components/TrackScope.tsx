import { useEffect, useRef } from "react";
import type { useTrack } from "../hooks/useTrack";
import { clock } from "../lib/format";

const HANDLE_GRAB = 11;

export function TrackScope({
  track,
  accent,
  height,
}: {
  track: ReturnType<typeof useTrack>;
  accent: string;
  height: number;
}) {
  const { track: loaded, isPlaying, loop, region, toggle, seek, setRegion, getPosition } = track;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);
  const dragRef = useRef<"start" | "end" | null>(null);
  const regionRef = useRef(region);

  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const { peaks, duration } = loaded;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 520;
      const cssH = canvas.clientHeight || height;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      const W = canvas.width;
      const H = canvas.height;
      const mid = H / 2;
      const BARW = Math.max(2, Math.round(3 * dpr));
      const STEP = BARW + Math.max(1, Math.round(2 * dpr));
      const minH = Math.max(1, 1.5 * dpr);
      const maxH = mid - 3 * dpr;
      c.clearRect(0, 0, W, H);

      const at = getPosition();
      const { start, end } = regionRef.current;
      const xOf = (t: number) => (duration > 0 ? (t / duration) * W : 0);
      const xStart = xOf(start);
      const xEnd = xOf(end);

      if (loop) {
        c.fillStyle = `${accent}12`;
        c.fillRect(xStart, 0, Math.max(1, xEnd - xStart), H);
      }

      let maxP = 0;
      for (const v of peaks) if (v > maxP) maxP = v;
      const scale = 1 / Math.max(0.12, maxP);
      const nBars = Math.floor(W / STEP);
      for (let b = 0; b < nBars; b++) {
        const from = Math.floor((b / nBars) * peaks.length);
        const to = Math.max(from + 1, Math.floor(((b + 1) / nBars) * peaks.length));
        let p = 0;
        for (let i = from; i < to; i++) if (peaks[i] > p) p = peaks[i];
        const v = Math.min(1, p * scale);
        const h = Math.max(minH, Math.pow(v, 0.8) * maxH);
        const x = b * STEP + (STEP - BARW) / 2;
        const inside = !loop || (x >= xStart && x <= xEnd);
        c.fillStyle = inside ? "rgba(231,228,220,0.6)" : "rgba(231,228,220,0.14)";
        c.beginPath();
        c.roundRect(x, mid - h, BARW, h * 2, BARW / 2);
        c.fill();
      }

      if (loop) {
        c.fillStyle = accent;
        c.fillRect(xStart, 0, Math.max(1, 2 * dpr), H);
        c.fillRect(xEnd - Math.max(1, 2 * dpr), 0, Math.max(1, 2 * dpr), H);
      }

      c.fillStyle = "#e7e4dc";
      c.fillRect(xOf(at), 0, Math.max(1, dpr), H);

      if (badgeRef.current) badgeRef.current.textContent = `${clock(at)} / ${clock(duration)}`;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, loop, accent, height, getPosition]);

  if (!loaded) return null;

  const timeAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * loaded.duration;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xOf = (t: number) => (t / loaded.duration) * rect.width;
    if (loop) {
      if (Math.abs(x - xOf(region.start)) <= HANDLE_GRAB) dragRef.current = "start";
      else if (Math.abs(x - xOf(region.end)) <= HANDLE_GRAB) dragRef.current = "end";
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!dragRef.current) seek(timeAt(e));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const t = timeAt(e);
    if (dragRef.current === "start") setRegion(t, region.end);
    else setRegion(region.start, t);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <>
      <button
        onClick={toggle}
        title={isPlaying ? "Pause track" : "Play track"}
        aria-label={isPlaying ? "Pause track" : "Play track"}
        className="flex items-center justify-center transition-all active:scale-90 shrink-0"
        style={{
          width: 44,
          height,
          borderRadius: 6,
          background: "rgba(10,10,16,0.9)",
          border: `1px solid ${accent}30`,
          color: accent,
          cursor: "pointer",
        }}
      >
        {isPlaying ? (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2.5" width="3.6" height="11" rx="1" />
            <rect x="9.4" y="2.5" width="3.6" height="11" rx="1" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
          </svg>
        )}
      </button>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: "relative",
          flex: 1,
          height,
          borderRadius: 8,
          overflow: "hidden",
          background: "rgba(0,0,0,0.32)",
          border: "1px solid rgba(255,255,255,0.05)",
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={520}
          height={height}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        <span
          ref={badgeRef}
          style={{
            position: "absolute",
            top: 5,
            right: 7,
            fontSize: 9,
            fontFamily: "monospace",
            letterSpacing: "0.1em",
            color: "rgba(188,188,210,0.8)",
            background: "rgba(3,3,8,0.8)",
            padding: "1px 5px",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}
