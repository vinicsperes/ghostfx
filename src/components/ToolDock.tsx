import { useEffect, useRef, useState } from "react";
import { ToolButton } from "./ToolButton";
import { Surface } from "./Surface";
import type { ToolId } from "./Console";
import type { ReactNode } from "react";

function GearIcon({ open }: { open: boolean }) {
  const teeth = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: open ? "rotate(45deg)" : "none", transition: "transform 300ms" }}
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
          <Surface style={{ padding: 10 }}>
            <div className="flex items-end" style={{ gap: 8 }}>
              {tools.map((t) => (
                <ToolButton
                  key={t.id}
                  label={t.label}
                  icon={t.icon}
                  accent={accent}
                  active={activeTool === t.id}
                  title={t.title}
                  onClick={() => onToolChange(activeTool === t.id ? null : t.id)}
                />
              ))}
            </div>
          </Surface>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tools"
        aria-expanded={open}
        title="Tools"
        className="flex items-center justify-center transition-all active:scale-90"
        style={{
          width: placement === "up" ? 52 : 38,
          height: placement === "up" ? 52 : 38,
          borderRadius: placement === "up" ? 16 : 10,
          border: `1px solid ${open || activeTool ? accent + "55" : "rgba(231,228,220,0.12)"}`,
          background: "linear-gradient(180deg, rgba(18,20,24,0.6) 0%, rgba(8,10,13,0.7) 100%)",
          backdropFilter: "blur(22px) saturate(150%)",
          WebkitBackdropFilter: "blur(22px) saturate(150%)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
          color: open || activeTool ? accent : "rgba(231,228,220,0.6)",
          cursor: "pointer",
        }}
      >
        <GearIcon open={open} />
      </button>
    </div>
  );
}
