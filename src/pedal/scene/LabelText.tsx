import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { FrontSide, Material, Mesh } from "three";
import { PEDAL_FONT } from "../constants";

export function LabelText(props: React.ComponentProps<typeof Text>) {
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    const mat = ref.current?.material;
    if (!(mat instanceof Material)) return;
    if (mat.depthTest !== false) mat.depthTest = false;
    if (mat.side !== FrontSide) mat.side = FrontSide;
  });
  return <Text ref={ref} font={PEDAL_FONT} renderOrder={100} {...props} />;
}
