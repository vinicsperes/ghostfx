import { Text } from "@react-three/drei";
import { PCB_BH } from "../constants";

export function ICDip({
  x,
  z,
  pins = 8,
  rot = 0,
  color = "#101010",
  label = "",
}: {
  x: number;
  z: number;
  pins?: number;
  rot?: number;
  color?: string;
  label?: string;
}) {
  const half = pins / 2;
  const chipW = 0.171;
  const chipL = half * 0.066;
  const chipH = 0.089;
  const sockH = 0.055;
  const seatY = PCB_BH / 2 + sockH;
  const topY = seatY + chipH / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, PCB_BH / 2 + sockH / 2, 0]} castShadow>
        <boxGeometry args={[chipW + 0.05, sockH, chipL + 0.04]} />
        <meshStandardMaterial color="#161616" roughness={0.82} metalness={0.02} />
      </mesh>
      <mesh position={[0, topY, 0]} castShadow>
        <boxGeometry args={[chipW, chipH, chipL]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.04} />
      </mesh>
      <mesh position={[0, topY + chipH / 2 + 0.0005, -chipL / 2 + 0.03]}>
        <cylinderGeometry args={[0.016, 0.016, 0.001, 12]} />
        <meshBasicMaterial color="#383838" />
      </mesh>
      {label && (
        <Text
          position={[0, topY + chipH / 2 + 0.002, 0.012]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
          fontSize={0.046}
          color="#d8d8d8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
          renderOrder={6}
        >
          {label}
        </Text>
      )}
      {Array.from({ length: half }, (_, i) => {
        const pz = -chipL / 2 + 0.033 + i * 0.066;
        return (
          <group key={i}>
            <mesh position={[-chipW / 2 - 0.012, (seatY + PCB_BH / 2) / 2, pz]}>
              <boxGeometry args={[0.024, sockH + 0.014, 0.014]} />
              <meshStandardMaterial color="#b0b0b0" metalness={0.88} roughness={0.12} />
            </mesh>
            <mesh position={[chipW / 2 + 0.012, (seatY + PCB_BH / 2) / 2, pz]}>
              <boxGeometry args={[0.024, sockH + 0.014, 0.014]} />
              <meshStandardMaterial color="#b0b0b0" metalness={0.88} roughness={0.12} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
