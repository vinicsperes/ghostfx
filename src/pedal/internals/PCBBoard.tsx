import { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { PCB_BH, PCB_CU, SILK } from "../constants";
import {
  ElCap,
  ICDip,
  THResistor,
  Diode,
  DiscCap,
  Transistor,
  SilkRect,
  GhostSilk,
  SilkText,
  BeltonBrick,
  SilkRing,
} from "../parts";

export function PCBBoard({ w, l }: { w: number; l: number }) {
  const TH = 0.003;
  const top = PCB_BH / 2 + TH / 2;
  const silkY = top + 0.0024;

  const BACK_EXT = 0.38;
  const physL = l + BACK_EXT;

  const railX = w / 2 - 0.1;

  const d3: [number, number] = [0.5, -1.56];
  const c100: [number, number] = [0.22, -1.56];
  const c47: [number, number] = [-0.06, -1.56];
  const reg: [number, number] = [-0.34, -1.56];

  const raZ = -0.42;
  const raX = [0.08, 0.24, 0.39, 0.55];
  const rbZ = -0.42;
  const rbX = [-0.55, -0.39, -0.24, -0.08];

  const q1: [number, number] = [0.64, 0.1];
  const rIn: [number, number] = [0.66, -0.14];
  const ic1: [number, number] = [0.44, 0.42];
  const dg1: [number, number] = [0.66, 0.34];
  const dg2: [number, number] = [0.66, 0.52];
  const disc1: [number, number] = [0.42, 0.69];

  const ic2: [number, number] = [0.0, -0.02];
  const ecD: [number, number][] = [
    [-0.31, -1.18],
    [0.31, -1.18],
    [0.0, -0.7],
  ];
  const disc2: [number, number] = [-0.3, 0.18];
  const disc3: [number, number] = [-0.06, 0.18];

  const brick: [number, number] = [-0.44, 0.78];
  const q2: [number, number] = [-0.7, -0.28];
  const ecOut: [number, number] = [-0.7, -0.06];
  const rOut: [number, number] = [-0.7, 0.16];

  const zBack = -(l / 2 + BACK_EXT) + 0.04;
  const zFront = l / 2 - 0.06;

  type Seg = { x1: number; z1: number; x2: number; z2: number; tw: number };
  const segs: Seg[] = [
    { x1: -railX, z1: zBack, x2: railX, z2: zBack, tw: 0.03 },
    { x1: -railX, z1: zFront, x2: railX, z2: zFront, tw: 0.03 },
    { x1: -railX, z1: zBack, x2: -railX, z2: zFront, tw: 0.022 },
    { x1: railX, z1: zBack, x2: railX, z2: zFront, tw: 0.022 },

    { x1: d3[0], z1: d3[1], x2: c100[0], z2: c100[1], tw: 0.018 },
    { x1: c100[0], z1: c100[1], x2: c47[0], z2: c47[1], tw: 0.02 },
    { x1: c47[0], z1: c47[1], x2: reg[0], z2: reg[1], tw: 0.018 },
    { x1: reg[0], z1: reg[1], x2: ic2[0], z2: -0.32, tw: 0.013 },

    { x1: q1[0], z1: q1[1], x2: rIn[0], z2: rIn[1], tw: 0.012 },
    { x1: rIn[0], z1: rIn[1], x2: ic1[0], z2: ic1[1], tw: 0.012 },
    { x1: ic1[0], z1: ic1[1], x2: dg1[0], z2: dg1[1], tw: 0.011 },
    { x1: ic1[0], z1: ic1[1], x2: dg2[0], z2: dg2[1], tw: 0.011 },
    { x1: ic1[0], z1: ic1[1], x2: disc1[0], z2: disc1[1], tw: 0.011 },
    { x1: ic1[0], z1: ic1[1], x2: raX[1], z2: raZ, tw: 0.012 },
    { x1: raX[0], z1: raZ, x2: raX[3], z2: raZ, tw: 0.014 },
    { x1: raX[0], z1: raZ, x2: ic2[0], z2: ic2[1], tw: 0.012 },

    { x1: ic2[0], z1: ic2[1], x2: ecD[1][0], z2: ecD[1][1], tw: 0.013 },
    { x1: ic2[0], z1: ic2[1], x2: disc2[0], z2: disc2[1], tw: 0.011 },
    { x1: rbX[0], z1: rbZ, x2: rbX[3], z2: rbZ, tw: 0.014 },
    { x1: rbX[1], z1: rbZ, x2: ic2[0], z2: -0.32, tw: 0.012 },

    { x1: ic2[0], z1: 0.28, x2: brick[0] + 0.1, z2: 0.3, tw: 0.013 },
    { x1: brick[0], z1: 0.3, x2: q2[0], z2: q2[1], tw: 0.012 },
    { x1: q2[0], z1: q2[1], x2: ecOut[0], z2: ecOut[1], tw: 0.012 },
    { x1: q2[0], z1: q2[1], x2: rOut[0], z2: rOut[1], tw: 0.012 },
  ];

  type Conn = { px: number; pz: number; nx: number; nz: number };
  const conns: Conn[] = [
    { px: -0.55, pz: -1.15, nx: rbX[0], nz: rbZ },
    { px: 0.02, pz: -1.15, nx: ic2[0], nz: -0.32 },
    { px: 0.55, pz: -1.15, nx: rbX[3], nz: rbZ },
    { px: -0.26, pz: -0.89, nx: rbX[1], nz: rbZ },
    { px: 0.3, pz: -0.89, nx: rbX[3], nz: rbZ },
    { px: 0.14, pz: 0.88, nx: raX[0], nz: raZ },
    { px: -0.14, pz: 0.88, nx: brick[0] + 0.225, nz: 0.88 },
    { px: 0.74, pz: -0.74, nx: q1[0], nz: q1[1] },
    { px: -0.74, pz: -0.74, nx: q2[0], nz: q2[1] },
    { px: 0.14, pz: 0.13, nx: raX[0], nz: raZ },
    { px: 0.02, pz: 0.13, nx: raX[1], nz: raZ },
    { px: 0.5, pz: -1.48, nx: d3[0], nz: d3[1] },
    { px: -0.06, pz: -1.48, nx: c47[0], nz: c47[1] },
  ];
  conns.forEach(({ px, pz, nx, nz }) => segs.push({ x1: px, z1: pz, x2: nx, z2: nz, tw: 0.012 }));

  const boardTex = useMemo(() => {
    const cw = 512;
    const ch = Math.round(cw * (physL / w));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0e3a1c";
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = "rgba(176,140,58,0.34)";
    ctx.lineWidth = 1.4;
    const nx = 30;
    const nz = Math.round(nx * (physL / w));
    for (let i = 1; i < nx; i++) {
      const px = Math.round((i / nx) * cw) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ch);
      ctx.stroke();
    }
    for (let j = 1; j < nz; j++) {
      const py = Math.round((j / nz) * ch) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(cw, py);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }, [w, physL]);

  return (
    <group>
      <mesh receiveShadow position={[0, 0, -BACK_EXT / 2]}>
        <boxGeometry args={[w, PCB_BH, physL]} />
        <meshStandardMaterial map={boardTex} roughness={0.65} metalness={0.08} />
      </mesh>

      {segs.map(({ x1, z1, x2, z2, tw }, i) => {
        const hLen = Math.abs(x2 - x1);
        const vLen = Math.abs(z2 - z1);
        return (
          <group key={i}>
            {hLen > 0.006 && (
              <mesh position={[(x1 + x2) / 2, top, z1]}>
                <boxGeometry args={[hLen, TH, tw]} />
                <meshStandardMaterial color={PCB_CU} roughness={0.28} metalness={0.65} />
              </mesh>
            )}
            {vLen > 0.006 && (
              <mesh position={[x2, top, (z1 + z2) / 2]}>
                <boxGeometry args={[tw, TH, vLen]} />
                <meshStandardMaterial color={PCB_CU} roughness={0.28} metalness={0.65} />
              </mesh>
            )}
            <mesh position={[x2, top, z1]}>
              <cylinderGeometry args={[tw * 0.95, tw * 0.95, TH * 2.5, 8]} />
              <meshStandardMaterial color="#c8a040" roughness={0.18} metalness={0.74} />
            </mesh>
          </group>
        );
      })}

      {conns.map(({ px, pz }, i) => (
        <group key={`conn${i}`} position={[px, top, pz]}>
          <mesh>
            <cylinderGeometry args={[0.024, 0.024, TH * 2.5, 14]} />
            <meshStandardMaterial color="#c9b070" roughness={0.22} metalness={0.7} />
          </mesh>
          <mesh position={[0, TH * 1.6, 0]}>
            <sphereGeometry args={[0.014, 12, 8]} />
            <meshStandardMaterial color="#c4c4c8" metalness={0.85} roughness={0.26} />
          </mesh>
        </group>
      ))}

      {(
        [
          [-w / 2 + 0.07, -l / 2 + 0.07],
          [w / 2 - 0.07, -l / 2 + 0.07],
          [w / 2 - 0.07, l / 2 - 0.07],
          [-w / 2 + 0.07, l / 2 - 0.07],
        ] as [number, number][]
      ).map(([mx, mz], i) => (
        <mesh key={`mh${i}`} position={[mx, top, mz]}>
          <cylinderGeometry args={[0.028, 0.028, TH * 2.5, 12]} />
          <meshStandardMaterial color="#8a9a70" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      <SilkRect x={0} z={0} w={w - 0.1} d={l - 0.1} y={silkY} t={0.005} />
      <SilkRect x={ic1[0]} z={ic1[1]} w={0.24} d={0.34} y={silkY} />
      <SilkRect x={ic2[0]} z={ic2[1]} w={0.6} d={0.24} y={silkY} />
      <SilkRect x={brick[0]} z={brick[1]} w={0.49} d={0.95} y={silkY} />
      <SilkRing x={c100[0]} z={c100[1]} r={0.102} y={silkY} />
      <SilkRing x={c47[0]} z={c47[1]} r={0.084} y={silkY} />
      {ecD.map(([ex, ez], i) => (
        <SilkRing key={`secd${i}`} x={ex} z={ez} r={0.07} y={silkY} />
      ))}
      <SilkRing x={ecOut[0]} z={ecOut[1]} r={0.07} y={silkY} />
      {raX.map((rx, i) => (
        <SilkRect key={`sra${i}`} x={rx} z={raZ} w={0.08} d={0.3} y={silkY} t={0.003} />
      ))}
      {rbX.map((rx, i) => (
        <SilkRect key={`srb${i}`} x={rx} z={rbZ} w={0.08} d={0.3} y={silkY} t={0.003} />
      ))}

      {raX.map((rx, i) => (
        <SilkText key={`dra${i}`} x={rx} z={raZ + 0.21} y={silkY}>{`R${i + 1}`}</SilkText>
      ))}
      {rbX.map((rx, i) => (
        <SilkText key={`drb${i}`} x={rx} z={rbZ + 0.2} y={silkY}>{`R${i + 5}`}</SilkText>
      ))}
      <SilkText x={ic1[0]} z={ic1[1] + 0.24} y={silkY}>
        IC1
      </SilkText>
      <SilkText x={ic2[0]} z={ic2[1] + 0.18} y={silkY}>
        IC2
      </SilkText>
      <SilkText x={brick[0]} z={brick[1] - 0.55} y={silkY}>
        BR1
      </SilkText>
      <SilkText x={dg1[0] + 0.12} z={dg1[1]} y={silkY}>
        D1
      </SilkText>
      <SilkText x={dg2[0] + 0.12} z={dg2[1] + 0.06} y={silkY}>
        D2
      </SilkText>
      <SilkText x={d3[0] - 0.14} z={d3[1] + 0.07} y={silkY}>
        D3
      </SilkText>
      <SilkText x={q1[0]} z={q1[1] - 0.12} y={silkY}>
        Q1
      </SilkText>
      <SilkText x={q2[0]} z={q2[1] - 0.12} y={silkY}>
        Q2
      </SilkText>
      <SilkText x={reg[0]} z={reg[1] + 0.13} y={silkY}>
        REG
      </SilkText>
      <Text
        position={[0.245, silkY, 1.0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.036}
        color={SILK}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.05}
        renderOrder={6}
      >
        GHOST FX MK.I
      </Text>
      <GhostSilk x={0.6} z={1.0} y={silkY} size={0.1} />

      <ElCap x={c100[0]} z={c100[1]} h={0.3} r={0.085} color="#1a3a6a" label="100uF 25V" />
      <ElCap x={c47[0]} z={c47[1]} h={0.29} r={0.067} color="#1a1a1a" label="47uF" />
      <Transistor x={reg[0]} z={reg[1]} rot={Math.PI} />
      <Diode x={d3[0]} z={d3[1]} rot={Math.PI / 2} kind="power" />

      <Transistor x={q1[0]} z={q1[1]} rot={-Math.PI / 2} />
      <THResistor x={rIn[0]} z={rIn[1]} b1="#e0a010" b2="#101010" b3="#c02010" />
      <ICDip x={ic1[0]} z={ic1[1]} pins={8} label="GH4558D" />
      <Diode x={dg1[0]} z={dg1[1]} rot={Math.PI / 2} />
      <Diode x={dg2[0]} z={dg2[1]} rot={Math.PI / 2} />
      <DiscCap x={disc1[0]} z={disc1[1]} />
      <THResistor x={raX[0]} z={raZ} />
      <THResistor x={raX[1]} z={raZ} b1="#c02010" b2="#101010" b3="#e0a020" />
      <THResistor x={raX[2]} z={raZ} b1="#202080" b2="#c02010" b3="#e0a020" />
      <THResistor x={raX[3]} z={raZ} b1="#101010" b2="#e0a010" b3="#a0a010" />

      <ICDip x={ic2[0]} z={ic2[1]} pins={16} rot={Math.PI / 2} color="#1c1c1c" label="ECTO-399" />
      <ElCap x={ecD[0][0]} z={ecD[0][1]} h={0.2} r={0.054} color="#2a4a1a" label="10uF" />
      <ElCap x={ecD[1][0]} z={ecD[1][1]} h={0.2} r={0.054} color="#1a3a6a" label="10uF" />
      <ElCap x={ecD[2][0]} z={ecD[2][1]} h={0.2} r={0.054} color="#1a1a1a" label="22uF" />
      <DiscCap x={disc2[0]} z={disc2[1]} color="#c8a050" />
      <DiscCap x={disc3[0]} z={disc3[1]} color="#b8c070" />
      <THResistor x={rbX[0]} z={rbZ} b1="#e0a010" b2="#101010" b3="#c02010" />
      <THResistor x={rbX[1]} z={rbZ} />
      <THResistor x={rbX[2]} z={rbZ} b1="#202080" b2="#c02010" b3="#e0a020" />
      <THResistor x={rbX[3]} z={rbZ} b1="#101010" b2="#e0a010" b3="#a0a010" />

      <BeltonBrick x={brick[0]} z={brick[1]} />
      <Transistor x={q2[0]} z={q2[1]} rot={Math.PI / 2} />
      <ElCap x={ecOut[0]} z={ecOut[1]} h={0.2} r={0.054} color="#1a3a6a" label="10uF" />
      <THResistor x={rOut[0]} z={rOut[1]} />
    </group>
  );
}
