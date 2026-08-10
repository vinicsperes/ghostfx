import type { useRecorder } from "../hooks/useRecorder";
import type { SignalParams } from "../audio/chain";
import { PRESET_META } from "../data/presets";
import { ChannelStrip } from "./ChannelStrip";
import { PanelLabel } from "./PanelLabel";

const STRIPS: { id: keyof SignalParams; label: string }[] = [
  { id: "drive", label: "DRV" },
  { id: "echo", label: "ECHO" },
  { id: "tone", label: "TONE" },
  { id: "reverb", label: "RVB" },
  { id: "mod", label: "MOD" },
];

export function TakeSignal({
  recorder,
  height = 92,
}: {
  recorder: ReturnType<typeof useRecorder>;
  height?: number;
}) {
  const { activeTake, activeRig, activeParams, activeEdited, setTakeParam, resetTakeParams } =
    recorder;

  if (!activeTake) return null;

  const color = PRESET_META[activeRig].color;

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        gap: 8,
        padding: "8px 10px 10px",
        borderRadius: 10,
        border: "1px solid rgba(231,228,220,0.08)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <PanelLabel>Signal</PanelLabel>
        <div style={{ flex: 1 }} />
        <button
          onClick={resetTakeParams}
          disabled={!activeEdited}
          title="Back to the rig defaults"
          className="font-[var(--font-mono)] shrink-0"
          style={{
            padding: "2px 7px",
            borderRadius: 5,
            border: `1px solid ${activeEdited ? color + "44" : "rgba(231,228,220,0.1)"}`,
            background: activeEdited ? `${color}12` : "transparent",
            fontSize: 8,
            letterSpacing: "0.14em",
            color: activeEdited ? color : "rgba(231,228,220,0.28)",
            cursor: activeEdited ? "pointer" : "default",
          }}
        >
          RESET
        </button>
      </div>

      <div className="flex items-end" style={{ gap: 12 }}>
        {STRIPS.map((strip) => (
          <ChannelStrip
            key={strip.id}
            label={strip.label}
            value={activeParams[strip.id]}
            accent={color}
            onChange={(v) => setTakeParam(strip.id, v)}
            height={height}
          />
        ))}
      </div>
    </div>
  );
}
