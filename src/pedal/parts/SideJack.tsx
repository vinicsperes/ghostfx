export function SideJack({
  position,
  metal,
}: {
  position: [number, number, number];
  metal: string;
}) {
  const isLeft = position[0] < 0;
  const chrome = "#d6d6da";

  return (
    <group position={position} rotation={[0, 0, isLeft ? -Math.PI / 2 : Math.PI / 2]}>
      <mesh position={[0, 0.205, 0]} castShadow>
        <boxGeometry args={[0.2, 0.24, 0.17]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.62} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.335, 0]} castShadow>
        <boxGeometry args={[0.16, 0.04, 0.13]} />
        <meshStandardMaterial color="#141414" roughness={0.7} metalness={0.05} />
      </mesh>

      {[-0.05, 0.05].map((dx, i) => (
        <mesh key={`lug${i}`} position={[dx, 0.385, 0]} castShadow>
          <boxGeometry args={[0.028, 0.045, 0.01]} />
          <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.24} />
        </mesh>
      ))}

      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.092, 0.092, 0.14, 20]} />
        <meshStandardMaterial color={chrome} metalness={0.9} roughness={0.28} />
      </mesh>
      {[0.01, 0.024, 0.038].map((ty, i) => (
        <mesh key={`thr${i}`} position={[0, ty, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.093, 0.0032, 8, 28]} />
          <meshStandardMaterial color="#b8b8be" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}

      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.01, 20]} />
        <meshStandardMaterial color={metal} metalness={0.85} roughness={0.24} />
      </mesh>

      <mesh position={[0, -0.022, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 6]} />
        <meshStandardMaterial color={chrome} metalness={0.95} roughness={0.16} />
      </mesh>
      <mesh position={[0, -0.0505, 0]}>
        <cylinderGeometry args={[0.14, 0.124, 0.011, 6]} />
        <meshStandardMaterial color={chrome} metalness={0.95} roughness={0.2} />
      </mesh>

      <mesh position={[0, -0.054, 0]}>
        <cylinderGeometry args={[0.092, 0.092, 0.012, 20]} />
        <meshStandardMaterial color={chrome} metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.022, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}
