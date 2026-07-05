import { Html } from "@react-three/drei";

function VolumeUpIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" fill={color} />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M19 5.5a10 10 0 0 1 0 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
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
  icon?: "volumeUp";
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
          {icon === "volumeUp" && <VolumeUpIcon color={accent} />}
          {icon === "volumeUp" ? label : `${label} ${pct}%`}
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
