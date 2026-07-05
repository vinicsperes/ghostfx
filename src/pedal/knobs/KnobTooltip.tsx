import { Html } from "@react-three/drei";

function MuteIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill={color} />
      <path
        d="M16 9.5a4.5 4.5 0 0 1 0 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M18.5 4 5 17.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function KnobTooltip({
  label,
  value,
  accent,
  pulse = false,
  showBar = false,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  pulse?: boolean;
  showBar?: boolean;
  icon?: "mute";
}) {
  const pct = Math.round(value * 100);
  return (
    <Html position={[0, 0.65, 0]} center distanceFactor={7} zIndexRange={[50, 0]}>
      <div
        className={pulse ? "animate-pulse" : ""}
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 700,
          padding: showBar ? "6px 10px" : "3px 9px",
          borderRadius: 4,
          background: "rgba(0,0,0,0.92)",
          border: `1px solid ${accent}88`,
          color: accent,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          letterSpacing: "0.06em",
          boxShadow: `0 0 10px ${accent}33`,
        }}
      >
        <div className="flex items-center" style={{ gap: 6 }}>
          {icon === "mute" && <MuteIcon color={accent} />}
          {icon === "mute" ? label : `${label} ${pct}%`}
        </div>
        {showBar && (
          <div
            style={{
              marginTop: 5,
              width: 78,
              height: 3,
              borderRadius: 2,
              background: "rgba(255,255,255,0.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: accent,
                boxShadow: `0 0 6px ${accent}`,
              }}
            />
          </div>
        )}
      </div>
    </Html>
  );
}
