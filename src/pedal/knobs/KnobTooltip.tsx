import { Html } from "@react-three/drei";

export function KnobTooltip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Html position={[0, 0.65, 0]} center distanceFactor={7} zIndexRange={[50, 0]}>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 9px",
          borderRadius: 3,
          background: "rgba(0,0,0,0.92)",
          border: `1px solid ${accent}88`,
          color: accent,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          letterSpacing: "0.06em",
          boxShadow: `0 0 10px ${accent}22`,
        }}
      >
        {label} {Math.round(value * 100)}%
      </div>
    </Html>
  );
}
