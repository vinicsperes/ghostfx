import type { CSSProperties, ReactNode } from "react";

export function Surface({
  children,
  grow = false,
  lit = false,
  accent,
  style,
}: {
  children: ReactNode;
  grow?: boolean;
  lit?: boolean;
  accent?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="pointer-events-auto"
      style={{
        flex: grow ? "1 1 0" : "0 0 auto",
        minWidth: 0,
        padding: "13px 16px 15px",
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(18,20,24,0.52) 0%, rgba(8,10,13,0.62) 100%)",
        backdropFilter: "blur(22px) saturate(150%)",
        WebkitBackdropFilter: "blur(22px) saturate(150%)",
        border: `1px solid ${lit && accent ? accent + "55" : "rgba(231,228,220,0.12)"}`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
        transition: "border-color 200ms",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
