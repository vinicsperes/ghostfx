import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";

export function LabelText(props: React.ComponentProps<typeof Text>) {
  const ref = useRef<any>(null);
  useFrame(() => {
    const mat = ref.current?.material;
    if (mat) {
      if (mat.alphaTest !== 0.5) { mat.alphaTest = 0.5; mat.needsUpdate = true; }
      if (mat.depthTest !== false) { mat.depthTest = false; mat.needsUpdate = true; }
    }
  });
  return <Text ref={ref} renderOrder={100} {...props} />;
}
