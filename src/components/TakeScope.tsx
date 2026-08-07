import { useEffect, useRef } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import { MAX_REC_MS, WARN_REC_MS } from "../hooks/useRecorder";
import { clock } from "../lib/format";

const REC = "#f53e3e";

export function TakeScope({
  recorder,
  accent,
  height,
  getLevelRef,
  countingIn,
}: {
  recorder: ReturnType<typeof useRecorder>;
  accent: string;
  height: number;
  getLevelRef: { current: (() => number) | null };
  countingIn: boolean;
}) {
  const {
    activeTake,
    isRecording,
    isProcessing,
    playingId,
    togglePlay,
    seek,
    getPlayPosition,
    getRecordElapsed,
    activePeaks,
    activeDuration,
    activeRegion,
  } = recorder;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    if (isRecording) liveRef.current = [];
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const peaks = activePeaks;
    const duration = activeDuration;
    const isPlaying = !!activeTake && playingId === activeTake.id;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 520;
      const cssH = canvas.clientHeight || height;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      const W = canvas.width,
        H = canvas.height,
        mid = H / 2;
      const BARW = Math.max(2, Math.round(3 * dpr));
      const STEP = BARW + Math.max(1, Math.round(2 * dpr));
      const minH = Math.max(1, 1.5 * dpr);
      const maxH = mid - 3 * dpr;
      c.clearRect(0, 0, W, H);

      const bar = (x: number, h: number, alpha: number) => {
        c.globalAlpha = alpha;
        c.beginPath();
        c.roundRect(x, mid - h, BARW, h * 2, BARW / 2);
        c.fill();
      };

      c.fillStyle = accent;
      c.shadowColor = accent;
      c.shadowBlur = 4 * dpr;

      if (isRecording) {
        liveRef.current.push(getLevelRef.current?.() ?? 0);
        const samples = liveRef.current;
        const visible = Math.ceil(W / STEP);
        if (samples.length > visible + 4) samples.splice(0, samples.length - visible - 4);
        const n = samples.length;
        let maxL = 0;
        for (const v of samples) if (v > maxL) maxL = v;
        const scale = 1 / Math.max(0.12, maxL);
        for (let k = 0; k < n; k++) {
          const x = W - (n - k) * STEP;
          if (x < -BARW) continue;
          const v = Math.min(1, samples[k] * scale);
          const h = Math.max(minH, Math.pow(v, 0.75) * maxH);
          bar(x, h, 0.55 + 0.45 * v);
        }
        const elapsed = getRecordElapsed();
        const left = MAX_REC_MS / 1000 - elapsed;
        if (badgeRef.current) {
          const warn = left * 1000 <= WARN_REC_MS;
          badgeRef.current.textContent = warn ? `${clock(left)} LEFT` : `● ${clock(elapsed)}`;
          badgeRef.current.style.color = warn ? REC : accent;
        }
      } else if (peaks && peaks.length > 0) {
        const at = getPlayPosition();
        const xOf = (t: number) => (duration > 0 ? (t / duration) * W : 0);
        const headX = xOf(at);
        const trimmed = activeRegion.end - activeRegion.start < duration - 0.02;
        const xStart = xOf(activeRegion.start);
        const xEnd = xOf(activeRegion.end);
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
          const played = x <= headX;
          const inside = !trimmed || (x >= xStart && x <= xEnd);
          bar(x, h, inside ? (played ? 0.55 + 0.45 * v : 0.16 + 0.12 * v) : 0.08);
        }
        if (at > 0 || isPlaying) {
          c.globalAlpha = 1;
          c.fillRect(headX, 0, Math.max(1, dpr), H);
        }
        if (badgeRef.current) {
          badgeRef.current.textContent = `${clock(at)} / ${clock(duration)}`;
          badgeRef.current.style.color = "rgba(188,188,210,0.8)";
        }
      } else {
        c.shadowBlur = 0;
        c.fillStyle = "rgba(231,228,220,0.13)";
        c.fillRect(0, mid - Math.max(1, dpr * 0.5), W, Math.max(1, dpr));
      }

      if (!isRecording && !(peaks && peaks.length > 0) && badgeRef.current) {
        badgeRef.current.textContent = countingIn
          ? "COUNT IN"
          : isProcessing
            ? "SAVING"
            : `MAX ${clock(MAX_REC_MS / 1000)}`;
        badgeRef.current.style.color = countingIn ? accent : "rgba(188,188,210,0.8)";
      }

      c.globalAlpha = 1;
      c.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    isRecording,
    isProcessing,
    countingIn,
    activeTake,
    activePeaks,
    activeDuration,
    activeRegion,
    playingId,
    accent,
    height,
    getLevelRef,
    getPlayPosition,
    getRecordElapsed,
  ]);

  const onScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeTake || isRecording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    void seek(ratio * activeDuration);
  };

  const isPlaying = !!activeTake && playingId === activeTake.id;

  return (
    <>
      <button
        onClick={() => void togglePlay()}
        disabled={!activeTake || isRecording}
        title={isPlaying ? "Pause" : "Play take"}
        aria-label={isPlaying ? "Pause" : "Play take"}
        className="flex items-center justify-center transition-all active:scale-90 shrink-0"
        style={{
          width: 44,
          height,
          borderRadius: 6,
          background: "rgba(10,10,16,0.9)",
          border: `1px solid ${accent}30`,
          color: activeTake && !isRecording ? accent : "rgba(255,255,255,0.25)",
          cursor: activeTake && !isRecording ? "pointer" : "not-allowed",
          opacity: activeTake && !isRecording ? 1 : 0.5,
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
        onPointerDown={onScrub}
        style={{
          position: "relative",
          flex: 1,
          height,
          borderRadius: 8,
          overflow: "hidden",
          background: "rgba(0,0,0,0.32)",
          border: "1px solid rgba(255,255,255,0.05)",
          cursor: activeTake && !isRecording ? "pointer" : "default",
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
