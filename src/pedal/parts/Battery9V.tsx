import { RoundedBox, Text } from "@react-three/drei";

export function Battery9V() {
  const cx = -0.2,
    cy = -0.305,
    cz = -0.6;
  return (
    <group position={[cx, cy, cz]}>
      <RoundedBox args={[0.98, 0.34, 0.5]} radius={0.035} smoothness={4} castShadow>
        <meshStandardMaterial color="#15151a" roughness={0.42} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0.24, 0, 0]}>
        <boxGeometry args={[0.28, 0.342, 0.502]} />
        <meshStandardMaterial color="#c9a23c" roughness={0.45} metalness={0.35} />
      </mesh>
      <Text
        position={[-0.16, 0.174, -0.07]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.082}
        color="#e8e6da"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        renderOrder={6}
      >
        GHOSTVOLT
      </Text>
      <Text
        position={[-0.16, 0.174, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.048}
        color="#9a97a8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.22}
        renderOrder={6}
      >
        9V ALKALINE
      </Text>
      <Text
        position={[0.24, 0.174, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        fontSize={0.06}
        color="#2b2418"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.14}
        renderOrder={6}
      >
        NO-LEAK
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
