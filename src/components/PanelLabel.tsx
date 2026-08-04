export function PanelLabel({ children }: { children: string; accent?: string }) {
  return (
    <span
      className="font-[var(--font-mono)] uppercase"
      style={{ fontSize: 8.5, letterSpacing: "0.3em", color: "rgba(231,228,220,0.34)" }}
    >
      {children}
    </span>
  );
}
