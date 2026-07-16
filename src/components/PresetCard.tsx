import type { CSSProperties } from "react";

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
  return (
    <button
      onClick={onSelect}
      aria-pressed={isActive}
      className={`preset-card relative flex flex-col items-center justify-center${
        isActive ? " is-active" : ""
      }`}
      style={
        {
          "--c": color,
          flex: fitScroll ? "1 0 auto" : "1 1 0",
          minWidth: 108,
          height: fitScroll ? 38 : 54,
          borderRadius: fitScroll ? 11 : 14,
        } as CSSProperties
      }
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
          position: "relative",
          fontFamily: "'Bungee', sans-serif",
          fontSize: fitScroll ? 13 : 15,
          letterSpacing: "0.16em",
          lineHeight: 1.05,
          color: "inherit",
          textShadow: isActive ? `0 0 12px ${color}aa` : "none",
        }}
      >
        {name}
      </span>
      {!fitScroll && (
        <span
          className="font-[var(--font-mono)]"
          style={{
            position: "relative",
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
      )}
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
