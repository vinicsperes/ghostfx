import type { useRecorder } from "../hooks/useRecorder";
import type { SignalParams } from "../audio/chain";
import { PRESETS, PRESET_META } from "../data/presets";
import { Fader } from "./Fader";
import { PanelLabel } from "./PanelLabel";

const STRIPS: { id: keyof SignalParams; label: string }[] = [
  { id: "drive", label: "DRIVE" },
  { id: "echo", label: "ECHO" },
  { id: "tone", label: "TONE" },
  { id: "reverb", label: "REVERB" },
  { id: "mod", label: "MOD" },
];

export function TakeSignal({ recorder }: { recorder: ReturnType<typeof useRecorder> }) {
  const { activeTake, activeRig, activeParams, activeEdited, setTakeParam, resetTakeParams } =
    recorder;

  if (!activeTake) return null;

  const color = PRESET_META[activeRig].color;

  return (
    <div className="flex flex-col" style={{ gap: 4, padding: "4px 8px 8px" }}>
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <PanelLabel>{`Signal · ${PRESETS[activeRig].name}`}</PanelLabel>
        <button
          onClick={resetTakeParams}
          disabled={!activeEdited}
          title="Back to the rig defaults"
          className="font-[var(--font-mono)]"
          style={{
            padding: "3px 7px",
            borderRadius: 5,
            border: "1px solid rgba(231,228,220,0.12)",
            background: "rgba(255,255,255,0.02)",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: activeEdited ? color : "rgba(231,228,220,0.3)",
            cursor: activeEdited ? "pointer" : "default",
            opacity: activeEdited ? 1 : 0.5,
          }}
        >
          RESET
        </button>
      </div>

      {STRIPS.map((strip) => (
        <Fader
          key={strip.id}
          label={strip.label}
          value={activeParams[strip.id]}
          accent={color}
          onChange={(v) => setTakeParam(strip.id, v)}
        />
      ))}

      <span
        className="font-[var(--font-mono)]"
        style={{ fontSize: 9, color: "rgba(231,228,220,0.32)", lineHeight: 1.5 }}
      >
        runs the take through the rig live, and the download follows it
      </span>
    </div>
  );
}
