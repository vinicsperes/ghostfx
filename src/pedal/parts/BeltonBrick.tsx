import { useMemo } from "react";
import * as THREE from "three";
import { PCB_BH } from "../constants";

export function BeltonBrick({ x, z }: { x: number; z: number }) {
  const W = 0.38,
    L = 0.74,
    H = 0.22;
  const topY = PCB_BH / 2 + 0.02 + H;

  const labelTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#e8e6da";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = "#b8b4a4";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 300);
    ctx.fillStyle = "#16161a";
    ctx.font = "bold 72px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("GHOST RV-3", 256, 140);
    ctx.fillStyle = "#3a3a44";
    ctx.font = "36px 'JetBrains Mono', monospace";
    ctx.fillText("DIGI-VERB · LONG DECAY", 256, 215);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }, []);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, PCB_BH / 2 + 0.02 + H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, L]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh position={[0, topY + 0.001, -0.04]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[0.56, 0.35]} />
        <meshStandardMaterial map={labelTex} roughness={0.85} metalness={0} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-W / 2 + 0.06 + i * 0.066, PCB_BH / 2 + 0.012, -L / 2 + 0.035]}>
          <cylinderGeometry args={[0.009, 0.009, 0.05, 8]} />
          <meshStandardMaterial color="#b0b0b0" metalness={0.88} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}
