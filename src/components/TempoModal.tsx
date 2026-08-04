import { useEffect } from "react";
import { Metronome } from "./Metronome";
import { ToolPanel } from "./ToolPanel";
import type { useMetronome } from "../hooks/useMetronome";

export function TempoModal({
  metronome,
  countInEnabled,
  onToggleCountIn,
  accent,
  onClose,
}: {
  metronome: ReturnType<typeof useMetronome>;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
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

  return (
    <ToolPanel title="Tempo" accent={accent} onClose={onClose} width={320}>
      <div style={{ padding: "16px 20px 20px" }}>
        <Metronome
          metronome={metronome}
          countInEnabled={countInEnabled}
          onToggleCountIn={onToggleCountIn}
          accent={accent}
          compact
        />
      </div>
    </ToolPanel>
  );
}
