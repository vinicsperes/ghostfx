import { useRef } from "react";
import type { TunerReading } from "../hooks/useTuner";
import { Popover } from "./Popover";
import { TunerDisplay } from "./TunerDisplay";
import { ForkIcon } from "./ToolIcons";

export function TunerChip({
  reading,
  open,
  onOpenChange,
  accent,
  height = 32,
}: {
  reading: TunerReading;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  accent: string;
  height?: number;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const lit = open || !!reading;

  return (
    <>
      <button
        ref={anchor}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        title="Tuner"
        className="font-[var(--font-mono)] flex items-center justify-center shrink-0"
        style={{
          gap: 6,
          height,
          padding: "0 10px",
          borderRadius: 6,
          border: `1px solid ${lit ? accent + "55" : "rgba(231,228,220,0.1)"}`,
          background: lit ? `${accent}12` : "rgba(255,255,255,0.02)",
          fontSize: 9.5,
          letterSpacing: "0.14em",
          color: lit ? accent : "rgba(231,228,220,0.62)",
          cursor: "pointer",
        }}
      >
        <span style={{ lineHeight: 0, opacity: lit ? 1 : 0.6 }}>
          <ForkIcon />
        </span>
        TUNE
      </button>

      <Popover anchorRef={anchor} open={open} onClose={() => onOpenChange(false)} width={340}>
        <div style={{ padding: "10px 12px 12px" }}>
          <TunerDisplay reading={reading} accent={accent} size="sm" />
        </div>
      </Popover>
    </>
  );
}
