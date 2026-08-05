import { RecorderControls } from "./RecorderControls";
import { PanelLabel } from "./PanelLabel";
import { ToolTray } from "./ToolTray";
import { Surface } from "./Surface";
import { ChannelStrip } from "./ChannelStrip";
import { Metronome } from "./Metronome";
import { TunerDisplay } from "./TunerDisplay";
import { KeyboardDisplay } from "./KeyboardDisplay";
import type { useMetronome } from "../hooks/useMetronome";
import type { useRecorder } from "../hooks/useRecorder";
import type { useSynth } from "../hooks/useSynth";
import type { TunerReading } from "../hooks/useTuner";

export type ToolId = "mix" | "tune" | "synth" | "tempo";
export type KnobId = "drive" | "echo" | "tone" | "reverb" | "mod" | "master";

const STRIPS: { id: KnobId; label: string }[] = [
  { id: "drive", label: "DRV" },
  { id: "echo", label: "ECHO" },
  { id: "tone", label: "TONE" },
  { id: "reverb", label: "RVB" },
  { id: "mod", label: "MOD" },
  { id: "master", label: "VOL" },
];

const TITLES: Record<ToolId, string> = {
  mix: "Signal",
  tune: "Tuner",
  synth: "Keyboard synth",
  tempo: "Tempo",
};

export function Console({
  recorder,
  metronome,
  synth,
  tuning,
  levels,
  onKnobChange,
  activeTool,
  onToolChange,
  countInEnabled,
  onToggleCountIn,
  onRecord,
  getLevelRef,
  accent,
}: {
  recorder: ReturnType<typeof useRecorder>;
  metronome: ReturnType<typeof useMetronome>;
  synth: ReturnType<typeof useSynth>;
  tuning: TunerReading;
  levels: Record<KnobId, number>;
  onKnobChange: (id: KnobId, value: number) => void;
  activeTool: ToolId | null;
  onToolChange: (tool: ToolId | null) => void;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  onRecord: () => void;
  getLevelRef: { current: (() => number) | null };
  accent: string;
}) {
  return (
    <div className="flex flex-col w-full pointer-events-none" style={{ gap: 10 }}>
      {activeTool && (
        <Surface accent={accent}>
          <ToolTray title={TITLES[activeTool]} accent={accent} onClose={() => onToolChange(null)}>
            {activeTool === "mix" && (
              <div className="flex items-end justify-center" style={{ gap: 14 }}>
                {STRIPS.map((s) => (
                  <ChannelStrip
                    key={s.id}
                    label={s.label}
                    value={levels[s.id]}
                    accent={accent}
                    highlight={s.id === "master"}
                    onChange={(v) => onKnobChange(s.id, v)}
                    height={112}
                  />
                ))}
              </div>
            )}
            {activeTool === "tune" && (
              <div className="self-center w-full" style={{ maxWidth: 380 }}>
                <TunerDisplay reading={tuning} accent={accent} size="sm" />
              </div>
            )}
            {activeTool === "tempo" && (
              <div className="w-full">
                <Metronome
                  metronome={metronome}
                  countInEnabled={countInEnabled}
                  onToggleCountIn={onToggleCountIn}
                  accent={accent}
                />
              </div>
            )}
            {activeTool === "synth" && (
              <div className="self-center w-full" style={{ maxWidth: 620 }}>
                <KeyboardDisplay
                  activeKeys={synth.activeKeys}
                  accent={accent}
                  playNote={synth.playNote}
                  stopNote={synth.stopNote}
                  labelMode="key"
                />
              </div>
            )}
          </ToolTray>
        </Surface>
      )}

      <div className="flex items-stretch w-full" style={{ gap: 10 }}>
        <Surface grow lit={recorder.isRecording || metronome.countingIn} accent={accent}>
          <div className="flex flex-col" style={{ gap: 9, minWidth: 0 }}>
            <PanelLabel>{metronome.countingIn ? "Counting in" : "Recorder"}</PanelLabel>
            <RecorderControls
              recorder={recorder}
              onRecord={onRecord}
              getLevelRef={getLevelRef}
              accent={accent}
              countingIn={metronome.countingIn}
            />
          </div>
        </Surface>
      </div>
    </div>
  );
}
