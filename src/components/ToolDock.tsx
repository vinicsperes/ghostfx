import { useEffect, useRef, useState } from "react";
import { ToolButton } from "./ToolButton";
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
  placement = "up",
}: {
  tools: { id: ToolId; label: string; icon: ReactNode; title: string }[];
  activeTool: ToolId | null;
  onToolChange: (tool: ToolId | null) => void;
  accent: string;
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center pointer-events-auto shrink-0"
    >
      {open && (
        <div
          className="absolute"
          style={
            placement === "up"
              ? { bottom: "calc(100% + 10px)", right: 0 }
              : { top: "calc(100% + 10px)", right: 0 }
          }
        >
          <div
            style={{
              padding: 8,
              borderRadius: 14,
              background: "rgba(8,10,13,0.985)",
              border: `1px solid ${accent}22`,
              boxShadow: "0 18px 44px rgba(0,0,0,0.72)",
            }}
          >
            <div className="flex items-end" style={{ gap: 8 }}>
              {tools.map((t) => (
                <ToolButton
                  key={t.id}
                  label={t.label}
                  icon={t.icon}
                  accent={accent}
                  active={activeTool === t.id}
                  title={t.title}
                  onClick={() => {
                    setOpen(false);
                    onToolChange(activeTool === t.id ? null : t.id);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <button
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
    </div>
  );
}
