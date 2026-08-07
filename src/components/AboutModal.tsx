import { useEffect } from "react";
import { PRESETS, PRESET_INFO, PRESET_META } from "../data/presets";
import { lang, setLang } from "../lib/locale";
import { PresetCurve } from "./PresetCurve";

const SHORTCUTS: [string, string][] = [
  ["1 to 6", "switch rigs"],
  ["Space", "record a take"],
  ["Drag a knob", "turn it, shift for fine"],
  ["Drag the scene", "orbit, scroll to zoom"],
];

const LANGS: { id: "en" | "pt"; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "pt", label: "PT" },
];

export function AboutModal({
  presetIdx,
  accent,
  onClose,
}: {
  presetIdx: number | null;
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

  const idx = presetIdx ?? 0;
  const info = PRESET_INFO[idx];

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center"
      style={{ padding: 16, background: "rgba(3,2,6,0.66)", backdropFilter: "blur(4px)" }}
      onPointerDown={onClose}
    >
      <div
        className="relative flex flex-col mic-card-in"
        style={{
          maxWidth: 440,
          width: "100%",
          maxHeight: "84vh",
          overflowY: "auto",
          background: "rgba(6,8,10,0.98)",
          border: "1px solid rgba(231,228,220,0.1)",
          borderRadius: 14,
          boxShadow: "0 22px 60px rgba(0,0,0,0.75)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between" style={{ padding: "20px 22px 0" }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <span
              className="font-[var(--font-display)]"
              style={{ fontSize: 22, lineHeight: 1, color: "#e7e4dc" }}
            >
              ONE PEDAL.
            </span>
            <span
              className="font-[var(--font-serif)] italic"
              style={{ fontSize: 26, lineHeight: 1, color: accent }}
            >
              six rigs.
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-[var(--font-mono)] transition-colors hover:text-white"
            style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(231,228,220,0.45)" }}
          >
            CLOSE
          </button>
        </div>

        <p
          className="font-[var(--font-mono)] leading-relaxed"
          style={{
            fontSize: 11.5,
            color: "rgba(231,228,220,0.66)",
            margin: 0,
            padding: "14px 22px 0",
          }}
        >
          A guitar effects pedal that lives in your browser. The whole signal chain is built node by
          node on the Web Audio API: drive, tone, tape echo, modulation, cabinet and reverb, with a
          zero-latency limiter on the way out. No install, no plugins, nothing uploaded anywhere.
        </p>

        <p
          className="font-[var(--font-mono)] leading-relaxed"
          style={{
            fontSize: 11.5,
            color: "rgba(231,228,220,0.66)",
            margin: 0,
            padding: "12px 22px 0",
          }}
        >
          Each rig is a different pedal inside, not a saved knob position. Switching one swaps the
          drive topology, the delay voice, the modulation circuit, the cabinet and the reverb.
          Record a take and you can hear that same performance through any of the other five.
        </p>

        <div style={{ padding: "18px 22px 0" }}>
          <div className="flex items-center" style={{ gap: 9, marginBottom: 9 }}>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8.5, letterSpacing: "0.3em", color: `${accent}99` }}
            >
              Now loaded
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(231,228,220,0.08)" }} />
          </div>
          <div
            className="flex flex-col"
            style={{
              gap: 9,
              padding: "13px 15px",
              borderRadius: 9,
              border: `1px solid ${accent}25`,
              background: `${accent}08`,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: "'Bungee', sans-serif",
                  fontSize: 14,
                  letterSpacing: "0.14em",
                  color: PRESET_META[idx].color,
                }}
              >
                {PRESETS[idx].name}
              </span>
              <PresetCurve presetIdx={idx} color={PRESET_META[idx].color} width={76} height={20} />
            </div>
            <p
              className="font-[var(--font-mono)] leading-relaxed"
              style={{ fontSize: 11, color: "rgba(231,228,220,0.62)", margin: 0 }}
            >
              {info.blurb}
            </p>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 9, letterSpacing: "0.06em", color: `${accent}bb` }}
            >
              {info.circuit}
            </span>
          </div>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          <div className="flex items-center" style={{ gap: 9, marginBottom: 9 }}>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8.5, letterSpacing: "0.3em", color: `${accent}99` }}
            >
              Shortcuts
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(231,228,220,0.08)" }} />
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            {SHORTCUTS.map(([key, what]) => (
              <div key={key} className="flex items-center justify-between">
                <span
                  className="font-[var(--font-mono)]"
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    border: "1px solid rgba(231,228,220,0.12)",
                    color: "rgba(231,228,220,0.72)",
                  }}
                >
                  {key}
                </span>
                <span
                  className="font-[var(--font-mono)]"
                  style={{ fontSize: 10.5, color: "rgba(231,228,220,0.45)" }}
                >
                  {what}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 16, gap: 10 }}>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8.5, letterSpacing: "0.3em", color: `${accent}99` }}
            >
              Language
            </span>
            <div className="flex" style={{ gap: 4 }}>
              {LANGS.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => entry.id !== lang && setLang(entry.id)}
                  aria-pressed={entry.id === lang}
                  title={entry.id === lang ? "Current language" : "Switch and reload"}
                  className="font-[var(--font-mono)]"
                  style={{
                    padding: "3px 9px",
                    borderRadius: 5,
                    border: `1px solid ${entry.id === lang ? accent + "55" : "rgba(231,228,220,0.12)"}`,
                    background: entry.id === lang ? `${accent}14` : "transparent",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    color: entry.id === lang ? accent : "rgba(231,228,220,0.5)",
                    cursor: entry.id === lang ? "default" : "pointer",
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
