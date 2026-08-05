import { useEffect, useRef, useState } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import { MAX_REC_MS, WARN_REC_MS } from "../hooks/useRecorder";
import { PRESETS, PRESET_META } from "../data/presets";
import { MiniWave } from "./MiniWave";
import { Popover } from "./Popover";

const REC = "#f53e3e";

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function RecorderControls({
  recorder,
  onRecord,
  getLevelRef,
  accent,
  scopeHeight = 56,
  countingIn = false,
}: {
  recorder: ReturnType<typeof useRecorder>;
  onRecord: () => void;
  getLevelRef: { current: (() => number) | null };
  accent: string;
  scopeHeight?: number;
  countingIn?: boolean;
}) {
  const {
    takes,
    activeTake,
    isRecording,
    isProcessing,
    playingId,
    togglePlay,
    seek,
    selectTake,
    deleteTake,
    downloadTake,
    getPlayPosition,
    getRecordElapsed,
    setRig,
    rigOf,
    peaksOf,
    activeRig,
    activePeaks,
    activeDuration,
    reampingTo,
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
      const cssH = canvas.clientHeight || scopeHeight;
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
        const headX = duration > 0 ? (at / duration) * W : 0;
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
          bar(x, h, played ? 0.55 + 0.45 * v : 0.16 + 0.12 * v);
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
    playingId,
    accent,
    scopeHeight,
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

  const btn = "flex items-center justify-center transition-all active:scale-90 shrink-0";
  const btnBase = {
    width: 44,
    height: scopeHeight,
    borderRadius: 6,
    background: "rgba(10,10,16,0.9)",
  } as const;
  const isPlaying = !!activeTake && playingId === activeTake.id;
  const isOriginal = !!activeTake && activeRig === (activeTake.presetIdx ?? 0);
  const [rigMenu, setRigMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const rigAnchor = useRef<HTMLButtonElement>(null);
  const drawerAnchor = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col w-full" style={{ gap: 9 }}>
      <div className="flex items-center gap-1.5 w-full lg:gap-3">
        <button
          onClick={onRecord}
          disabled={isProcessing || countingIn}
          title={isRecording ? "Stop (Space)" : "Record (Space)"}
          aria-label={isRecording ? "Stop recording" : "Record"}
          className={btn}
          style={{
            ...btnBase,
            border: `1px solid ${isRecording ? REC : accent + "30"}`,
            opacity: isProcessing || countingIn ? 0.5 : 1,
            cursor: isProcessing ? "wait" : "pointer",
          }}
        >
          <span
            className={isRecording || countingIn ? "animate-pulse" : ""}
            style={{
              width: 14,
              height: 14,
              borderRadius: isRecording ? 3 : "50%",
              background: REC,
              boxShadow: `0 0 7px ${REC}`,
            }}
          />
        </button>

        <button
          onClick={() => void togglePlay()}
          disabled={!activeTake || isRecording}
          title={isPlaying ? "Pause" : "Play take"}
          aria-label={isPlaying ? "Pause" : "Play take"}
          className={btn}
          style={{
            ...btnBase,
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
            height: scopeHeight,
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
            height={scopeHeight}
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
      </div>

      <div ref={drawerAnchor} className="flex items-center" style={{ gap: 10 }}>
        <div>
          <button
            ref={rigAnchor}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setRigMenu((v) => !v)}
            disabled={!activeTake?.dryBlob || reampingTo !== null || isRecording}
            aria-expanded={rigMenu}
            title={activeTake ? "Hear this take through another rig" : "Record something first"}
            className="font-[var(--font-mono)] flex items-center"
            style={{
              gap: 7,
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${rigMenu ? accent + "55" : "rgba(231,228,220,0.1)"}`,
              background: rigMenu ? `${accent}12` : "rgba(255,255,255,0.02)",
              fontSize: 10.5,
              color: activeTake ? "rgba(231,228,220,0.8)" : "rgba(231,228,220,0.3)",
              cursor: activeTake?.dryBlob ? "pointer" : "default",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: activeTake ? PRESET_META[activeRig].color : "rgba(231,228,220,0.25)",
              }}
            />
            {reampingTo !== null ? "..." : activeTake ? PRESETS[activeRig].name : "NO TAKE"}
            {activeTake && !isOriginal && <span style={{ opacity: 0.5 }}>↺</span>}
            <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
          </button>

          <Popover
            anchorRef={rigAnchor}
            open={rigMenu && !!activeTake}
            onClose={() => setRigMenu(false)}
            width={150}
          >
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => {
                  setRigMenu(false);
                  void setRig(i);
                }}
                className="font-[var(--font-mono)] flex items-center w-full"
                style={{
                  gap: 8,
                  padding: "8px 9px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  color: activeRig === i ? PRESET_META[i].color : "rgba(231,228,220,0.62)",
                  background: activeRig === i ? `${PRESET_META[i].color}14` : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{ width: 6, height: 6, borderRadius: 2, background: PRESET_META[i].color }}
                />
                {p.name}
                {(activeTake?.presetIdx ?? 0) === i && (
                  <span style={{ marginLeft: "auto", fontSize: 8, opacity: 0.5 }}>REC</span>
                )}
              </button>
            ))}
          </Popover>
        </div>

        <Popover
          anchorRef={drawerAnchor}
          open={drawer && takes.length > 0}
          onClose={() => setDrawer(false)}
        >
          {takes.map((take) => {
            const on = take.id === activeTake?.id;
            const rig = rigOf(take.id, take.presetIdx ?? 0);
            const color = PRESET_META[rig].color;
            return (
              <div
                key={take.id}
                className="flex items-center"
                style={{
                  gap: 12,
                  padding: "7px 6px 7px 10px",
                  borderRadius: 7,
                  border: `1px solid ${on ? accent + "40" : "transparent"}`,
                  background: on ? `${accent}0d` : "transparent",
                }}
              >
                <button
                  onClick={() => {
                    selectTake(take.id);
                    setDrawer(false);
                  }}
                  className="flex items-center flex-1 min-w-0"
                  style={{ gap: 12, cursor: "pointer" }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: color,
                      boxShadow: on ? `0 0 6px ${color}` : "none",
                    }}
                  />
                  <span
                    className="font-[var(--font-mono)] shrink-0"
                    style={{
                      width: 58,
                      textAlign: "left",
                      fontSize: 10.5,
                      color: on ? "#e7e4dc" : "rgba(231,228,220,0.62)",
                    }}
                  >
                    {PRESETS[rig].name}
                  </span>
                  <span className="flex-1 min-w-0 hidden sm:block">
                    <MiniWave peaks={peaksOf(take)} color={color} width={220} height={20} />
                  </span>
                  <span
                    className="font-[var(--font-mono)] shrink-0"
                    style={{
                      fontSize: 9.5,
                      fontVariantNumeric: "tabular-nums",
                      color: "rgba(231,228,220,0.4)",
                    }}
                  >
                    {clock(take.duration)}
                  </span>
                </button>
                <button
                  onClick={() => deleteTake(take.id)}
                  aria-label="Delete take"
                  title="Delete take"
                  className="shrink-0"
                  style={{
                    fontSize: 15,
                    lineHeight: 1,
                    padding: "0 5px",
                    color: "rgba(231,228,220,0.3)",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </Popover>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setDrawer((v) => !v)}
          disabled={takes.length === 0}
          aria-expanded={drawer}
          className="font-[var(--font-mono)] flex items-center"
          style={{
            gap: 7,
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${drawer ? accent + "55" : "rgba(231,228,220,0.1)"}`,
            background: drawer ? `${accent}12` : "rgba(255,255,255,0.02)",
            fontSize: 10.5,
            color: takes.length ? "rgba(231,228,220,0.72)" : "rgba(231,228,220,0.3)",
            cursor: takes.length ? "pointer" : "default",
          }}
        >
          {takes.length === 0
            ? "NO TAKES YET"
            : `${takes.length} TAKE${takes.length > 1 ? "S" : ""}`}
          {takes.length > 0 && <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>}
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => void downloadTake()}
          disabled={!activeTake}
          title={activeTake ? "Download MP3" : "Record something first"}
          aria-label="Download take"
          className="flex items-center justify-center transition-all active:scale-90 shrink-0"
          style={{
            width: 34,
            height: 30,
            borderRadius: 6,
            border: `1px solid ${accent}30`,
            background: "rgba(10,10,16,0.9)",
            color: activeTake ? accent : "rgba(255,255,255,0.25)",
            cursor: activeTake ? "pointer" : "not-allowed",
            opacity: activeTake ? 1 : 0.5,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2v9M9 11l-3.4-3.4M9 11l3.4-3.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M3 14.8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
