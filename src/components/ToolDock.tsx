import { useRef, useState } from "react";
import { Popover } from "./Popover";
import type { ToolId } from "./Console";
import type { ReactNode } from "react";

function GearIcon({ open }: { open: boolean }) {
  const teeth = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 420ms cubic-bezier(0.34, 1.4, 0.5, 1)",
      }}
    >
      {teeth.map((deg) => (
        <rect
          key={deg}
          x="10.6"
          y="1.4"
          width="2.8"
          height="4.4"
          rx="0.7"
          fill="currentColor"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="7.1" fill="currentColor" />
      <circle cx="12" cy="12" r="3.1" fill="#0a0c0f" />
    </svg>
  );
}

export function ToolDock({
  tools,
  activeTool,
  onToolChange,
  accent,
}: {
  tools: { id: ToolId; label: string; icon: ReactNode; title: string }[];
  activeTool: ToolId | null;
  onToolChange: (tool: ToolId | null) => void;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchor}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
        aria-label="Tools"
        aria-expanded={open}
        title="Tools"
        className="tool-gear flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          border: `1px solid ${open ? accent + "4d" : "transparent"}`,
          background: open ? `${accent}12` : "transparent",
          color: open || activeTool ? accent : "rgba(231,228,220,0.42)",
          cursor: "pointer",
        }}
      >
        <GearIcon open={open} />
      </button>

      <Popover
        anchorRef={anchor}
        open={open}
        onClose={() => setOpen(false)}
        align="right"
        width={176}
      >
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setOpen(false);
              onToolChange(activeTool === t.id ? null : t.id);
            }}
            title={t.title}
            className="font-[var(--font-mono)] flex items-center w-full"
            style={{
              gap: 11,
              padding: "9px 10px",
              borderRadius: 7,
              fontSize: 10.5,
              letterSpacing: "0.1em",
              color: activeTool === t.id ? accent : "rgba(231,228,220,0.7)",
              background: activeTool === t.id ? `${accent}14` : "transparent",
              cursor: "pointer",
            }}
          >
            <span className="flex items-center justify-center" style={{ width: 22 }}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </Popover>
    </>
  );
}
