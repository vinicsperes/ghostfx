import { useRef, useState } from "react";
import { PRESETS, PRESET_META } from "../data/presets";
import { Popover } from "./Popover";

export function RigChip({
  presetIdx,
  onSelect,
  height = 26,
}: {
  presetIdx: number | null;
  onSelect: (idx: number) => void;
  height?: number;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const idx = presetIdx ?? 0;
  const color = PRESET_META[idx].color;

  return (
    <>
      <button
        ref={anchor}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Switch the rig without leaving the studio"
        className="font-[var(--font-mono)] flex items-center shrink-0"
        style={{
          gap: 7,
          height,
          padding: "0 8px",
          borderRadius: 6,
          border: `1px solid ${open ? color + "66" : "rgba(231,228,220,0.1)"}`,
          background: open ? `${color}14` : "rgba(255,255,255,0.02)",
          fontSize: 9.5,
          letterSpacing: "0.14em",
          color: "rgba(231,228,220,0.78)",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        {PRESETS[idx].name}
        <span style={{ fontSize: 8, opacity: 0.55 }}>▾</span>
      </button>

      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={190}>
        <div className="flex flex-col" style={{ gap: 2, padding: 4 }}>
          {PRESETS.map((preset, i) => {
            const on = i === idx;
            const tint = PRESET_META[i].color;
            return (
              <button
                key={preset.name}
                onClick={() => {
                  onSelect(i);
                  setOpen(false);
                }}
                className="font-[var(--font-mono)] flex items-center"
                style={{
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: `1px solid ${on ? tint + "4d" : "transparent"}`,
                  background: on ? `${tint}12` : "transparent",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: on ? tint : "rgba(231,228,220,0.62)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: tint,
                    boxShadow: on ? `0 0 6px ${tint}` : "none",
                  }}
                />
                {preset.name}
                <div style={{ flex: 1 }} />
                <span
                  className="font-[var(--font-mono)]"
                  style={{ fontSize: 8, opacity: 0.5, letterSpacing: "0.1em" }}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
