import { PCB_BH } from "../constants";

export function CableClip({
  x,
  z,
  y = -0.06,
  rot = 0,
  color = "#141418",
}: {
  x: number;
  z: number;
  y?: number;
  rot?: number;
  color?: string;
}) {
  const base = PCB_BH / 2;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, base + 0.034, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.03, 0.0075, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      {[-0.03, 0.03].map((dx, i) => (
        <mesh key={i} position={[dx, base + 0.016, 0]} castShadow>
          <boxGeometry args={[0.013, 0.034, 0.016]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}
