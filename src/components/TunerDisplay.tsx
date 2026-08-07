import { GUITAR_STRINGS } from "../audio/pitch";
import type { TunerReading } from "../hooks/useTuner";
import { isPt } from "../lib/locale";

const IN_TUNE_CENTS = 5;
const IN_TUNE = "#4ade80";
const OFF_TUNE = "#f5a33e";

const T = isPt
  ? { hint: "Toque uma corda solta", flat: "GRAVE", sharp: "AGUDO" }
  : { hint: "Play one open string", flat: "FLAT", sharp: "SHARP" };

export function TunerDisplay({
  reading,
  accent,
  size = "lg",
}: {
  reading: TunerReading;
  accent: string;
  size?: "lg" | "sm";
}) {
  const cents = reading?.cents ?? 0;
  const inTune = !!reading && Math.abs(cents) <= IN_TUNE_CENTS;
  const tone = !reading ? "rgba(231,228,220,0.28)" : inTune ? IN_TUNE : OFF_TUNE;
  const needle = Math.max(-50, Math.min(50, cents));
  const big = size === "lg";

  return (
    <div className="flex flex-col w-full" style={{ gap: big ? 14 : 10 }}>
      <div className="flex items-baseline justify-center" style={{ gap: 6, height: big ? 74 : 44 }}>
        <span
          className="font-[var(--font-display)]"
          style={{
            fontSize: big ? 66 : 38,
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
          style={{ fontSize: big ? 15 : 11, color: "rgba(231,228,220,0.38)" }}
        >
          {reading ? reading.octave : ""}
        </span>
      </div>

      <span
        className="font-[var(--font-mono)] text-center"
        style={{
          fontSize: big ? 11 : 9.5,
          fontVariantNumeric: "tabular-nums",
          color: reading ? tone : "rgba(231,228,220,0.3)",
          letterSpacing: "0.08em",
        }}
      >
        {reading ? `${cents > 0 ? "+" : ""}${cents} cents` : T.hint}
      </span>

      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
          <span
            className="font-[var(--font-mono)] uppercase"
            style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(231,228,220,0.3)" }}
          >
            {T.flat}
          </span>
          <span
            className="font-[var(--font-mono)] uppercase"
            style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(231,228,220,0.3)" }}
          >
            {T.sharp}
          </span>
        </div>
        <div
          style={{
            position: "relative",
            height: big ? 10 : 8,
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

      <div className="flex items-center" style={{ gap: 6 }}>
        {GUITAR_STRINGS.map((s) => {
          const on = reading?.midi === s.midi;
          const lit = inTune ? IN_TUNE : accent;
          return (
            <span
              key={s.label + s.midi}
              className="font-[var(--font-mono)] flex items-center justify-center"
              style={{
                flex: 1,
                fontSize: big ? 12 : 10,
                height: big ? 30 : 24,
                borderRadius: 6,
                border: `1px solid ${on ? lit + "55" : "rgba(231,228,220,0.08)"}`,
                background: on ? `${lit}14` : "rgba(255,255,255,0.02)",
                color: on ? lit : "rgba(231,228,220,0.34)",
                transition: "color 160ms, background 160ms, border-color 160ms",
              }}
            >
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
