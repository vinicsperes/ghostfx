export function SwitchBody({ x, z, topY }: { x: number; z: number; topY: number }) {
  const w = 0.24,
    d = 0.24,
    h = 0.18;
  const cy = topY - 0.025 - h / 2;
  const lugY = cy - h / 2 - 0.03;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, cy, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#45454d" metalness={0.4} roughness={0.5} />
      </mesh>
      {[-0.08, 0, 0.08].flatMap((lx) =>
        [-0.08, 0, 0.08].map((lz) => (
          <mesh key={`${lx}_${lz}`} position={[lx, lugY, lz]}>
            <boxGeometry args={[0.034, 0.06, 0.012]} />
            <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.22} />
          </mesh>
        )),
      )}
    </group>
  );
}
