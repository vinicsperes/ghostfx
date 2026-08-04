import type { ReactNode } from "react";

export function ToolTray({
  title,
  accent,
  onClose,
  children,
}: {
  title: string;
  accent: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="tool-tray-in flex flex-col w-full"
      style={{
        gap: 12,
        padding: "13px 16px 15px",
        borderRadius: 12,
        border: `1px solid ${accent}22`,
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-[var(--font-mono)] uppercase"
          style={{ fontSize: 8.5, letterSpacing: "0.3em", color: `${accent}99` }}
        >
          {title}
        </span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="font-[var(--font-mono)] transition-colors hover:text-white"
          style={{ fontSize: 12, lineHeight: 1, color: "rgba(231,228,220,0.4)", cursor: "pointer" }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}
