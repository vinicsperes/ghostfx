import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export function CameraShake({ stompCount }: { stompCount: number }) {
  const { camera } = useThree();
  const s = useRef({ t: 0, baseY: 0, running: false });
  useEffect(() => {
    if (stompCount > 0) {
      s.current = { t: 0, baseY: camera.position.y, running: true };
    }
  }, [stompCount, camera]);
  useFrame((_, delta) => {
    if (!s.current.running) return;
    s.current.t += delta;
    if (s.current.t > 0.45) {
      s.current.running = false;
      camera.position.y = s.current.baseY;
      return;
    }
    camera.position.y =
      s.current.baseY + Math.sin(s.current.t * 32) * 0.28 * Math.exp(-s.current.t * 9);
  });
  return null;
}
