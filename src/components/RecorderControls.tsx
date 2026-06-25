import { useEffect, useRef } from "react";

export function RecorderControls({
  isRecording, hasRecording, recordedDuration, onToggle, onDownload, getLevelRef, getRecordedPeaks, accent, scopeHeight = 48,
}: {
  isRecording: boolean;
  hasRecording: boolean;
  recordedDuration: number;
  onToggle: () => void;
  onDownload: () => void;
  getLevelRef: { current: (() => number) | null };
  getRecordedPeaks: () => Float32Array | null;
  accent: string;
  scopeHeight?: number;
}) {
  const REC = "#f53e3e";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  useEffect(() => { if (isRecording) liveRef.current = []; }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const draw = () => {
      const W = canvas.width, H = canvas.height, mid = H / 2;
      c.clearRect(0, 0, W, H);
      c.beginPath(); c.moveTo(0, mid); c.lineTo(W, mid);
      c.strokeStyle = "rgba(255,255,255,0.06)"; c.lineWidth = 1; c.stroke();

      c.fillStyle = accent; c.shadowColor = accent; c.shadowBlur = 5;
      if (isRecording) {
        liveRef.current.push(getLevelRef.current?.() ?? 0);
        const samples = liveRef.current;
        const STEP = 3, BARW = 2;
        const visible = Math.ceil(W / STEP);
        if (samples.length > visible + 4) samples.splice(0, samples.length - visible - 4);
        const n = samples.length;
        for (let k = 0; k < n; k++) {
          const x = W - (n - k) * STEP;
          if (x < -BARW) continue;
          const h = Math.min(1, samples[k]) * (mid - 2);
          c.fillRect(x, mid - h, BARW, h * 2);
        }
      } else if (hasRecording) {
        const data = getRecordedPeaks();
        if (data && data.length > 0) {
          const n = data.length;
          for (let i = 0; i < n; i++) {
            const x = (i / n) * W;
            const h = Math.min(1, data[i]) * (mid - 2);
            c.fillRect(x, mid - h, Math.max(1, (W / n) * 0.7), h * 2);
          }
        }
      }
      c.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRecording, hasRecording, accent, getLevelRef, getRecordedPeaks]);

  const btn = "flex items-center justify-center transition-all active:scale-90 shrink-0";
  const btnBase = { width: 46, height: scopeHeight, borderRadius: 6, background: "rgba(10,10,16,0.9)" } as const;

  return (
    <div className="flex items-center gap-1.5 w-full lg:gap-3.5">
      <button
        onClick={onToggle}
        title={isRecording ? "Stop (Space)" : "Record (Space)"}
        aria-label={isRecording ? "Stop recording" : "Record"}
        className={btn}
        style={{ ...btnBase, border: `1px solid ${isRecording ? REC : accent + "30"}`, color: REC }}
      >
        <span className={isRecording ? "animate-pulse" : ""} style={{ width: 14, height: 14, borderRadius: isRecording ? 3 : "50%", background: REC, boxShadow: `0 0 7px ${REC}` }} />
      </button>

      <div style={{ position: "relative", flex: 1, height: scopeHeight, borderRadius: 6, overflow: "hidden", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <canvas ref={canvasRef} width={520} height={scopeHeight} style={{ width: "100%", height: "100%", display: "block" }} />
        <span style={{ position: "absolute", top: 4, right: 5, fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em", color: isRecording ? accent : "rgba(188,188,210,0.8)", background: "rgba(3,3,8,0.8)", padding: "1px 5px", borderRadius: 4, pointerEvents: "none" }}>
          {isRecording ? "● REC" : hasRecording ? `${recordedDuration.toFixed(1)}s` : "MAX 30s"}
        </span>
      </div>

      <button
        onClick={onDownload}
        disabled={!hasRecording}
        title={hasRecording ? "Download MP3" : "Record something first"}
        aria-label="Download take"
        className={btn}
        style={{ ...btnBase, border: `1px solid ${accent}30`, color: hasRecording ? accent : "rgba(255,255,255,0.25)", cursor: hasRecording ? "pointer" : "not-allowed", opacity: hasRecording ? 1 : 0.5 }}
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <path d="M9 2v9M9 11l-3.4-3.4M9 11l3.4-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 14.8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
