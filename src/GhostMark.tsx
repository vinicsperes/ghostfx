import type { CSSProperties } from "react";

const BODY =
  "M16 51 L16 28 C16 16 23 9 32 9 C41 9 48 16 48 28 L48 51 Q44 47 40 51 Q36 55 32 51 Q28 47 24 51 Q20 55 16 51 Z";

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
      viewBox="13 6 38 52"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {variant === "solid" ? (
        <path d={BODY} fill={color} />
      ) : (
        <path
          d={BODY}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {glow && <circle cx="36" cy="27" r="9" fill={ledColor} opacity="0.26" />}
      <circle cx="36" cy="27" r="5.5" fill={ledColor} />
    </svg>
  );
}
