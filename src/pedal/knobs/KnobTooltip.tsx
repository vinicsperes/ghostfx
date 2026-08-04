import { Html } from "@react-three/drei";
import { HintSurface } from "./HintSurface";

export function KnobTooltip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <Html
      position={[0, 0.58, 0]}
      center
      distanceFactor={5.4}
      zIndexRange={[50, 0]}
      pointerEvents="none"
    >
      <HintSurface>
        <div
          style={{
            fontSize: 7,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(231,228,220,0.48)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 1,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: accent,
          }}
        >
          {pct}
        </div>
        <div
          style={{
            marginTop: 6,
            width: 46,
            height: 2,
            marginInline: "auto",
            background: "rgba(231,228,220,0.16)",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: accent,
              boxShadow: `0 0 7px ${accent}`,
            }}
          />
        </div>
      </HintSurface>
    </Html>
  );
}
