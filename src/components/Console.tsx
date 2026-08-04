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
  accent,
  grow = false,
  children,
}: {
  label: string;
  accent: string;
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 7, flex: grow ? "1 1 0" : "0 0 auto", minWidth: 0 }}
    >
      <PanelLabel accent={accent}>{label}</PanelLabel>
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
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  onRecord: () => void;
  getLevelRef: { current: (() => number) | null };
  accent: string;
}) {
  return (
    <div className="flex items-stretch w-full" style={{ gap: 18 }}>
      <Section label="Signal" accent={accent}>
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

      <Section label="Tuner" accent={accent}>
        <TunerButton onOpen={onOpenTuner} accent={accent} />
      </Section>

      <Divider />

      <Section label="Tempo" accent={accent}>
        <Metronome
          metronome={metronome}
          countInEnabled={countInEnabled}
          onToggleCountIn={onToggleCountIn}
          accent={accent}
        />
      </Section>

      <Divider />

      <Section label={metronome.countingIn ? "Counting in" : "Recorder"} accent={accent} grow>
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
