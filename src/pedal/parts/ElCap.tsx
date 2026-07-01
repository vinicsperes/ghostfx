import { PCB_BH } from "../constants";

export function ElCap({
  x,
  z,
  h = 0.18,
  r = 0.055,
  color = "#1a1a1a",
}: {
  x: number;
  z: number;
  h?: number;
  r?: number;
  color?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, PCB_BH / 2 + h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[-r * 0.35, PCB_BH / 2 + h, 0]}>
        <boxGeometry args={[r * 0.38, 0.003, r * 2.0]} />
        <meshBasicMaterial color="#e8e8e8" />
      </mesh>
      <mesh position={[0, PCB_BH / 2 + 0.004, 0]}>
        <cylinderGeometry args={[r + 0.005, r + 0.005, 0.006, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}
