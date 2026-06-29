import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";

export function LabelText(props: React.ComponentProps<typeof Text>) {
  const ref = useRef<any>(null);
  useFrame(() => {
    const mat = ref.current?.material;
    if (mat && mat.depthTest !== false) mat.depthTest = false;
  });
  return <Text ref={ref} renderOrder={100} {...props} />;
}
