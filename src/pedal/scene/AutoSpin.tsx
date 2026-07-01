import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Group } from "three";

export function AutoSpin({
  target,
  speed = 0.25,
}: {
  target: RefObject<Group | null>;
  speed?: number;
}) {
  useFrame((_, dt) => {
    if (target.current) target.current.rotation.y += speed * dt;
  });
  return null;
}
