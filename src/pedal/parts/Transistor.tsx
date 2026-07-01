import { PCB_BH } from "../constants";

export function Transistor({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const h = 0.12;
  const standoff = 0.04;
  const bodyCY = PCB_BH / 2 + standoff + h / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyCY, 0]} castShadow scale={[1, 1, 0.62]}>
        <cylinderGeometry args={[0.06, 0.06, h, 16]} />
        <meshStandardMaterial color="#141414" roughness={0.55} metalness={0.06} />
      </mesh>
      {[-0.034, 0, 0.034].map((dx, i) => (
        <mesh key={i} position={[dx, (PCB_BH / 2 + bodyCY - h / 2) / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, standoff + 0.004, 8]} />
          <meshStandardMaterial color="#c0c0c4" metalness={0.85} roughness={0.18} />
        </mesh>
      ))}
    </group>
  );
}
