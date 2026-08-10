import type { useRecorder } from "../hooks/useRecorder";
import type { SignalParams } from "../audio/chain";
import { PRESET_META } from "../data/presets";
import { ChannelStrip } from "./ChannelStrip";

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
    <div className="flex items-end shrink-0" style={{ gap: 12 }}>
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
      <button
        onClick={resetTakeParams}
        disabled={!activeEdited}
        title="Back to the rig defaults"
        className="font-[var(--font-mono)] shrink-0"
        style={{
          marginBottom: 4,
          padding: "3px 7px",
          borderRadius: 5,
          border: "1px solid rgba(231,228,220,0.12)",
          background: "rgba(255,255,255,0.02)",
          fontSize: 8.5,
          letterSpacing: "0.12em",
          color: activeEdited ? color : "rgba(231,228,220,0.28)",
          cursor: activeEdited ? "pointer" : "default",
          opacity: activeEdited ? 1 : 0.5,
        }}
      >
        RESET
      </button>
    </div>
  );
}
