function ForkIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M8 3v7a4 4 0 0 0 4 4v7m4-18v7a4 4 0 0 1-4 4"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TunerButton({
  onOpen,
  accent,
  variant = "panel",
}: {
  onOpen: () => void;
  accent: string;
  variant?: "panel" | "icon";
}) {
  if (variant === "icon") {
    return (
      <button
        onClick={onOpen}
        aria-label="Open tuner"
        title="Tuner"
        className="flex items-center justify-center shrink-0 transition-all active:scale-90"
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          border: `1px solid ${accent}35`,
          background: `${accent}0f`,
          cursor: "pointer",
        }}
      >
        <ForkIcon color={accent} size={17} />
      </button>
    );
  }

  return (
    <button
      onClick={onOpen}
      aria-label="Open tuner"
      className="flex flex-col items-center justify-center transition-all active:scale-95"
      style={{
        width: 92,
        height: 74,
        gap: 6,
        borderRadius: 8,
        border: `1px solid ${accent}30`,
        background: "rgba(255,255,255,0.02)",
        color: accent,
        cursor: "pointer",
      }}
    >
      <ForkIcon color={accent} />
      <span
        className="font-[var(--font-mono)]"
        style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(231,228,220,0.55)" }}
      >
        TUNE
      </span>
    </button>
  );
}
