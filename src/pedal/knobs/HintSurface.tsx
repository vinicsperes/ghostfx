import type { ReactNode } from "react";

export function HintSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none select-none"
      style={{
        whiteSpace: "nowrap",
        textAlign: "center",
        padding: "7px 13px",
        borderRadius: 7,
        fontFamily: "JetBrains Mono, monospace",
        background: "rgba(6,8,10,0.7)",
        border: "1px solid rgba(231,228,220,0.09)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
      }}
    >
      {children}
    </div>
  );
}
