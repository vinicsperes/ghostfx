import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Svg } from "@react-three/drei";
import {
  DoubleSide,
  FrontSide,
  MathUtils,
  Path,
  Plane,
  Shape,
  Vector3,
  type Group,
  type PointLight,
  type Side,
} from "three";
import { Wire, CableClip, SideJack, PotBody, SwitchBody, Battery9V } from "../parts";
import { Knob3D, MasterKnob3D } from "../knobs";
import { Internals } from "../internals";
import { LabelText } from "./LabelText";
import { Footswitch3D } from "./Footswitch3D";
import { HangTag } from "./HangTag";

const GHOST_ICON = {
  scale: 0.0094,
  ip: [-0.3, 0.33] as [number, number],
  lp: [0.038, 0.076] as [number, number],
};

type PresetVisual = {
  pickguard: { top: string; mid: string; base: string; screw: string };
  knobTheme: "dark" | "cream";
  silk: string;
  ink: string;
  knobAccent: string;
  showArc: boolean;
};
const PRESET_VISUALS: PresetVisual[] = [
  {
    pickguard: { top: "#0a0a0e", mid: "#1a3520", base: "#06060a", screw: "#3a3a48" },
    knobTheme: "dark",
    silk: "#20f040",
    ink: "#e0e0ec",
    knobAccent: "#16a030",
    showArc: false,
  },
  {
    pickguard: { top: "#0a0612", mid: "#170926", base: "#050208", screw: "#2a1640" },
    knobTheme: "dark",
    silk: "#7d22c4",
    ink: "#e0d4f6",
    knobAccent: "#7d22c4",
    showArc: false,
  },
  {
    pickguard: { top: "#0a0c10", mid: "#141a22", base: "#050608", screw: "#2a3340" },
    knobTheme: "dark",
    silk: "#a8c4dc",
    ink: "#e8eef6",
    knobAccent: "#a8c4dc",
    showArc: false,
  },
  {
    pickguard: { top: "#0a0a0e", mid: "#180808", base: "#06060a", screw: "#2a1010" },
    knobTheme: "dark",
    silk: "#e02828",
    ink: "#f0b0b0",
    knobAccent: "#cc2020",
    showArc: false,
  },
  {
    pickguard: { top: "#0e0810", mid: "#1e0a1a", base: "#070409", screw: "#3a1830" },
    knobTheme: "dark",
    silk: "#d46a9f",
    ink: "#f4d2e6",
    knobAccent: "#d46a9f",
    showArc: false,
  },
  {
    pickguard: { top: "#0f0614", mid: "#210a26", base: "#070310", screw: "#3c1648" },
    knobTheme: "dark",
    silk: "#f02a96",
    ink: "#f8c8e6",
    knobAccent: "#d8228a",
    showArc: false,
  },
];

