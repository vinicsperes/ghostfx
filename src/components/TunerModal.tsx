import { useEffect } from "react";
import { GUITAR_STRINGS } from "../audio/pitch";
import type { TunerReading } from "../hooks/useTuner";

const IN_TUNE_CENTS = 5;
const IN_TUNE = "#4ade80";
const OFF_TUNE = "#f5a33e";

const T = navigator.language.toLowerCase().startsWith("pt")
  ? {
      badge: "AFINADOR",
      hint: "Toque uma corda solta",
      close: "FECHAR",
      flat: "GRAVE",
      sharp: "AGUDO",
    }
  : { badge: "TUNER", hint: "Play one open string", close: "CLOSE", flat: "FLAT", sharp: "SHARP" };

export function TunerModal({
  reading,
  accent,
  onClose,
}: {
  reading: TunerReading;
  accent: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cents = reading?.cents ?? 0;
  const inTune = !!reading && Math.abs(cents) <= IN_TUNE_CENTS;
  const tone = !reading ? "rgba(231,228,220,0.28)" : inTune ? IN_TUNE : OFF_TUNE;
  const needle = Math.max(-50, Math.min(50, cents));

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center"
      style={{ padding: 16, background: "rgba(3,2,6,0.62)", backdropFilter: "blur(3px)" }}
      onPointerDown={onClose}
    >
      <div
        className="relative flex flex-col mic-card-in"
        style={{
          maxWidth: 380,
          width: "100%",
          background: "rgba(6,8,10,0.98)",
          border: `1px solid ${accent}35`,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: `0 22px 60px rgba(0,0,0,0.75), 0 0 60px ${accent}12`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent 5%, ${tone}cc 40%, ${tone}cc 60%, transparent 95%)`,
            transition: "background 200ms",
          }}
        />

        <div className="flex items-center justify-between" style={{ padding: "14px 18px 0" }}>
          <span
            className="font-[var(--font-mono)] uppercase"
            style={{ fontSize: 9, letterSpacing: "0.3em", color: `${accent}99` }}
          >
            {T.badge}
          </span>
          <button
            onClick={onClose}
            className="font-[var(--font-mono)] transition-colors hover:text-white"
            style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(231,228,220,0.45)" }}
          >
            {T.close}
          </button>
        </div>

        <div className="flex flex-col items-center" style={{ padding: "10px 22px 6px" }}>
          <div className="flex items-baseline" style={{ gap: 6, height: 74 }}>
            <span
              className="font-[var(--font-display)]"
              style={{
                fontSize: 66,
                lineHeight: 1,
                color: tone,
                textShadow: reading ? `0 0 30px ${tone}55` : "none",
                transition: "color 160ms",
              }}
            >
              {reading ? reading.name : "--"}
            </span>
            <span
              className="font-[var(--font-mono)]"
              style={{ fontSize: 15, color: "rgba(231,228,220,0.38)" }}
            >
              {reading ? reading.octave : ""}
            </span>
          </div>

          <span
            className="font-[var(--font-mono)]"
            style={{
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
              color: reading ? tone : "rgba(231,228,220,0.3)",
              letterSpacing: "0.08em",
            }}
          >
            {reading ? `${cents > 0 ? "+" : ""}${cents} cents` : T.hint}
          </span>
        </div>

        <div style={{ padding: "14px 22px 0" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(231,228,220,0.32)" }}
            >
              {T.flat}
            </span>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(231,228,220,0.32)" }}
            >
              {T.sharp}
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 10,
              borderRadius: 5,
              background: "rgba(231,228,220,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: `${50 - (IN_TUNE_CENTS / 50) * 50}%`,
                width: `${(IN_TUNE_CENTS / 50) * 100}%`,
                top: 0,
                bottom: 0,
                background: `${IN_TUNE}1f`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 1,
                background: "rgba(231,228,220,0.32)",
              }}
            />
            {reading && (
              <div
                style={{
                  position: "absolute",
                  left: `calc(50% + ${needle}%)`,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  marginLeft: -2,
                  borderRadius: 2,
                  background: tone,
                  boxShadow: `0 0 12px ${tone}`,
                  transition: "left 90ms linear, background 160ms",
                }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 6, padding: "16px 22px 20px" }}>
          {GUITAR_STRINGS.map((s) => {
            const on = reading?.midi === s.midi;
            return (
              <span
                key={s.label + s.midi}
                className="font-[var(--font-mono)] flex items-center justify-center"
                style={{
                  flex: 1,
                  fontSize: 12,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${on ? (inTune ? IN_TUNE : accent) + "55" : "rgba(231,228,220,0.08)"}`,
                  background: on ? `${inTune ? IN_TUNE : accent}14` : "rgba(255,255,255,0.02)",
                  color: on ? (inTune ? IN_TUNE : accent) : "rgba(231,228,220,0.34)",
                  transition: "color 160ms, background 160ms, border-color 160ms",
                }}
              >
                {s.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
