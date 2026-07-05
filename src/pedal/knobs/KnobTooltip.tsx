import { Html } from "@react-three/drei";

export function KnobTooltip({
  label,
  value,
  accent,
  pulse = false,
  showBar = false,
}: {
  label: string;
  value: number;
  accent: string;
  pulse?: boolean;
  showBar?: boolean;
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
        <div>
          {label} {pct}%
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
