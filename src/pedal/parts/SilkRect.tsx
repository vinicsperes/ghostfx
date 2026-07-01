import { SILK } from "../constants";

export function SilkRect({
  x,
  z,
  w,
  d,
  y,
  t = 0.0045,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  t?: number;
}) {
  const h = 0.002;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, -d / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshBasicMaterial color={SILK} />
      </mesh>
      <mesh position={[0, 0, d / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshBasicMaterial color={SILK} />
      </mesh>
      <mesh position={[-w / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshBasicMaterial color={SILK} />
      </mesh>
      <mesh position={[w / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshBasicMaterial color={SILK} />
      </mesh>
    </group>
  );
}
