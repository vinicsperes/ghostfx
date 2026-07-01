import { useMemo } from "react";
import * as THREE from "three";

export function Wire({
  start,
  end,
  color,
  sag,
  r = 0.01,
  mid,
  mids,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  sag?: number;
  r?: number;
  mid?: [number, number, number];
  mids?: [number, number, number][];
}) {
  const geometry = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const way = mids ?? (mid ? [mid] : null);
    if (way) {
      const pts = [s, ...way.map((m) => new THREE.Vector3(...m)), e];
      const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
      return new THREE.TubeGeometry(curve, Math.max(40, pts.length * 18), r, 8, false);
    }
    const horiz = Math.hypot(e.x - s.x, e.z - s.z);
    const drop = sag ?? Math.min(0.045 + horiz * 0.1, 0.14);
    const h1 = Math.sin(s.x * 12.9898 + e.z * 78.233) * 43758.5453;
    const h2 = Math.sin(e.x * 39.346 + s.z * 11.135) * 24634.6345;
    const j1 = (h1 - Math.floor(h1) - 0.5) * Math.min(0.09, 0.03 + horiz * 0.06);
    const j2 = (h2 - Math.floor(h2) - 0.5) * Math.min(0.09, 0.03 + horiz * 0.06);
    const p1 = new THREE.Vector3().lerpVectors(s, e, 0.33);
    p1.y -= drop * 0.85;
    p1.x += j1;
    p1.z += j2;
    const p2 = new THREE.Vector3().lerpVectors(s, e, 0.67);
    p2.y -= drop;
    p2.x -= j2 * 0.7;
    p2.z += j1 * 0.7;
    const curve = new THREE.CatmullRomCurve3([s, p1, p2, e], false, "catmullrom", 0.9);
    return new THREE.TubeGeometry(curve, 32, r, 8, false);
  }, [start, end, sag, r, mid, mids]);
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.04} />
      </mesh>

      <mesh position={start}>
        <sphereGeometry args={[r * 1.6, 10, 8]} />
        <meshStandardMaterial color="#b8b8bc" metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[r * 2.0, 10, 8]} />
        <meshStandardMaterial color="#b8b8bc" metalness={0.85} roughness={0.28} />
      </mesh>
    </group>
  );
}
