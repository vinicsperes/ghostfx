import { DoubleSide } from "three";
import { Text } from "@react-three/drei";
import { PCB_BH } from "../constants";

export function ElCap({
  x,
  z,
  h = 0.18,
  r = 0.055,
  color = "#1a1a1a",
  label = "47uF",
}: {
  x: number;
  z: number;
  h?: number;
  r?: number;
  color?: string;
  label?: string;
}) {
  const baseY = PCB_BH / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, baseY + h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 20]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.12} />
      </mesh>

      <mesh position={[0, baseY + h / 2, 0]}>
        <cylinderGeometry args={[r + 0.002, r + 0.002, h * 0.94, 12, 1, true, -0.34, 0.68]} />
        <meshStandardMaterial color="#dcdee6" roughness={0.55} metalness={0.05} side={DoubleSide} />
      </mesh>
      <mesh position={[0, baseY + h * 0.82, r + 0.0045]}>
        <boxGeometry args={[0.026, 0.009, 0.002]} />
        <meshBasicMaterial color="#16161c" />
      </mesh>
      <Text
        position={[0, baseY + h * 0.45, r + 0.006]}
        rotation={[0, 0, -Math.PI / 2]}
        fontSize={Math.min(0.032, r * 0.42)}
        color="#181820"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        renderOrder={6}
      >
        {label}
      </Text>

      <mesh position={[0, baseY + h + 0.0012, 0]}>
        <boxGeometry args={[r * 1.32, 0.0022, r * 0.14]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, baseY + h + 0.0012, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[r * 1.32, 0.0022, r * 0.14]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.6} metalness={0.2} />
      </mesh>

      <mesh position={[0, baseY + 0.004, 0]}>
        <cylinderGeometry args={[r + 0.005, r + 0.005, 0.006, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.25} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * r * 0.5, baseY + 0.004, 0]}>
          <sphereGeometry args={[0.014, 12, 8]} />
          <meshStandardMaterial color="#c4c4c8" metalness={0.85} roughness={0.26} />
        </mesh>
      ))}
    </group>
  );
}
