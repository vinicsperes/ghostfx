import { Text } from "@react-three/drei";
import { PEDAL_FONT, SILK } from "../constants";

export function SilkText({
  x,
  z,
  y,
  size = 0.033,
  children,
}: {
  x: number;
  z: number;
  y: number;
  size?: number;
  children: string;
}) {
  return (
    <Text
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      font={PEDAL_FONT}
      fontSize={size}
      color={SILK}
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.05}
      renderOrder={6}
    >
      {children}
    </Text>
  );
}
