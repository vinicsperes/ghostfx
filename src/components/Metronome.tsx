import { useEffect, useRef } from "react";
import type { useMetronome } from "../hooks/useMetronome";
import { MAX_BPM, MIN_BPM } from "../hooks/useMetronome";

export function Metronome({
  metronome,
  countInEnabled,
  onToggleCountIn,
  accent,
  compact = false,
}: {
  metronome: ReturnType<typeof useMetronome>;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  accent: string;
  compact?: boolean;
}) {
  const { bpm, setBpm, isRunning, countingIn, toggle, getBeat, beatsPerBar } = metronome;
  const dotsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef(0);
  const tapRef = useRef<number[]>([]);

  useEffect(() => {
    const live = isRunning || countingIn;
    const paint = () => {
      const beat = live ? getBeat() % beatsPerBar : -1;
      dotsRef.current.forEach((dot, i) => {
        if (!dot) return;
        const on = i === beat;
        dot.style.background = on ? accent : "rgba(231,228,220,0.16)";
        dot.style.boxShadow = on ? `0 0 8px ${accent}` : "none";
        dot.style.transform = on ? "scale(1.35)" : "scale(1)";
      });
      rafRef.current = requestAnimationFrame(paint);
    };
    rafRef.current = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, countingIn, getBeat, beatsPerBar, accent]);

  const tap = () => {
    const now = performance.now();
    const taps = tapRef.current;
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 4) taps.shift();
    if (taps.length < 2) return;
    let sum = 0;
    for (let i = 1; i < taps.length; i++) sum += taps[i] - taps[i - 1];
    setBpm(60000 / (sum / (taps.length - 1)));
  };

  const step = (delta: number) => setBpm(bpm + delta);

  const chip = {
    height: compact ? 27 : 22,
    minWidth: compact ? 27 : 22,
    borderRadius: 4,
    border: "1px solid rgba(231,228,220,0.12)",
    background: "rgba(255,255,255,0.02)",
    color: "rgba(231,228,220,0.6)",
    fontSize: 11,
    lineHeight: 1,
    cursor: "pointer",
  } as const;

  return (
    <div className="flex flex-col" style={{ gap: compact ? 11 : 7, width: compact ? "100%" : 186 }}>
      <div className="flex items-center" style={{ gap: compact ? 9 : 7 }}>
        <button
          onClick={toggle}
          aria-label={isRunning ? "Stop metronome" : "Start metronome"}
          title={isRunning ? "Stop metronome" : "Start metronome"}
          className="flex items-center justify-center shrink-0 transition-all active:scale-90"
          style={{
            width: compact ? 36 : 30,
            height: compact ? 36 : 30,
            borderRadius: 6,
            border: `1px solid ${isRunning ? accent + "60" : "rgba(231,228,220,0.12)"}`,
            background: isRunning ? `${accent}12` : "rgba(255,255,255,0.02)",
            color: isRunning ? accent : "rgba(231,228,220,0.5)",
            cursor: "pointer",
          }}
        >
          {isRunning ? (
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="10" height="10" rx="1.5" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
            </svg>
          )}
        </button>

        <button onClick={() => step(-1)} style={chip} aria-label="Slower">
          −
        </button>
        <span
          className="font-[var(--font-mono)] text-center"
          style={{
            minWidth: compact ? 58 : 46,
            fontSize: compact ? 23 : 17,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: "#e7e4dc",
          }}
        >
          {bpm}
        </span>
        <button onClick={() => step(1)} style={chip} aria-label="Faster">
          +
        </button>
      </div>

      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Tempo"
        style={{ width: 186, accentColor: accent, height: 3, cursor: "pointer" }}
      />

      <div className="flex items-center" style={{ gap: 8 }}>
        <div className="flex items-center" style={{ gap: 4 }}>
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                dotsRef.current[i] = el;
              }}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(231,228,220,0.16)",
                transition: "transform 80ms ease",
              }}
            />
          ))}
        </div>
        <button
          onClick={tap}
          className="font-[var(--font-mono)]"
          style={{ ...chip, padding: "0 7px", letterSpacing: "0.1em" }}
        >
          TAP
        </button>
        <button
          onClick={onToggleCountIn}
          className="font-[var(--font-mono)]"
          title="Count in four beats before recording"
          style={{
            ...chip,
            padding: "0 7px",
            letterSpacing: "0.1em",
            borderColor: countInEnabled ? `${accent}60` : "rgba(231,228,220,0.12)",
            background: countInEnabled ? `${accent}12` : "rgba(255,255,255,0.02)",
            color: countInEnabled ? accent : "rgba(231,228,220,0.5)",
          }}
        >
          COUNT IN
        </button>
      </div>
    </div>
  );
}
