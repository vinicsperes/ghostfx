import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Material, Mesh } from "three";

export function LabelText(props: React.ComponentProps<typeof Text>) {
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    const mat = ref.current?.material;
    if (mat instanceof Material && mat.depthTest !== false) mat.depthTest = false;
  });
  return <Text ref={ref} renderOrder={100} {...props} />;
}
