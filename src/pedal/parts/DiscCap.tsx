import { PCB_BH } from "../constants";

export function DiscCap({
  x,
  z,
  rot = 0,
  color = "#d4b86a",
}: {
  x: number;
  z: number;
  rot?: number;
  color?: string;
}) {
  const r = 0.078;
  const legX = 0.0675;
  const discY = PCB_BH / 2 + r + 0.024;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, discY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, 0.034, 18]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {([-legX, legX] as const).map((lx, i) => (
        <mesh key={i} position={[lx, (discY - r * 0.4 + PCB_BH / 2) / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, discY - r * 0.4 - PCB_BH / 2, 8]} />
          <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}
