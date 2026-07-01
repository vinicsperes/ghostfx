import { Line, Html } from "@react-three/drei";

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

      <Html position={labelPos} center distanceFactor={6}>
        <div
          className="pointer-events-none select-none whitespace-nowrap font-[var(--font-pixel)] animate-pulse"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            padding: "5px 10px",
            borderRadius: 3,
            background: "rgba(0,0,0,0.88)",
            border: `1px solid ${accent}88`,
            color: accent,
            backdropFilter: "blur(4px)",
            textAlign: alignRight ? "right" : "left",
            boxShadow: `0 0 12px ${accent}22`,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
