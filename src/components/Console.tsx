import { RecorderControls } from "./RecorderControls";
import { PanelLabel } from "./PanelLabel";
import { ToolButton } from "./ToolButton";
import { ToolTray } from "./ToolTray";
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

function FaderIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
      {[4, 12, 20].map((x, i) => (
        <g key={x}>
          <line
            x1={x}
            y1="2"
            x2={x}
            y2="18"
            stroke="currentColor"
            strokeWidth="1.3"
            opacity="0.4"
          />
          <rect x={x - 3.5} y={[11, 5, 8][i]} width="7" height="3.4" rx="1" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 3v7a4 4 0 0 0 4 4v7m4-18v7a4 4 0 0 1-4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KeysIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 22 16" fill="none">
      <rect
        x="0.7"
        y="0.7"
        width="20.6"
        height="14.6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <line x1="4.5" y1="0.7" x2="4.5" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <line x1="8.8" y1="0.7" x2="8.8" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <line x1="13.2" y1="0.7" x2="13.2" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <line x1="17.5" y1="0.7" x2="17.5" y2="15.3" stroke="currentColor" strokeWidth="1" />
      <rect x="2.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
      <rect x="11.4" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
      <rect x="15.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function TempoIcon({ running }: { running: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 3h6l4 18H5L9 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line
        x1="12"
        y1="19"
        x2={running ? 16 : 8}
        y2="7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ transition: "all 200ms" }}
      />
    </svg>
  );
}

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
  const toggle = (tool: ToolId) => onToolChange(activeTool === tool ? null : tool);
  return (
    <div className="flex flex-col w-full" style={{ gap: 13 }}>
      {activeTool && (
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
      )}

      <div className="flex items-start w-full" style={{ gap: 20 }}>
        <div className="flex flex-col" style={{ gap: 9 }}>
          <PanelLabel>Tools</PanelLabel>
          <div className="flex items-end" style={{ gap: 8 }}>
            <ToolButton
              label="MIX"
              icon={<FaderIcon />}
              accent={accent}
              active={activeTool === "mix"}
              onClick={() => toggle("mix")}
              title="Signal faders"
            />
            <ToolButton
              label="TUNE"
              icon={<ForkIcon />}
              accent={accent}
              active={activeTool === "tune"}
              onClick={() => toggle("tune")}
              title="Tuner"
            />
            <ToolButton
              label="SYNTH"
              icon={<KeysIcon />}
              accent={accent}
              active={activeTool === "synth"}
              onClick={() => toggle("synth")}
              title="Play the built-in synth with your keyboard"
            />
            <ToolButton
              label={String(metronome.bpm)}
              icon={<TempoIcon running={metronome.isRunning} />}
              accent={accent}
              active={activeTool === "tempo" || metronome.isRunning || metronome.countingIn}
              onClick={() => toggle("tempo")}
              title="Tempo and count-in"
            />
          </div>
        </div>

        <div style={{ width: 1, alignSelf: "stretch", background: "rgba(231,228,220,0.07)" }} />

        <div className="flex flex-col" style={{ gap: 9, flex: "1 1 0", minWidth: 0 }}>
          <PanelLabel>{metronome.countingIn ? "Counting in" : "Recorder"}</PanelLabel>
          <RecorderControls
            recorder={recorder}
            onRecord={onRecord}
            getLevelRef={getLevelRef}
            accent={accent}
            countingIn={metronome.countingIn}
          />
        </div>
      </div>
    </div>
  );
}
