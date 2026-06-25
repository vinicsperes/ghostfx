import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function HangTag() {
  const { tex, redraw } = useMemo(() => {
    const TAG_DPR = 3;
    const c = document.createElement("canvas");
    c.width = 512 * TAG_DPR; c.height = 640 * TAG_DPR;
    const ctx = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 16;

    const ink = "#14120e", card = "#f6f3ea", dim = "#2b2720";
    const UNB = "'Unbounded', sans-serif";
    const MONO = "'Space Mono', monospace";
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const redraw = (hover = false) => {
      ctx.setTransform(TAG_DPR, 0, 0, TAG_DPR, 0, 0);
      ctx.clearRect(0, 0, 512, 640);
      ctx.letterSpacing = "0px";

      rr(8, 8, 496, 624, 27);
      ctx.fillStyle = card;
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = ink;
      ctx.font = `900 132px ${UNB}`;
      ctx.letterSpacing = "-7px";
      ctx.fillText("FREE", 256, 272);
      ctx.letterSpacing = "1px";
      ctx.font = `700 18px ${MONO}`;
      ctx.fillStyle = dim;
      ctx.fillText("OPEN SOURCE · ZERO INSTALL", 256, 320);
      ctx.letterSpacing = "0px";

      ctx.fillStyle = ink;
      ctx.fillRect(72, 430, 368, 4);
      ctx.font = `700 18px ${MONO}`;
      ctx.fillStyle = dim;
      ctx.letterSpacing = "6px";
      ctx.fillText("SOURCE", 256, 468);
      ctx.letterSpacing = "0px";
      ctx.font = `700 28px ${MONO}`;
      if (hover) {
        ctx.fillStyle = "#10a042";
        ctx.shadowColor = "#41ff77";
        ctx.shadowBlur = 20;
      } else {
        ctx.fillStyle = ink;
      }
      ctx.fillText("github.com/vinicsperes", 256, 514);
      ctx.shadowBlur = 0;
      ctx.fillStyle = ink;
      ctx.fillRect(72, 544, 368, 4);

      {
        const gs = 0.75;
        const gx = 256 - 32 * gs;
        const gy = 571 - 32 * gs;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.scale(gs, gs);
        ctx.fillStyle = ink;
        ctx.fill(new Path2D("M16 51 L16 28 C16 16 23 9 32 9 C41 9 48 16 48 28 L48 51 Q44 47 40 51 Q36 55 32 51 Q28 47 24 51 Q20 55 16 51 Z"));
        ctx.fillStyle = "#41ff77";
        ctx.globalAlpha = 0.26;
        ctx.beginPath(); ctx.arc(36, 27, 9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#10a042";
        ctx.beginPath(); ctx.arc(36, 27, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = ink;
      ctx.beginPath(); ctx.arc(256, 54, 24, 0, Math.PI * 2);
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(256, 54, 16, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      t.needsUpdate = true;
    };
    redraw();
    return { tex: t, redraw };
  }, []);

  useEffect(() => {
    let alive = true;
    document.fonts.ready
      .then(() => Promise.all([
        document.fonts.load("900 150px Unbounded"),
        document.fonts.load("700 20px Unbounded"),
        document.fonts.load("700 15px 'Space Mono'"),
        document.fonts.load("400 11px 'Space Mono'"),
      ]))
      .then(() => { if (alive) redraw(); })
      .catch(() => {});
    return () => { alive = false; };
  }, [redraw]);

  const stringGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.00, 0.50, 1.08),
      new THREE.Vector3(0.05, 0.50, 1.40),
      new THREE.Vector3(0.10, 0.45, 1.62),
      new THREE.Vector3(0.117, 0.36, 1.648),
      new THREE.Vector3(0.121, 0.295, 1.642),
      new THREE.Vector3(0.123, 0.262, 1.610),
    ]);
    return new THREE.TubeGeometry(curve, 32, 0.006, 6, false);
  }, []);

  const EYELET_LOCAL_Y = 0.625 * (0.5 - 54 / 640);
  const pivot = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, dt) => {
    const g = pivot.current;
    if (!g) return;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, hovered ? -0.22 : 0, 6, dt);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, hovered ? -0.13 : -0.07, 6, dt);
  });

  useEffect(() => { redraw(hovered); }, [hovered, redraw]);

  return (
    <group
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); window.open("https://github.com/vinicsperes", "_blank", "noopener"); }}
    >
      <mesh geometry={stringGeo}>
        <meshStandardMaterial color="#cfc8b4" roughness={0.8} metalness={0} />
      </mesh>
      <group ref={pivot} position={[0.123, 0.269, 1.62]} rotation={[0, 0, -0.07]}>
        <mesh position={[0, -EYELET_LOCAL_Y, 0]}>
          <planeGeometry args={[0.50, 0.625]} />
          {/* alphaTest sem transparent: renderiza no passe opaco e evita
              erro de ordenação com o chassi translúcido visto por trás */}
          <meshStandardMaterial map={tex} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.85} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}
