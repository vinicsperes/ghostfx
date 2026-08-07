import { useRef, useState } from "react";
import type { useMetronome } from "../hooks/useMetronome";
import { Metronome } from "./Metronome";
import { TempoIcon } from "./ToolIcons";
import { Popover } from "./Popover";

export function TempoChip({
  metronome,
  countInEnabled,
  onToggleCountIn,
  accent,
  height = 30,
}: {
  metronome: ReturnType<typeof useMetronome>;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  accent: string;
  height?: number;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const on = metronome.isRunning || countInEnabled;

  return (
    <>
      <button
        ref={anchor}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Tempo, click and count-in"
        className="font-[var(--font-mono)] flex items-center justify-center shrink-0"
        style={{
          gap: 5,
          minWidth: 62,
          height,
          padding: "0 8px",
          borderRadius: 6,
          border: `1px solid ${open || on ? accent + "55" : "rgba(231,228,220,0.1)"}`,
          background: open || on ? `${accent}12` : "rgba(255,255,255,0.02)",
          fontSize: 10.5,
          fontVariantNumeric: "tabular-nums",
          color: on ? accent : "rgba(231,228,220,0.62)",
          cursor: "pointer",
        }}
      >
        <span
          className={metronome.isRunning ? "animate-pulse" : ""}
          style={{ lineHeight: 0, opacity: on ? 1 : 0.6 }}
        >
          <TempoIcon running={metronome.isRunning} />
        </span>
        {metronome.bpm}
      </button>

      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={330}>
        <div style={{ padding: "8px 10px 10px" }}>
          <Metronome
            metronome={metronome}
            countInEnabled={countInEnabled}
            onToggleCountIn={onToggleCountIn}
            accent={accent}
            compact
          />
        </div>
      </Popover>
    </>
  );
}
