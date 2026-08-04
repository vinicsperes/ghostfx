import { Line, Html } from "@react-three/drei";
import { HintSurface } from "../knobs/HintSurface";

export function SideHint({
  label,
  labelPos,
  targetPos,
  accent,
  alignRight = false,
}: {
  label: string;
  labelPos: [number, number, number];
  targetPos: [number, number, number];
  accent: string;
  alignRight?: boolean;
}) {
  return (
    <group>
      <Line
        points={[labelPos, targetPos]}
        color={accent}
        lineWidth={1}
        transparent={true}
        opacity={0.45}
        dashed
        dashSize={0.08}
        gapSize={0.05}
      />

      <mesh position={targetPos}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={accent} />
      </mesh>

      <Html position={labelPos} center distanceFactor={6} pointerEvents="none">
        <HintSurface>
          <div
            className="font-[var(--font-pixel)] animate-pulse"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: accent,
              textAlign: alignRight ? "right" : "left",
            }}
          >
            {label}
          </div>
        </HintSurface>
      </Html>
    </group>
  );
}
