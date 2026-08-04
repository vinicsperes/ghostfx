import { Html } from "@react-three/drei";
import { HintSurface } from "./HintSurface";

export function MutedHint({ accent }: { accent: string }) {
  return (
    <Html
      position={[0, 0.66, 0]}
      center
      distanceFactor={5.4}
      zIndexRange={[50, 0]}
      pointerEvents="none"
    >
      <HintSurface>
        <svg
          className="animate-bounce"
          width="12"
          height="7"
          viewBox="0 0 12 7"
          fill="none"
          style={{ display: "block", margin: "0 auto 3px" }}
        >
          <path
            d="M1.6 5.4 6 1.6l4.4 3.8"
            stroke={accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "0.14em",
            color: accent,
          }}
        >
          DRAG UP
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 7.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(231,228,220,0.48)",
          }}
        >
          starts muted
        </div>
      </HintSurface>
    </Html>
  );
}
