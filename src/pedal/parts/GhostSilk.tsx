import { useMemo } from "react";
import * as THREE from "three";

export function GhostSilk({
  x,
  z,
  y,
  size = 0.17,
}: {
  x: number;
  z: number;
  y: number;
  size?: number;
}) {
  const tex = useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d")!;
    const k = (s * 0.82) / 46;
    ctx.translate(s / 2 - 32 * k, s / 2 - 32 * k);
    ctx.scale(k, k);
    const body = new Path2D(
      "M16 51 L16 28 C16 16 23 9 32 9 C41 9 48 16 48 28 L48 51 Q44 47 40 51 Q36 55 32 51 Q28 47 24 51 Q20 55 16 51 Z",
    );
    ctx.fillStyle = "#cbc6b4";
    ctx.fill(body);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(36, 27, 5.5, 0, Math.PI * 2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}
