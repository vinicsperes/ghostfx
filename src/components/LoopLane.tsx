import { useEffect, useRef } from "react";
import type { useLoop } from "../hooks/useLoop";
import { clock } from "../lib/format";
import { PanelLabel } from "./PanelLabel";

export function LoopLane({
  loop,
  height = 24,
}: {
  loop: ReturnType<typeof useLoop>;
  height?: number;
}) {
  const { slot, isPlaying, toggle, seek, unpin, getPosition } = loop;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !slot) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const { peaks, duration, color } = slot;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 320;
      const cssH = canvas.clientHeight || height;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      const W = canvas.width;
      const H = canvas.height;
      const mid = H / 2;
      const BARW = Math.max(1, Math.round(2 * dpr));
      const STEP = BARW + Math.max(1, Math.round(2 * dpr));
      const minH = Math.max(1, dpr);
      const maxH = mid - 2 * dpr;
      c.clearRect(0, 0, W, H);

      const at = getPosition();
      const played = duration > 0 ? (at / duration) * W : 0;

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
        c.fillStyle = color;
        c.globalAlpha = x <= played ? 0.85 : 0.26;
        c.beginPath();
        c.roundRect(x, mid - h, BARW, h * 2, BARW / 2);
        c.fill();
      }
      c.globalAlpha = 1;

      c.fillStyle = "#e7e4dc";
      c.fillRect(played, 0, Math.max(1, dpr), H);

      if (badgeRef.current) badgeRef.current.textContent = `${clock(at)} / ${clock(duration)}`;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slot, height, getPosition]);

  if (!slot) return null;

  const onSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * slot.duration);
  };

  return (
    <div
      className="flex items-center w-full shrink-0"
      style={{
        gap: 10,
        padding: "5px 9px",
        borderRadius: 7,
        border: `1px solid ${slot.color}2e`,
        background: `linear-gradient(90deg, ${slot.color}0f, rgba(255,255,255,0.015))`,
      }}
    >
      <span className="flex items-center shrink-0" style={{ gap: 5 }}>
        <span style={{ fontSize: 10, lineHeight: 1, color: slot.color }}>↻</span>
        <PanelLabel>Loop</PanelLabel>
      </span>

      <div
        onPointerDown={onSeek}
        title="Click to move the loop"
        style={{ flex: 1, height, minWidth: 60, cursor: "pointer" }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      <span
        className="font-[var(--font-mono)] flex items-center shrink-0 truncate"
        style={{ gap: 6, fontSize: 10, color: "rgba(231,228,220,0.72)", maxWidth: 140 }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: 2, flexShrink: 0, background: slot.color }}
        />
        <span className="truncate">{slot.name}</span>
      </span>

      <span
        ref={badgeRef}
        className="font-[var(--font-mono)] shrink-0 tabular-nums"
        style={{ fontSize: 9.5, color: "rgba(231,228,220,0.4)" }}
      />

      <button
        onClick={toggle}
        title={isPlaying ? "Hold the loop" : "Start the loop again"}
        aria-label={isPlaying ? "Pause loop" : "Play loop"}
        className="flex items-center justify-center shrink-0 transition-all active:scale-90"
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "1px solid rgba(231,228,220,0.12)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(231,228,220,0.72)",
          cursor: "pointer",
        }}
      >
        {isPlaying ? (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1.4" y="1" width="2.6" height="8" rx="0.8" />
            <rect x="6" y="1" width="2.6" height="8" rx="0.8" />
          </svg>
        ) : (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2.2 1.2 8.4 5 2.2 8.8Z" />
          </svg>
        )}
      </button>

      <button
        onClick={unpin}
        title="Take this one out of the loop"
        aria-label="Clear loop"
        className="flex items-center justify-center shrink-0 transition-all active:scale-90"
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "1px solid rgba(231,228,220,0.12)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(231,228,220,0.5)",
          cursor: "pointer",
        }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path
            d="M1.6 1.6 8.4 8.4M8.4 1.6 1.6 8.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
