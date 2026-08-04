import type { ReactNode } from "react";

export function ToolPanel({
  title,
  accent,
  onClose,
  width = 360,
  children,
}: {
  title: string;
  accent: string;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center"
      style={{ padding: 16, background: "rgba(3,2,6,0.62)", backdropFilter: "blur(3px)" }}
      onPointerDown={onClose}
    >
      <div
        className="relative flex flex-col mic-card-in"
        style={{
          maxWidth: width,
          width: "100%",
          background: "rgba(6,8,10,0.98)",
          border: `1px solid ${accent}30`,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: `0 22px 60px rgba(0,0,0,0.75), 0 0 60px ${accent}10`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent 5%, ${accent}cc 40%, ${accent}cc 60%, transparent 95%)`,
          }}
        />
        <div className="flex items-center justify-between" style={{ padding: "14px 18px 0" }}>
          <span
            className="font-[var(--font-mono)] uppercase"
            style={{ fontSize: 9, letterSpacing: "0.3em", color: `${accent}99` }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            className="font-[var(--font-mono)] transition-colors hover:text-white"
            style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(231,228,220,0.45)" }}
          >
            CLOSE
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
