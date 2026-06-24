import { SILK } from "../constants";

export function SilkRing({ x, z, r, y }: { x: number; z: number; r: number; y: number }) {
  return (
    <mesh position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.0022, 4, 28]} />
      <meshBasicMaterial color={SILK} />
    </mesh>
  );
}
