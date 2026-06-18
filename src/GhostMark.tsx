import type { CSSProperties } from "react";

// GHOST FX mascot mark (brand handoff). Single sleepy left eye; the right eye is
// a LED whose colour tracks the active preset, mirroring the physical pedal LED.
// viewBox 0 0 32 32 — body inherits `color`, LED uses `ledColor`.
export default function GhostMark({
  variant = "solid",
  ledColor = "#41ff77",
  color = "currentColor",
  size = 32,
  glow = true,
  className,
  style,
}: {
  variant?: "solid" | "outline";
  ledColor?: string;
  color?: string;
  size?: number;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* single-eye ghost: the body only — the LED below is the sole eye */}
      {variant === "solid" ? (
        <path
          d="M7 27 L7 13.5 C7 7.8 11 4 16 4 C21 4 25 7.8 25 13.5 L25 27 Q22 23.6 19 27 Q16 23.6 13 27 Q10 23.6 7 27 Z"
          fill={color}
        />
      ) : (
        <path
          d="M7 27 L7 13.5 C7 7.8 11 4 16 4 C21 4 25 7.8 25 13.5 L25 27 Q22 23.6 19 27 Q16 23.6 13 27 Q10 23.6 7 27 Z"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {glow && <circle cx="19.4" cy="13.6" r="3.5" fill={ledColor} opacity="0.28" />}
      <circle cx="19.4" cy="13.6" r="2" fill={ledColor} />
    </svg>
  );
}
