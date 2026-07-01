import { Text } from "@react-three/drei";

export function Battery9V() {
  const cx = -0.2,
    cy = -0.305,
    cz = -0.6;
  return (
    <group position={[cx, cy, cz]}>
      <mesh castShadow>
        <boxGeometry args={[0.98, 0.34, 0.5]} />
        <meshStandardMaterial color="#15151a" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0.24, 0, 0]}>
        <boxGeometry args={[0.28, 0.342, 0.502]} />
        <meshStandardMaterial color="#c9a23c" roughness={0.45} metalness={0.35} />
      </mesh>
      <Text
        position={[0.0, 0.172, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.1}
        color="#e8e6da"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
        renderOrder={6}
      >
        9V
      </Text>
      <mesh position={[0.495, 0.02, 0]} castShadow>
        <boxGeometry args={[0.03, 0.26, 0.44]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[0.515, 0.04, -0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.066, 20]} />
        <meshStandardMaterial color="#e4e4ea" metalness={0.98} roughness={0.12} />
      </mesh>
      <mesh position={[0.515, 0.04, 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.066, 6]} />
        <meshStandardMaterial color="#e4e4ea" metalness={0.98} roughness={0.12} />
      </mesh>
    </group>
  );
}
