import GhostMark from "../GhostMark";
import { PRESETS, PRESET_META } from "../data/presets";
import { PresetCard } from "./PresetCard";

export function TopBar({
  activePresetIdx,
  onPresetSelect,
  onOpenAbout,
  accent,
  ledColor,
  statusLabel,
  live,
}: {
  activePresetIdx: number | null;
  onPresetSelect: (i: number) => void;
  onOpenAbout: () => void;
  accent: string;
  ledColor: string;
  statusLabel: string;
  live: boolean;
}) {
  return (
    <div
      className="hidden lg:flex fixed top-0 left-0 right-0 z-[40] pointer-events-auto items-center"
      style={{
        gap: 18,
        padding: "12px max(22px,1.8vw)",
        background: "linear-gradient(180deg, rgba(4,6,8,0.92) 55%, rgba(4,6,8,0) 100%)",
      }}
    >
      <button
        onClick={onOpenAbout}
        className="flex items-center shrink-0"
        style={{ gap: 9, cursor: "pointer" }}
        title="About GHOSTFX"
        aria-label="About GHOSTFX"
      >
        <GhostMark variant="solid" size={22} color="#e7e4dc" ledColor={accent} />
        <span
          style={{
            fontFamily: "'Saira', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: "#e7e4dc",
          }}
        >
          GHOST<span style={{ color: accent }}>FX</span>
        </span>
      </button>

      <div style={{ width: 1, height: 22, background: "rgba(231,228,220,0.1)" }} />

      <div className="flex flex-1 items-stretch" style={{ gap: 8 }}>
        {PRESETS.map((p, i) => (
          <PresetCard
            key={p.name}
            name={p.name}
            color={PRESET_META[i].color}
            isActive={activePresetIdx === i}
            onSelect={() => onPresetSelect(i)}
          />
        ))}
      </div>

      <div
        className="flex items-center shrink-0"
        style={{
          gap: 7,
          padding: "5px 11px",
          borderRadius: 999,
          border: "1px solid rgba(231,228,220,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span
          className={live ? "animate-pulse" : ""}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: ledColor,
            boxShadow: live ? `0 0 8px ${ledColor}` : "none",
          }}
        />
        <span
          className="font-[var(--font-mono)] uppercase"
          style={{ fontSize: 8.5, letterSpacing: "0.18em", color: "rgba(231,228,220,0.55)" }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
