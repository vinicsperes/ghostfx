import type { ReactNode } from "react";
import { Metronome } from "./Metronome";
import { RecorderControls } from "./RecorderControls";
import { TunerButton } from "./TunerButton";
import { PanelLabel } from "./PanelLabel";
import { ChannelStrip } from "./ChannelStrip";
import type { useMetronome } from "../hooks/useMetronome";
import type { useRecorder } from "../hooks/useRecorder";

function Section({
  label,
  grow = false,
  children,
}: {
  label: string;
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col justify-end"
      style={{ gap: 9, flex: grow ? "1 1 0" : "0 0 auto", minWidth: 0 }}
    >
      <PanelLabel>{label}</PanelLabel>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "rgba(231,228,220,0.08)" }} />;
}

export type KnobId = "drive" | "echo" | "tone" | "reverb" | "mod" | "master";

const STRIPS: { id: KnobId; label: string }[] = [
  { id: "drive", label: "DRV" },
  { id: "echo", label: "ECHO" },
  { id: "tone", label: "TONE" },
  { id: "reverb", label: "RVB" },
  { id: "mod", label: "MOD" },
  { id: "master", label: "VOL" },
];

export function Console({
  recorder,
  metronome,
  levels,
  onKnobChange,
  onOpenTuner,
  keyboardMode,
  onToggleKeyboard,
  countInEnabled,
  onToggleCountIn,
  onRecord,
  getLevelRef,
  accent,
}: {
  recorder: ReturnType<typeof useRecorder>;
  metronome: ReturnType<typeof useMetronome>;
  levels: Record<KnobId, number>;
  onKnobChange: (id: KnobId, value: number) => void;
  onOpenTuner: () => void;
  keyboardMode: boolean;
  onToggleKeyboard: () => void;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  onRecord: () => void;
  getLevelRef: { current: (() => number) | null };
  accent: string;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: 13 }}>
      <div className="flex items-stretch w-full" style={{ gap: 20 }}>
        <Section label="Signal">
          <div className="flex items-end" style={{ gap: 4 }}>
            {STRIPS.map((s) => (
              <ChannelStrip
                key={s.id}
                label={s.label}
                value={levels[s.id]}
                accent={accent}
                highlight={s.id === "master"}
                onChange={(v) => onKnobChange(s.id, v)}
              />
            ))}
          </div>
        </Section>

        <Divider />

        <Section label="Tools">
          <div className="flex items-end" style={{ gap: 8 }}>
            <TunerButton onOpen={onOpenTuner} accent={accent} />
            <button
              onClick={onToggleKeyboard}
              aria-pressed={keyboardMode}
              title="Play the built-in synth with your keyboard"
              className="flex flex-col items-center justify-center transition-all active:scale-95"
              style={{
                width: 74,
                height: 92,
                gap: 8,
                borderRadius: 8,
                border: `1px solid ${keyboardMode ? accent + "55" : "rgba(231,228,220,0.1)"}`,
                background: keyboardMode ? `${accent}12` : "rgba(255,255,255,0.02)",
                color: keyboardMode ? accent : "rgba(231,228,220,0.5)",
                cursor: "pointer",
              }}
            >
              <svg width="26" height="19" viewBox="0 0 22 16" fill="none">
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
                <line
                  x1="13.2"
                  y1="0.7"
                  x2="13.2"
                  y2="15.3"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <line
                  x1="17.5"
                  y1="0.7"
                  x2="17.5"
                  y2="15.3"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <rect x="2.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
                <rect x="11.4" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
                <rect x="15.7" y="0.7" width="3.6" height="9.2" rx="0.8" fill="currentColor" />
              </svg>
              <span
                className="font-[var(--font-mono)]"
                style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(231,228,220,0.5)" }}
              >
                SYNTH
              </span>
            </button>
          </div>
        </Section>

        <Divider />

        <Section label="Tempo" grow>
          <Metronome
            metronome={metronome}
            countInEnabled={countInEnabled}
            onToggleCountIn={onToggleCountIn}
            accent={accent}
          />
        </Section>
      </div>

      <div style={{ height: 1, background: "rgba(231,228,220,0.07)" }} />

      <Section label={metronome.countingIn ? "Counting in" : "Recorder"} grow>
        <RecorderControls
          recorder={recorder}
          onRecord={onRecord}
          getLevelRef={getLevelRef}
          accent={accent}
          countingIn={metronome.countingIn}
        />
      </Section>
    </div>
  );
}
