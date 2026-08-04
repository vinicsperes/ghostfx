import type { ReactNode } from "react";
import { Metronome } from "./Metronome";
import { RecorderControls } from "./RecorderControls";
import { TunerButton } from "./TunerButton";
import { PanelLabel } from "./PanelLabel";
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

export function Console({
  recorder,
  metronome,
  onOpenTuner,
  countInEnabled,
  onToggleCountIn,
  onRecord,
  getLevelRef,
  accent,
}: {
  recorder: ReturnType<typeof useRecorder>;
  metronome: ReturnType<typeof useMetronome>;
  onOpenTuner: () => void;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  onRecord: () => void;
  getLevelRef: { current: (() => number) | null };
  accent: string;
}) {
  return (
    <div className="flex items-stretch w-full" style={{ gap: 18 }}>
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
