export function PanelLabel({ children, accent }: { children: string; accent: string }) {
  return (
    <span
      className="font-[var(--font-mono)] uppercase"
      style={{ fontSize: 8.5, letterSpacing: "0.3em", color: `${accent}88` }}
    >
      {children}
    </span>
  );
}
