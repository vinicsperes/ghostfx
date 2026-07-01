import { PCB_BH } from "../constants";

export function THResistor({
  x,
  z,
  rot = 0,
  b1 = "#c02010",
  b2 = "#101010",
  b3 = "#e0a020",
}: {
  x: number;
  z: number;
  rot?: number;
  b1?: string;
  b2?: string;
  b3?: string;
}) {
  const bL = 0.17;
  const bR = 0.031;
  const legZ = 0.1365;
  const bodyY = PCB_BH / 2 + bR + 0.004;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[bR, bR, bL, 12]} />
        <meshStandardMaterial color="#e8d8b0" roughness={0.6} />
      </mesh>
      {([-0.055, -0.03, -0.005, 0.055] as const).map((dz, i) => (
        <mesh key={i} position={[0, bodyY, dz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[bR + 0.0015, bR + 0.0015, 0.012, 12]} />
          <meshBasicMaterial color={i === 0 ? b1 : i === 1 ? b2 : i === 2 ? b3 : "#c8a030"} />
        </mesh>
      ))}
      {([1, -1] as const).map((s) => (
        <group key={s}>
          <mesh
            position={[0, bodyY, s * (bL / 2 + (legZ - bL / 2) / 2)]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.008, 0.008, legZ - bL / 2, 8]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
          </mesh>
          <mesh position={[0, (bodyY + PCB_BH / 2) / 2, s * legZ]}>
            <cylinderGeometry args={[0.008, 0.008, bodyY - PCB_BH / 2, 8]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
