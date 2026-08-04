import type { ReactNode } from "react";

export function ToolButton({
  label,
  icon,
  accent,
  active = false,
  onClick,
  title,
}: {
  label: string;
  icon: ReactNode;
  accent: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={title ?? label}
      className="flex flex-col items-center justify-center shrink-0 transition-all active:scale-95"
      style={{
        width: 70,
        height: 66,
        gap: 6,
        borderRadius: 8,
        border: `1px solid ${active ? accent + "55" : "rgba(231,228,220,0.1)"}`,
        background: active ? `${accent}12` : "rgba(255,255,255,0.02)",
        color: active ? accent : accent,
        cursor: "pointer",
      }}
    >
      {icon}
      <span
        className="font-[var(--font-mono)]"
        style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(231,228,220,0.5)" }}
      >
        {label}
      </span>
    </button>
  );
}
