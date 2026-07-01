export function PotBody({ x, z, topY }: { x: number; z: number; topY: number }) {
  const bodyR = 0.128;
  const bodyH = 0.16;
  const bodyCY = topY - 0.025 - bodyH / 2;
  const canBottom = bodyCY - bodyH / 2;
  const lugZ = -(bodyR - 0.025);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, topY - 0.025, 0]}>
        <cylinderGeometry args={[0.094, 0.094, 0.05, 16]} />
        <meshStandardMaterial color="#caa83c" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, bodyCY, 0]} castShadow>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 20]} />
        <meshStandardMaterial color="#8a8a90" metalness={0.78} roughness={0.38} />
      </mesh>
      <mesh position={[0, canBottom + 0.007, 0]}>
        <cylinderGeometry args={[bodyR + 0.006, bodyR + 0.006, 0.014, 20]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
      </mesh>
      {[-0.067, 0, 0.067].map((dx, i) => (
        <mesh key={i} position={[dx, canBottom - 0.02, lugZ]}>
          <boxGeometry args={[0.026, 0.046, 0.01]} />
          <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
}
