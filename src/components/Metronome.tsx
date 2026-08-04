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

  const chip = {
    height: 30,
    minWidth: 30,
    borderRadius: 6,
    border: "1px solid rgba(231,228,220,0.12)",
    background: "rgba(255,255,255,0.02)",
    color: "rgba(231,228,220,0.62)",
    fontSize: 11,
    lineHeight: 1,
    cursor: "pointer",
  } as const;

  const transport = (
    <button
      onClick={toggle}
      aria-label={isRunning ? "Stop metronome" : "Start metronome"}
      className="flex items-center justify-center shrink-0 transition-all active:scale-90"
      style={{
        width: 38,
        height: 38,
        borderRadius: 8,
        border: `1px solid ${isRunning ? accent + "60" : "rgba(231,228,220,0.12)"}`,
        background: isRunning ? `${accent}12` : "rgba(255,255,255,0.02)",
        color: isRunning ? accent : "rgba(231,228,220,0.55)",
        cursor: "pointer",
      }}
    >
      {isRunning ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="3" width="10" height="10" rx="1.5" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
        </svg>
      )}
    </button>
  );

  const readout = (
    <div className="flex items-center" style={{ gap: 7 }}>
      <button onClick={() => setBpm(bpm - 1)} style={chip} aria-label="Slower">
        −
      </button>
      <div
        className="flex items-baseline"
        style={{ gap: 4, minWidth: 74, justifyContent: "center" }}
      >
        <span
          className="font-[var(--font-mono)]"
          style={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: "#e7e4dc",
          }}
        >
          {bpm}
        </span>
        <span
          className="font-[var(--font-mono)]"
          style={{ fontSize: 8.5, letterSpacing: "0.18em", color: "rgba(231,228,220,0.35)" }}
        >
          BPM
        </span>
      </div>
      <button onClick={() => setBpm(bpm + 1)} style={chip} aria-label="Faster">
        +
      </button>
    </div>
  );

  const beats = (
    <div className="flex items-center shrink-0" style={{ gap: 5 }}>
      {Array.from({ length: beatsPerBar }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            dotsRef.current[i] = el;
          }}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "rgba(231,228,220,0.16)",
            transition: "transform 80ms ease",
          }}
        />
      ))}
    </div>
  );

  const slider = (
    <input
      type="range"
      min={MIN_BPM}
      max={MAX_BPM}
      value={bpm}
      onChange={(e) => setBpm(Number(e.target.value))}
      aria-label="Tempo"
      style={{ flex: 1, minWidth: 90, accentColor: accent, height: 3, cursor: "pointer" }}
    />
  );

  const actions = (
    <div className="flex items-center shrink-0" style={{ gap: 7 }}>
      <button
        onClick={tap}
        className="font-[var(--font-mono)]"
        style={{ ...chip, padding: "0 10px", letterSpacing: "0.1em" }}
      >
        TAP
      </button>
      <button
        onClick={onToggleCountIn}
        className="font-[var(--font-mono)]"
        title="Count in four beats before recording"
        style={{
          ...chip,
          padding: "0 10px",
          letterSpacing: "0.1em",
          borderColor: countInEnabled ? `${accent}60` : "rgba(231,228,220,0.12)",
          background: countInEnabled ? `${accent}12` : "rgba(255,255,255,0.02)",
          color: countInEnabled ? accent : "rgba(231,228,220,0.55)",
        }}
      >
        COUNT IN
      </button>
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-col w-full" style={{ gap: 12 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 10 }}>
            {transport}
            {readout}
          </div>
          {beats}
        </div>
        {slider}
        <div className="flex items-center justify-between">{actions}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full" style={{ gap: 18 }}>
      {transport}
      {readout}
      {slider}
      {beats}
      {actions}
    </div>
  );
}
