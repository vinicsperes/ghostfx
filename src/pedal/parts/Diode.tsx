import { PCB_BH } from "../constants";

export function Diode({
  x,
  z,
  rot = 0,
  kind = "glass",
}: {
  x: number;
  z: number;
  rot?: number;
  kind?: "glass" | "power";
}) {
  const glass = kind === "glass";
  const bL = glass ? 0.114 : 0.14;
  const bR = glass ? 0.027 : 0.036;
  const legZ = glass ? 0.1 : 0.12;
  const bodyY = PCB_BH / 2 + bR + 0.004;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[bR, bR, bL, 12]} />
        {glass ? (
          <meshPhysicalMaterial color="#b06818" roughness={0.18} metalness={0.05} clearcoat={0.6} />
        ) : (
          <meshStandardMaterial color="#181818" roughness={0.5} metalness={0.05} />
        )}
      </mesh>
      <mesh position={[0, bodyY, -bL / 2 + 0.018]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[bR + 0.0015, bR + 0.0015, 0.014, 12]} />
        <meshBasicMaterial color={glass ? "#181818" : "#d8d8d8"} />
      </mesh>
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
