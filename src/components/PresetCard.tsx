import type { CSSProperties } from "react";

export function PresetCard({
  name,
  color,
  isActive,
  onSelect,
  fitScroll = false,
}: {
  name: string;
  color: string;
  isActive: boolean;
  onSelect: () => void;
  fitScroll?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={isActive}
      className={`preset-card relative flex items-center justify-center${isActive ? " is-active" : ""}`}
      style={
        {
          "--c": color,
          flex: fitScroll ? "1 0 auto" : "1 1 0",
          minWidth: fitScroll ? 96 : 104,
          height: fitScroll ? 36 : 40,
          borderRadius: 8,
        } as CSSProperties
      }
    >
      <span
        style={{
          position: "relative",
          fontFamily: "'Bungee', sans-serif",
          fontSize: fitScroll ? 12 : 13,
          letterSpacing: "0.16em",
          lineHeight: 1,
          color: "inherit",
          textShadow: isActive ? `0 0 12px ${color}aa` : "none",
        }}
      >
        {name}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: -1,
          left: "26%",
          right: "26%",
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
