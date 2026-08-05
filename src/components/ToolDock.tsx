import { useEffect, useRef, useState } from "react";
import { ToolButton } from "./ToolButton";
import { Surface } from "./Surface";
import type { ToolId } from "./Console";
import type { ReactNode } from "react";

function GearIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: open ? "rotate(60deg)" : "none", transition: "transform 260ms" }}
    >
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.6v2.2m0 14.4v2.2M21.4 12h-2.2M4.8 12H2.6m14.7-6.6-1.6 1.6M8.1 15.9l-1.6 1.6m10.8 0-1.6-1.6M8.1 8.1 6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
    <div ref={ref} className="flex flex-col items-end pointer-events-auto" style={{ gap: 10 }}>
      {open && (
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
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tools"
        aria-expanded={open}
        title="Tools"
        className="flex items-center justify-center transition-all active:scale-90"
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
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
