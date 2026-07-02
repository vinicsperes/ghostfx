import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function HangTag() {
  const { tex, redraw } = useMemo(() => {
    const TAG_DPR = 3;
    const c = document.createElement("canvas");
    c.width = 512 * TAG_DPR;
    c.height = 640 * TAG_DPR;
    const ctx = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 16;

    const ink = "#14120e",
      card = "#f6f3ea",
      dim = "#2b2720";
    const UNB = "'Unbounded', sans-serif";
    const MONO = "'Space Mono', monospace";
    const tagShape = () => {
      const ch = 64;
      const r = 27;
      ctx.beginPath();
      ctx.moveTo(8 + ch, 8);
      ctx.lineTo(504 - ch, 8);
      ctx.lineTo(504, 8 + ch);
      ctx.lineTo(504, 632 - r);
      ctx.arcTo(504, 632, 504 - r, 632, r);
      ctx.lineTo(8 + r, 632);
      ctx.arcTo(8, 632, 8, 632 - r, r);
      ctx.lineTo(8, 8 + ch);
      ctx.closePath();
    };

    const BARS = [
      3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 1, 3, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 3, 1, 2, 4, 1, 1,
      2, 3, 1, 2, 4,
    ];

    const redraw = (hover = false) => {
      ctx.setTransform(TAG_DPR, 0, 0, TAG_DPR, 0, 0);
      ctx.clearRect(0, 0, 512, 640);
      ctx.letterSpacing = "0px";

      tagShape();
      ctx.fillStyle = card;
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.save();
      ctx.translate(256, 152);
      ctx.rotate(-0.055);
      ctx.textAlign = "center";
      ctx.font = `700 40px ${MONO}`;
      ctx.fillStyle = dim;
      ctx.fillText("$199", 0, 0);
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-62, -10);
      ctx.lineTo(62, -16);
      ctx.stroke();
      ctx.restore();

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

      {
        let bx = 128;
        ctx.fillStyle = ink;
        for (const w of BARS) {
          ctx.fillRect(bx, 356, w * 2, 48);
          bx += w * 2 + 3;
        }
        ctx.font = `700 14px ${MONO}`;
        ctx.fillStyle = dim;
        ctx.letterSpacing = "3px";
        ctx.fillText("GFX-001 · MK.I", 256, 428);
        ctx.letterSpacing = "0px";
      }

      ctx.fillStyle = ink;
      ctx.fillRect(72, 452, 368, 4);
      ctx.font = `700 18px ${MONO}`;
      ctx.fillStyle = dim;
      ctx.letterSpacing = "6px";
      ctx.fillText("SOURCE", 256, 490);
      ctx.letterSpacing = "0px";
      ctx.font = `700 28px ${MONO}`;
      if (hover) {
        ctx.fillStyle = "#10a042";
        ctx.shadowColor = "#41ff77";
        ctx.shadowBlur = 20;
      } else {
        ctx.fillStyle = ink;
      }
      ctx.fillText("github.com/vinicsperes", 256, 534);
      ctx.shadowBlur = 0;
      ctx.fillStyle = ink;
      ctx.fillRect(72, 562, 368, 4);

      {
        const gs = 0.62;
        const gx = 256 - 32 * gs;
        const gy = 592 - 32 * gs;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.scale(gs, gs);
        ctx.fillStyle = ink;
        ctx.fill(
          new Path2D(
            "M16 51 L16 28 C16 16 23 9 32 9 C41 9 48 16 48 28 L48 51 Q44 47 40 51 Q36 55 32 51 Q28 47 24 51 Q20 55 16 51 Z",
          ),
        );
        ctx.fillStyle = "#41ff77";
        ctx.globalAlpha = 0.26;
        ctx.beginPath();
        ctx.arc(36, 27, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#10a042";
        ctx.beginPath();
        ctx.arc(36, 27, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = ink;
      ctx.beginPath();
      ctx.arc(256, 54, 24, 0, Math.PI * 2);
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(256, 54, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      t.needsUpdate = true;
    };
    redraw();
    return { tex: t, redraw };
  }, []);

  useEffect(() => {
    let alive = true;
    document.fonts.ready
      .then(() =>
        Promise.all([
          document.fonts.load("900 150px Unbounded"),
          document.fonts.load("700 20px Unbounded"),
          document.fonts.load("700 15px 'Space Mono'"),
          document.fonts.load("400 11px 'Space Mono'"),
        ]),
      )
      .then(() => {
        if (alive) redraw();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [redraw]);

  const stringGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.51, 1.202),
      new THREE.Vector3(0.05, 0.505, 1.38),
      new THREE.Vector3(0.08, 0.5, 1.52),
      new THREE.Vector3(0.105, 0.44, 1.66),
      new THREE.Vector3(0.118, 0.34, 1.683),
      new THREE.Vector3(0.121, 0.295, 1.675),
      new THREE.Vector3(0.123, 0.262, 1.65),
    ]);
    return new THREE.TubeGeometry(curve, 32, 0.0075, 8, false);
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

  useEffect(() => {
    redraw(hovered);
  }, [hovered, redraw]);

  return (
    <group
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        window.open("https://github.com/vinicsperes", "_blank", "noopener");
      }}
    >
      <mesh geometry={stringGeo}>
        <meshStandardMaterial color="#bfb397" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 0.515, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.152, 0.006, 8, 40]} />
        <meshStandardMaterial color="#bfb397" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.015, 0.512, 1.198]}>
        <sphereGeometry args={[0.01, 10, 8]} />
        <meshStandardMaterial color="#b3a688" roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[0.122, 0.275, 1.668]}>
        <sphereGeometry args={[0.0125, 12, 10]} />
        <meshStandardMaterial color="#b3a688" roughness={0.95} metalness={0} />
      </mesh>
      <group ref={pivot} position={[0.123, 0.269, 1.66]} rotation={[0, 0, -0.07]}>
        <mesh position={[0, -EYELET_LOCAL_Y, 0]}>
          <planeGeometry args={[0.5, 0.625]} />
          <meshStandardMaterial
            map={tex}
            alphaTest={0.5}
            side={THREE.DoubleSide}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  );
}