export function PedalBody({
  palette,
  xray = false,
  explode = 0,
  circuitOnly = false,
  hideTag = false,
  split = false,
  spin = null,
  ledColor,
  ledActive,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
  knobMod,
  knobMaster,
  onKnobChange,
  setControlsEnabled,
  bootTrigger,
  presetIdx = null,
  onChassisEnter,
  onChassisLeave,
  pressed,
  onPress,
  onRelease,
  onCancel,
}: {
  palette: { pedal: string; ink: string; accent: string; cream: string; metal: string };
  xray?: boolean;
  explode?: number;
  circuitOnly?: boolean;
  hideTag?: boolean;
  split?: boolean;
  spin?: number | null;
  ledColor: string;
  ledActive: boolean;
  knobDrive: number;
  knobEcho: number;
  knobTone: number;
  knobReverb: number;
  knobMod: number;
  knobMaster: number;
  onKnobChange: (
    knob: "drive" | "echo" | "tone" | "reverb" | "mod" | "master",
    value: number,
  ) => void;
  setControlsEnabled: (enabled: boolean) => void;
  bootTrigger: number;
  presetIdx?: number | null;
  onChassisEnter: () => void;
  onChassisLeave: () => void;
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onCancel: () => void;
}) {
  const v = presetIdx !== null ? PRESET_VISUALS[presetIdx] : null;
  const inkColor = v?.ink ?? palette.ink;
  const silkColor = v?.silk ?? palette.accent;
  const knobAccent = v?.knobAccent ?? palette.accent;
  const knobTheme: "dark" | "cream" = v?.knobTheme ?? "dark";

  const rootRef = useRef<Group>(null);
  const glowRef = useRef<PointLight>(null);
  const clipBottom = useMemo(() => new Plane(new Vector3(0, -1, 0), 0), []);
  const clipTop = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  useFrame((state, delta) => {
    const g = rootRef.current;
    if (g) {
      const bob = explode > 0.01 ? Math.sin(state.clock.elapsedTime * 0.8) * 0.06 * explode : 0;
      g.position.y = MathUtils.damp(g.position.y, (pressed ? -0.011 : 0) + bob, 9, delta);
      g.rotation.x = MathUtils.damp(g.rotation.x, pressed ? 0.009 : 0, 9, delta);
      if (spin != null) g.rotation.y = spin;
      else g.rotation.y += delta * 0.22 * explode;
      clipBottom.constant = g.position.y;
      clipTop.constant = -(explode * 0.95 + g.position.y);
    }
    const gl = glowRef.current;
    if (gl) gl.intensity = MathUtils.damp(gl.intensity, ledActive ? 0.55 : 0, 5, delta);
  });

  const W = 2.1;
  const H = 0.95;
  const L = 3.2;
  const WALL = 0.075;

  const rimShape = useMemo(() => {
    const rr = (ctx: Shape | Path, w: number, l: number, r: number) => {
      const x = w / 2;
      const z = l / 2;
      ctx.moveTo(-x + r, -z);
      ctx.lineTo(x - r, -z);
      ctx.quadraticCurveTo(x, -z, x, -z + r);
      ctx.lineTo(x, z - r);
      ctx.quadraticCurveTo(x, z, x - r, z);
      ctx.lineTo(-x + r, z);
      ctx.quadraticCurveTo(-x, z, -x, z - r);
      ctx.lineTo(-x, -z + r);
      ctx.quadraticCurveTo(-x, -z, -x + r, -z);
    };
    const shape = new Shape();
    rr(shape, W, L, 0.08);
    const hole = new Path();
    rr(hole, W - 2 * WALL, L - 2 * WALL, Math.max(0.02, 0.08 - WALL));
    shape.holes.push(hole);
    return shape;
  }, []);

  const FSZ = 1.05;

  const kp = {
    drive: [-0.62, H / 2, -1.05] as [number, number, number],
    echo: [0.0, H / 2, -1.05] as [number, number, number],
    reverb: [0.62, H / 2, -1.05] as [number, number, number],
    tone: [-0.62, H / 2, -0.52] as [number, number, number],
    mod: [0.0, H / 2, -0.52] as [number, number, number],
    master: [0.62, H / 2, -0.52] as [number, number, number],
  };

  const LY = {
    circuit: explode * 0.5,
    top: explode * 0.95,
    above: explode * 1.15,
  };
  const baseOp = xray ? 0.12 : 0.82;
  const splitOp = xray ? 0.12 : baseOp - 0.26 * Math.min(1, explode / 0.25);
  const chassisMat = (opacity: number, clip?: Plane[], side: Side = FrontSide) => (
    <meshPhysicalMaterial
      color={palette.pedal}
      roughness={0.3}
      metalness={0.2}
      envMapIntensity={0.5}
      clearcoat={0.45}
      clearcoatRoughness={0.12}
      transparent
      opacity={opacity}
      depthWrite={false}
      clippingPlanes={clip}
      clipShadows={!!clip}
      side={side}
    />
  );

  return (
    <group ref={rootRef}>
      <group position={[0, LY.circuit, 0]}>
        <Internals width={W} length={L} height={H} />
      </group>

      <pointLight
        ref={glowRef}
        position={[0, 0.18, 0.2]}
        color={ledColor}
        intensity={0}
        distance={2.4}
        decay={2}
      />

      {!circuitOnly &&
        (split ? (
          <>
            <RoundedBox position={[0, 0, 0]} args={[W, H, L]} radius={0.08} smoothness={8}>
              {chassisMat(splitOp, [clipBottom], DoubleSide)}
            </RoundedBox>
            <group position={[0, LY.top, 0]}>
              <RoundedBox position={[0, 0, 0]} args={[W, H, L]} radius={0.08} smoothness={8}>
                {chassisMat(splitOp, [clipTop], DoubleSide)}
              </RoundedBox>
            </group>
          </>
        ) : (
          <RoundedBox
            position={[0, 0, 0]}
            args={[W, H, L]}
            radius={0.08}
            smoothness={8}
            onPointerEnter={onChassisEnter}
            onPointerLeave={onChassisLeave}
          >
            {chassisMat(baseOp)}
          </RoundedBox>
        ))}

      {!circuitOnly && split && (
        <>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, explode]}>
            <extrudeGeometry args={[rimShape, { depth: 0.05, bevelEnabled: false }]} />
            <meshStandardMaterial color={palette.pedal} roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[0, LY.top, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, explode]}>
            <extrudeGeometry args={[rimShape, { depth: 0.05, bevelEnabled: false }]} />
            <meshStandardMaterial color={palette.pedal} roughness={0.95} metalness={0} />
          </mesh>
        </>
      )}

      {!circuitOnly && (
        <group position={[0, LY.top, 0]}>
          <SideJack orient="back" position={[-0.5, 0.1, -L / 2 - 0.02]} metal={palette.metal} />
          <SideJack orient="back" position={[0.5, 0.1, -L / 2 - 0.02]} metal={palette.metal} />
        </group>
      )}
      {!hideTag && !circuitOnly && (
        <group position={[0, LY.top, 0]}>
          <HangTag />
        </group>
      )}

      {!circuitOnly &&
        (
          [
            [-0.8, -1.25],
            [0.8, -1.25],
            [0.8, 1.25],
            [-0.8, 1.25],
          ] as [number, number][]
        ).map(([fx, fz], i) => (
          <mesh key={`foot${i}`} position={[fx, -H / 2 - 0.035, fz]} castShadow>
            <cylinderGeometry args={[0.085, 0.095, 0.04, 20]} />
            <meshStandardMaterial color="#0e0e10" roughness={0.9} metalness={0} />
          </mesh>
        ))}

      {!circuitOnly && (
      <group position={[0, LY.top, 0]}>
      <group position={[0, H / 2 + 0.02, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <Svg
          src="/ghost-led-solo.svg"
          scale={GHOST_ICON.scale}
          position={[GHOST_ICON.ip[0], GHOST_ICON.ip[1], 0]}
          fillMaterial={{
            color: inkColor,
            transparent: false,
            opacity: 1,
            depthWrite: true,
            side: FrontSide,
          }}
          strokeMaterial={{
            color: inkColor,
            transparent: false,
            opacity: 1,
            depthWrite: true,
            side: FrontSide,
          }}
        />
        <group position={[GHOST_ICON.lp[0], GHOST_ICON.lp[1], 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.012, 0]}>
            <sphereGeometry args={[0.05, 28, 22]} />
            <meshBasicMaterial color={ledActive ? ledColor : "#15171a"} />
          </mesh>
          {ledActive && (
            <mesh position={[0, 0.012, 0]}>
              <sphereGeometry args={[0.085, 22, 18]} />
              <meshBasicMaterial color={ledColor} transparent opacity={0.35} />
            </mesh>
          )}
        </group>
      </group>

      <LabelText
        font="/fonts/saira-800.woff"
        position={[0, H / 2 + 0.02, 0.55]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.17}
        color={inkColor}
        outlineColor={inkColor}
        outlineWidth="2%"
        anchorX="center"
        letterSpacing={-0.035}
      >
        GHOSTFX
      </LabelText>

      <LabelText
        position={[kp.drive[0], H / 2 + 0.005, kp.drive[2] + 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.062}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        DRIVE
      </LabelText>
      <LabelText
        position={[kp.echo[0], H / 2 + 0.005, kp.echo[2] + 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.062}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        ECHO
      </LabelText>
      <LabelText
        position={[kp.tone[0], H / 2 + 0.005, kp.tone[2] + 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.062}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        TONE
      </LabelText>
      <LabelText
        position={[kp.reverb[0], H / 2 + 0.005, kp.reverb[2] + 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.062}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        REVERB
      </LabelText>
      <LabelText
        position={[kp.mod[0], H / 2 + 0.005, kp.mod[2] + 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.062}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        MOD
      </LabelText>
      <LabelText
        position={[kp.master[0], H / 2 + 0.005, kp.master[2] + 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.062}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        VOLUME
      </LabelText>

      <LabelText
        position={[-0.5, 0.3, -L / 2 - 0.002]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.052}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        OUT
      </LabelText>
      <LabelText
        position={[0.5, 0.3, -L / 2 - 0.002]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.052}
        color={silkColor}
        outlineColor={silkColor}
        outlineWidth="1%"
        anchorX="center"
      >
        IN
      </LabelText>
      {[kp.drive, kp.echo, kp.reverb, kp.tone, kp.mod, kp.master].map((p, i) => (
        <mesh key={`hole${i}`} position={[p[0], H / 2 + 0.002, p[2]]}>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 28]} />
          <meshStandardMaterial color="#050505" roughness={0.85} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, H / 2 + 0.002, FSZ]}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 28]} />
        <meshStandardMaterial color="#050505" roughness={0.85} metalness={0.1} />
      </mesh>
      </group>
      )}

      {!circuitOnly && (
      <group position={[0, LY.above, 0]}>
      <Knob3D
        position={kp.drive}
        value={knobDrive}
        onChange={(val) => onKnobChange("drive", val)}
        ink={inkColor}
        accent={knobAccent}
        label="Drive"
        setControlsEnabled={setControlsEnabled}
        bootTrigger={bootTrigger}
        delay={0.0}
        knobTheme={knobTheme}
        knobStyle="default"
        showArc={v?.showArc}
      />
      <Knob3D
        position={kp.echo}
        value={knobEcho}
        onChange={(val) => onKnobChange("echo", val)}
        ink={inkColor}
        accent={knobAccent}
        label="Echo"
        setControlsEnabled={setControlsEnabled}
        bootTrigger={bootTrigger}
        delay={0.08}
        knobTheme={knobTheme}
        knobStyle="default"
        showArc={v?.showArc}
      />
      <Knob3D
        position={kp.tone}
        value={knobTone}
        onChange={(val) => onKnobChange("tone", val)}
        ink={inkColor}
        accent={knobAccent}
        label="Tone"
        setControlsEnabled={setControlsEnabled}
        bootTrigger={bootTrigger}
        delay={0.16}
        knobTheme={knobTheme}
        knobStyle="default"
        showArc={v?.showArc}
      />
      <Knob3D
        position={kp.reverb}
        value={knobReverb}
        onChange={(val) => onKnobChange("reverb", val)}
        ink={inkColor}
        accent={knobAccent}
        label="Reverb"
        setControlsEnabled={setControlsEnabled}
        bootTrigger={bootTrigger}
        delay={0.24}
        knobTheme={knobTheme}
        knobStyle="default"
        showArc={v?.showArc}
      />
      <Knob3D
        position={kp.mod}
        value={knobMod}
        onChange={(val) => onKnobChange("mod", val)}
        ink={inkColor}
        accent={knobAccent}
        label="Mod"
        setControlsEnabled={setControlsEnabled}
        bootTrigger={bootTrigger}
        delay={0.32}
        knobTheme={knobTheme}
        knobStyle="default"
        showArc={v?.showArc}
      />
      <MasterKnob3D
        position={kp.master}
        value={knobMaster}
        onChange={(val) => onKnobChange("master", val)}
        accent={knobAccent}
        setControlsEnabled={setControlsEnabled}
        bootTrigger={bootTrigger}
        delay={0.4}
        knobTheme={knobTheme}
        knobStyle="default"
        showArc={v?.showArc}
        mutedHint={ledActive && knobMaster < 0.02}
      />
      </group>
      )}

      {!circuitOnly && (
        <group position={[0, LY.above, 0]}>
          <Footswitch3D
            position={[0, H / 2 + 0.01, FSZ]}
            pressed={pressed}
            onPress={onPress}
            onRelease={onRelease}
            onCancel={onCancel}
            metal={palette.metal}
            accent={palette.accent}
            active={ledActive}
          />
        </group>
      )}

      {(() => {
        const topY = H / 2;
        const POT_LUG_Y = topY - 0.21;
        const POT_LUG_Z = -0.1;
        const SW_LUG_Y = topY - 0.235;
        const LED_Y = topY - 0.06;
        const PAD_Y = -0.026;
        return (
          <group position={[0, LY.circuit, 0]}>
            <PotBody x={kp.drive[0]} z={kp.drive[2]} topY={topY} />
            <PotBody x={kp.echo[0]} z={kp.echo[2]} topY={topY} />
            <PotBody x={kp.reverb[0]} z={kp.reverb[2]} topY={topY} />
            <PotBody x={kp.tone[0]} z={kp.tone[2]} topY={topY} />
            <PotBody x={kp.mod[0]} z={kp.mod[2]} topY={topY} />
            <PotBody x={kp.master[0]} z={kp.master[2]} topY={topY} />
            <SwitchBody x={0} z={FSZ} topY={topY} />
            <Battery9V />

            <Wire
              start={[0.32, -0.26, -0.7]}
              mid={[0.41, -0.12, -0.76]}
              end={[0.45, PAD_Y, -0.8]}
              color="#d02020"
            />
            <Wire
              start={[0.32, -0.26, -0.48]}
              mid={[0.42, -0.12, -0.5]}
              end={[0.47, PAD_Y, -0.56]}
              color="#181818"
            />

            <Wire
              start={[kp.drive[0], POT_LUG_Y, kp.drive[2] + POT_LUG_Z]}
              mid={[kp.drive[0], 0.03, kp.drive[2] + POT_LUG_Z]}
              end={[-0.55, PAD_Y, -0.98]}
              color="#202020"
            />
            <Wire
              start={[kp.echo[0], POT_LUG_Y, kp.echo[2] + POT_LUG_Z]}
              mid={[kp.echo[0], 0.03, kp.echo[2] + POT_LUG_Z]}
              end={[0.02, PAD_Y, -0.98]}
              color="#22aa3a"
            />
            <Wire
              start={[kp.reverb[0], POT_LUG_Y, kp.reverb[2] + POT_LUG_Z]}
              mid={[kp.reverb[0], 0.03, kp.reverb[2] + POT_LUG_Z]}
              end={[0.55, PAD_Y, -0.98]}
              color="#e0b020"
            />
            <Wire
              start={[kp.tone[0], POT_LUG_Y, kp.tone[2] + POT_LUG_Z]}
              mid={[kp.tone[0], 0.03, kp.tone[2] + POT_LUG_Z]}
              end={[-0.26, PAD_Y, -0.72]}
              color="#e8e8e8"
            />
            <Wire
              start={[kp.mod[0], POT_LUG_Y, kp.mod[2] + POT_LUG_Z]}
              mid={[kp.mod[0], 0.03, kp.mod[2] + POT_LUG_Z]}
              end={[0.02, PAD_Y, -0.6]}
              color="#3a6ad0"
            />
            <Wire
              start={[kp.master[0], POT_LUG_Y, kp.master[2] + POT_LUG_Z]}
              mid={[kp.master[0], 0.03, kp.master[2] + POT_LUG_Z]}
              end={[0.3, PAD_Y, -0.72]}
              color="#d02020"
            />

            <Wire start={[0.08, SW_LUG_Y, FSZ - 0.08]} end={[0.14, PAD_Y, 1.05]} color="#22aa3a" />
            <Wire
              start={[-0.08, SW_LUG_Y, FSZ - 0.08]}
              end={[-0.14, PAD_Y, 1.05]}
              color="#3a6ad0"
            />
            <Wire
              start={[0.5, 0.15, -1.42]}
              mids={[
                [0.8, -0.01, -1.05],
                [0.8, -0.02, -0.2],
                [0.8, -0.02, 0.4],
                [0.8, -0.02, 0.72],
                [0.42, -0.01, 1.02],
              ]}
              end={[0.08, SW_LUG_Y, FSZ - 0.08]}
              color="#e8e8e8"
              r={0.009}
            />
            <Wire
              start={[0.42, 0.06, -1.42]}
              end={[0.7, PAD_Y, -1.12]}
              color="#181818"
              sag={0.03}
              r={0.009}
            />
            <CableClip x={0.8} z={-0.2} />
            <CableClip x={0.8} z={0.4} />
            <CableClip x={0.8} z={0.72} />
            <CableClip x={-0.8} z={-0.35} />
            <CableClip x={-0.8} z={0.1} />
            <Wire
              start={[0.08, SW_LUG_Y, FSZ + 0.08]}
              end={[-0.08, SW_LUG_Y, FSZ + 0.08]}
              color="#d02020"
              sag={0.04}
              r={0.009}
            />
            <Wire
              start={[-0.08, SW_LUG_Y + 0.02, FSZ]}
              end={[-0.08, SW_LUG_Y - 0.02, FSZ - 0.08]}
              color="#181818"
              sag={0.025}
              r={0.009}
            />
            <Wire
              start={[0, SW_LUG_Y, FSZ + 0.08]}
              mids={[
                [0.2, -0.01, 0.78],
                [0.34, -0.02, 0.34],
                [0.33, -0.02, 0.02],
              ]}
              end={[0.24, PAD_Y, -0.05]}
              color="#181818"
              r={0.009}
            />

            <Wire
              start={[-0.5, 0.15, -1.42]}
              mids={[
                [-0.8, -0.01, -1.05],
                [-0.8, -0.02, -0.35],
              ]}
              end={[-0.78, PAD_Y, 0.2]}
              color="#3a8ade"
              sag={0.03}
            />
            <Wire
              start={[-0.42, 0.06, -1.42]}
              end={[-0.68, PAD_Y, -1.12]}
              color="#181818"
              sag={0.03}
              r={0.009}
            />

            <Wire start={[0.035, LED_Y, 0.17]} end={[0.14, PAD_Y, 0.3]} color="#d02020" r={0.008} />
            <Wire
              start={[-0.035, LED_Y, 0.17]}
              end={[0.02, PAD_Y, 0.3]}
              color="#181818"
              r={0.008}
            />
          </group>
        );
      })()}
    </group>
  );
}
