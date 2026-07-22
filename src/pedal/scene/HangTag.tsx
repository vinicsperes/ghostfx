import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TWIRL_STIFFNESS = 30;
const TWIRL_DAMPING = 7.5;

const PIVOT_BASE = { x: 0.123, y: 0.269, z: 1.66 };
const SWING_Y = 0.045;
const SWING_Z = 0.21;

const STRING_PTS: [number, number, number][] = [
  [0.0, 0.51, 1.202],
  [0.05, 0.505, 1.38],
  [0.08, 0.5, 1.52],
  [0.105, 0.44, 1.66],
  [0.118, 0.34, 1.683],
  [0.121, 0.295, 1.675],
  [0.123, 0.262, 1.65],
];
const STRING_FOLLOW = [0, 0, 0.1, 0.32, 0.62, 0.84, 1];

const buildStringGeo = (sw: number) => {
  const pts = STRING_PTS.map(
    (p, i) =>
      new THREE.Vector3(
        p[0],
        p[1] + SWING_Y * sw * STRING_FOLLOW[i],
        p[2] + SWING_Z * sw * STRING_FOLLOW[i],
      ),
  );
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.0075, 8, false);
};

export function HangTag() {
  const { tex, backTex, redraw, redrawBack, sigImg, emblemImg } = useMemo(() => {
    const TAG_DPR = 3;
    const makeLayer = () => {
      const c = document.createElement("canvas");
      c.width = 512 * TAG_DPR;
      c.height = 640 * TAG_DPR;
      const ctx = c.getContext("2d")!;
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 16;
      return { ctx, t };
    };
    const front = makeLayer();
    const back = makeLayer();

    const ink = "#14120e",
      card = "#f6f3ea",
      dim = "#2b2720";
    const UNB = "'Unbounded', sans-serif";
    const MONO = "'Space Mono', monospace";

    const sigImg = new Image();
    sigImg.src = "/tag-signature.svg";
    const emblemImg = new Image();
    emblemImg.src = "/tag-emblem.svg";

    const tagShape = (ctx: CanvasRenderingContext2D) => {
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

    const drawEyelet = (ctx: CanvasRenderingContext2D) => {
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
    };

    const drawGhost = (ctx: CanvasRenderingContext2D) => {
      const gs = 0.62;
      const gx = 256 - 32 * gs;
      const gy = 578 - 32 * gs;
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
    };

    const drawCard = (ctx: CanvasRenderingContext2D) => {
      ctx.setTransform(TAG_DPR, 0, 0, TAG_DPR, 0, 0);
      ctx.clearRect(0, 0, 512, 640);
      ctx.letterSpacing = "0px";
      tagShape(ctx);
      ctx.fillStyle = card;
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.textAlign = "center";
    };

    const redraw = () => {
      const ctx = front.ctx;
      drawCard(ctx);

      ctx.save();
      ctx.translate(256, 168);
      ctx.rotate(-0.055);
      ctx.font = `700 44px ${MONO}`;
      ctx.fillStyle = dim;
      ctx.fillText("$199", 0, 0);
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-68, -11);
      ctx.lineTo(68, -17);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = ink;
      ctx.font = `900 138px ${UNB}`;
      ctx.letterSpacing = "-7px";
      ctx.fillText("FREE", 256, 318);
      ctx.letterSpacing = "0px";

      if (sigImg.complete && sigImg.naturalWidth > 0) {
        const maxW = 420;
        const maxH = 188;
        const slotTop = 362;
        const aspect = sigImg.naturalWidth / sigImg.naturalHeight;
        let sw = maxW;
        let sh = maxW / aspect;
        if (sh > maxH) {
          sh = maxH;
          sw = maxH * aspect;
        }
        const sx = 256 - sw / 2;
        const sy = slotTop + (maxH - sh) / 2;
        ctx.drawImage(sigImg, sx, sy, sw, sh);
      }

      drawEyelet(ctx);
      front.t.needsUpdate = true;
    };

    const redrawBack = (hover = false) => {
      const ctx = back.ctx;
      drawCard(ctx);

      if (emblemImg.complete && emblemImg.naturalWidth > 0) {
        const ew = 424;
        const eh = (ew * 318) / 561;
        ctx.drawImage(emblemImg, 256 - ew / 2, 128, ew, eh);
      }

      ctx.font = `700 30px ${MONO}`;
      if (hover) {
        ctx.fillStyle = "#10a042";
        ctx.shadowColor = "#41ff77";
        ctx.shadowBlur = 22;
      } else {
        ctx.fillStyle = ink;
      }
      ctx.fillText("vinicsperes.com", 256, 468);
      ctx.shadowBlur = 0;

      drawGhost(ctx);
      drawEyelet(ctx);
      back.t.needsUpdate = true;
    };

    redraw();
    redrawBack();
    return { tex: front.t, backTex: back.t, redraw, redrawBack, sigImg, emblemImg };
  }, []);

  useEffect(() => {
    let alive = true;
    const fonts = document.fonts.ready.then(() =>
      Promise.all([
        document.fonts.load("900 150px Unbounded"),
        document.fonts.load("700 20px Unbounded"),
        document.fonts.load("700 15px 'Space Mono'"),
        document.fonts.load("400 11px 'Space Mono'"),
      ]),
    );
    Promise.all([fonts, sigImg.decode()])
      .then(() => {
        if (alive) redraw();
      })
      .catch(() => {});
    Promise.all([fonts, emblemImg.decode()])
      .then(() => {
        if (alive) redrawBack();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [redraw, redrawBack, sigImg, emblemImg]);

  const stringGeo = useMemo(() => buildStringGeo(0), []);
  const stringRef = useRef<THREE.Mesh>(null);
  const knotRef = useRef<THREE.Mesh>(null);
  const lastSwing = useRef(0);

  const EYELET_LOCAL_Y = 0.625 * (0.5 - 54 / 640);
  const pivot = useRef<THREE.Group>(null);
  const twirl = useRef({ angle: 0, vel: 0, target: 0 });
  const [hovered, setHovered] = useState(false);
  useFrame((_, dt) => {
    const g = pivot.current;
    if (!g) return;
    const d = Math.min(dt, 1 / 30);
    const s = twirl.current;
    s.vel += (-TWIRL_STIFFNESS * (s.angle - s.target) - TWIRL_DAMPING * s.vel) * d;
    s.angle += s.vel * d;
    g.rotation.y = s.angle;

    const sw = Math.abs(Math.sin(s.angle));
    g.position.y = PIVOT_BASE.y + SWING_Y * sw;
    g.position.z = PIVOT_BASE.z + SWING_Z * sw;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, (hovered ? -0.22 : 0) - 0.4 * sw, 6, dt);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, hovered ? -0.13 : -0.07, 6, dt);

    if (Math.abs(sw - lastSwing.current) > 0.004) {
      lastSwing.current = sw;
      const geo = buildStringGeo(sw);
      const m = stringRef.current;
      if (m) {
        m.geometry.dispose();
        m.geometry = geo;
      } else {
        geo.dispose();
      }
      knotRef.current?.position.set(0.122, 0.275 + SWING_Y * sw, 1.668 + SWING_Z * sw);
    }
  });

  useEffect(() => {
    redrawBack(hovered);
  }, [hovered, redrawBack]);

  const clickTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(clickTimer.current), []);
  const openSite = () => {
    const a = document.createElement("a");
    a.href = "https://vinicsperes.com";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  return (
    <group>
      <mesh
        position={[0.123, 0.02, 1.76]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
          twirl.current.target = Math.PI;
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = "";
          twirl.current.target = 0;
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (clickTimer.current) return;
          const s = twirl.current;
          s.target = Math.PI;
          if (Math.abs(s.angle - Math.PI) < 0.6) {
            openSite();
          } else {
            clickTimer.current = window.setTimeout(() => {
              clickTimer.current = 0;
              openSite();
            }, 1100);
          }
        }}
      >
        <boxGeometry args={[0.6, 0.78, 0.35]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={stringRef} geometry={stringGeo}>
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
      <mesh ref={knotRef} position={[0.122, 0.275, 1.668]}>
        <sphereGeometry args={[0.0125, 12, 10]} />
        <meshStandardMaterial color="#b3a688" roughness={0.95} metalness={0} />
      </mesh>
      <group
        ref={pivot}
        position={[PIVOT_BASE.x, PIVOT_BASE.y, PIVOT_BASE.z]}
        rotation={[0, 0, -0.07]}
      >
        <mesh position={[0, -EYELET_LOCAL_Y, 0]}>
          <planeGeometry args={[0.5, 0.625]} />
          <meshStandardMaterial
            map={tex}
            alphaTest={0.5}
            side={THREE.FrontSide}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        <mesh position={[0, -EYELET_LOCAL_Y, -0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.5, 0.625]} />
          <meshStandardMaterial
            map={backTex}
            alphaTest={0.5}
            side={THREE.FrontSide}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  );
}
