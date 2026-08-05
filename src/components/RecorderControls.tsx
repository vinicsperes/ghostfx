import { useEffect, useRef } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import { MAX_REC_MS, WARN_REC_MS } from "../hooks/useRecorder";
import { PRESETS, PRESET_META } from "../data/presets";

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

  return (
    <div className="flex w-full" style={{ gap: 18 }}>
      {takes.length > 0 && (
        <div className="flex flex-col shrink-0" style={{ gap: 7, width: 176 }}>
          <span
            className="font-[var(--font-mono)] uppercase"
            style={{ fontSize: 8.5, letterSpacing: "0.24em", color: "rgba(231,228,220,0.42)" }}
          >
            Takes
          </span>
          <div
            className="preset-scroll flex flex-col overflow-y-auto"
            style={{ gap: 4, maxHeight: scopeHeight + 46 }}
          >
            {takes.map((take) => {
              const on = take.id === activeTake?.id;
              const idx = take.presetIdx ?? 0;
              const color = PRESET_META[idx].color;
              return (
                <div
                  key={take.id}
                  className="flex items-center shrink-0"
                  style={{
                    gap: 8,
                    paddingRight: 4,
                    borderRadius: 6,
                    border: `1px solid ${on ? accent + "45" : "transparent"}`,
                    background: on ? `${accent}10` : "transparent",
                  }}
                >
                  <button
                    onClick={() => selectTake(take.id)}
                    className="flex items-center flex-1 min-w-0"
                    style={{ gap: 8, padding: "6px 0 6px 9px", cursor: "pointer" }}
                    title={`${PRESETS[idx].name} take, ${clock(take.duration)}`}
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
                      className="font-[var(--font-mono)] truncate"
                      style={{
                        flex: 1,
                        textAlign: "left",
                        fontSize: 10.5,
                        color: on ? "#e7e4dc" : "rgba(231,228,220,0.6)",
                      }}
                    >
                      {PRESETS[idx].name}
                    </span>
                    <span
                      className="font-[var(--font-mono)]"
                      style={{
                        fontSize: 9.5,
                        fontVariantNumeric: "tabular-nums",
                        color: "rgba(231,228,220,0.38)",
                      }}
                    >
                      {clock(take.duration)}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteTake(take.id)}
                    aria-label="Delete take"
                    title="Delete take"
                    style={{
                      fontSize: 14,
                      lineHeight: 1,
                      padding: "0 4px",
                      color: "rgba(231,228,220,0.3)",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 10 }}>
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

          <button
            onClick={() => void downloadTake()}
            disabled={!activeTake}
            title={activeTake ? "Download MP3" : "Record something first"}
            aria-label="Download take"
            className={btn}
            style={{
              ...btnBase,
              border: `1px solid ${accent}30`,
              color: activeTake ? accent : "rgba(255,255,255,0.25)",
              cursor: activeTake ? "pointer" : "not-allowed",
              opacity: activeTake ? 1 : 0.5,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
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

        {activeTake && (
          <div className="flex items-center" style={{ gap: 10 }}>
            <span
              className="font-[var(--font-mono)] uppercase shrink-0"
              style={{ fontSize: 8.5, letterSpacing: "0.2em", color: "rgba(231,228,220,0.42)" }}
            >
              Playing through
            </span>
            <div className="preset-scroll flex overflow-x-auto" style={{ gap: 5 }}>
              {PRESETS.map((p, i) => {
                const on = activeRig === i;
                const busy = reampingTo === i;
                const recorded = (activeTake.presetIdx ?? 0) === i;
                const canReamp = recorded || !!activeTake.dryBlob;
                return (
                  <button
                    key={p.name}
                    onClick={() => void setRig(i)}
                    disabled={!canReamp || reampingTo !== null || isRecording}
                    title={recorded ? `${p.name}, as recorded` : `Re-amp through ${p.name}`}
                    className="font-[var(--font-mono)] shrink-0 transition-all active:scale-95"
                    style={{
                      padding: "5px 11px",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      borderRadius: 999,
                      border: `1px solid ${on ? PRESET_META[i].color + "99" : "rgba(255,255,255,0.08)"}`,
                      background: on ? `${PRESET_META[i].color}1f` : "transparent",
                      color: on ? PRESET_META[i].color : "rgba(231,228,220,0.5)",
                      cursor: reampingTo !== null ? "wait" : canReamp ? "pointer" : "not-allowed",
                      opacity: !canReamp ? 0.3 : reampingTo !== null && !busy ? 0.4 : 1,
                    }}
                  >
                    {busy ? "..." : p.name}
                  </button>
                );
              })}
            </div>
            {!isOriginal && (
              <span
                className="font-[var(--font-mono)] shrink-0"
                style={{ fontSize: 9, color: "rgba(231,228,220,0.34)" }}
              >
                re-amped
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
