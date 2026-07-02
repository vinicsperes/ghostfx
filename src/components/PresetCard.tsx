export function PresetCard({
  name,
  tag,
  color,
  isActive,
  onSelect,
  fitScroll = false,
}: {
  name: string;
  tag: string;
  color: string;
  isActive: boolean;
  onSelect: () => void;
  fitScroll?: boolean;
}) {
  const idle = "rgba(9,12,10,0.78)";
  return (
    <button
      onClick={onSelect}
      className="preset-card relative flex flex-col items-center justify-center active:scale-[0.97]"
      style={{
        flex: fitScroll ? "1 0 auto" : "1 1 0",
        minWidth: 108,
        height: 54,
        borderRadius: 14,
        cursor: "pointer",
        color: isActive ? color : "rgba(184,204,192,0.6)",
        border: `2px solid ${isActive ? color : "rgba(231,228,220,0.13)"}`,
        background: isActive ? "rgba(9,12,10,0.92)" : idle,
        boxShadow: isActive
          ? `0 0 0 1px ${color}55, 0 0 22px ${color}55, inset 0 0 22px ${color}18`
          : "none",
        transition:
          "color 260ms ease, border-color 260ms ease, background 260ms ease, box-shadow 260ms ease, transform 200ms ease",
      }}
      onMouseEnter={(e) => {
        if (isActive) return;
        const b = e.currentTarget;
        b.style.color = color;
        b.style.borderColor = `${color}77`;
        b.style.background = "rgba(14,18,15,0.92)";
        b.style.boxShadow = `0 0 16px ${color}33`;
        b.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        if (isActive) return;
        const b = e.currentTarget;
        b.style.color = "rgba(184,204,192,0.6)";
        b.style.borderColor = "rgba(231,228,220,0.13)";
        b.style.background = idle;
        b.style.boxShadow = "none";
        b.style.transform = "none";
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 9,
          right: 12,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: isActive ? color : "rgba(255,255,255,0.22)",
          boxShadow: isActive ? `0 0 6px ${color}` : "none",
          transition: "background 260ms",
        }}
      />
      <span
        style={{
          fontFamily: "'Bungee', sans-serif",
          fontSize: 15,
          letterSpacing: "0.16em",
          lineHeight: 1.05,
          color: "inherit",
          textShadow: isActive ? `0 0 12px ${color}aa` : "none",
        }}
      >
        {name}
      </span>
      <span
        className="font-[var(--font-mono)]"
        style={{
          fontSize: 9,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          marginTop: 5,
          paddingLeft: "0.3em",
          color: isActive ? `${color}cc` : "rgba(120,140,128,0.5)",
        }}
      >
        {tag}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: -1,
          left: "28%",
          right: "28%",
          height: 2,
          background: isActive ? color : "transparent",
          boxShadow: isActive ? `0 0 8px ${color}` : "none",
          borderRadius: 1,
          pointerEvents: "none",
        }}
      />
    </button>
  );
}
