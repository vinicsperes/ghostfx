import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, Text, RoundedBox, Environment, OrbitControls, Svg, Html } from "@react-three/drei";
import * as THREE from "three";
import { PCB_BH, PCB_CU, SILK } from "./pedal/constants";
import { Wire, CableClip, SideJack, PotBody, SwitchBody, Battery9V } from "./pedal/parts";
import { Knob3D, MasterKnob3D } from "./pedal/knobs";
import { Internals } from "./pedal/internals";

// touch devices hide the mouse-oriented hints; narrow screens frame the pedal closer
const IS_TOUCH = typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);
const IS_NARROW = typeof window !== "undefined" && window.innerWidth < 768;

function ResponsiveCamera() {
  const { camera } = useThree();
  useEffect(() => {
    const update = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = window.innerWidth < 768 ? 48 : 34;
        camera.updateProjectionMatrix();
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [camera]);
  return null;
}

export default function Pedal3D({
  ledColor,
  isPlaying,
  onTap,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
  knobMaster,
  onKnobChange,
  palette,
  presetIdx = null,
  stompCount = 0,
  view,
  xray = false,
}: {
  ledColor: string;
  isPlaying: boolean;
  onTap: () => void;
  knobDrive: number;
  knobEcho: number;
  knobTone: number;
  knobReverb: number;
  knobMaster: number;
  onKnobChange: (knob: "drive" | "echo" | "tone" | "reverb" | "master", value: number) => void;
  palette: { pedal: string; ink: string; accent: string; cream: string; metal: string };
  presetIdx?: number | null;
  stompCount?: number;
  // test mode: fixed camera position (looks at origin); disables orbit + hints
  view?: [number, number, number];
  xray?: boolean; // make the enclosure near-transparent to inspect the internals
}) {
  const ledActive = isPlaying;
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [bootTrigger, setBootTrigger] = useState(0);
  const chassisHoveredRef = useRef(false);
  const orbitingRef = useRef(false);

  const onChassisEnter = useCallback(() => {
    chassisHoveredRef.current = true;
    if (!orbitingRef.current) document.body.style.cursor = "move";
  }, []);
  const onChassisLeave = useCallback(() => {
    chassisHoveredRef.current = false;
    if (!orbitingRef.current) document.body.style.cursor = "";
  }, []);
  const prevPlaying = useRef(false);
  useEffect(() => {
    if (isPlaying && !prevPlaying.current) setBootTrigger(t => t + 1);
    prevPlaying.current = isPlaying;
  }, [isPlaying]);

  return (
    <div style={{ width: "100%", height: "100%", userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}>
      <Canvas
        shadows="percentage"
        dpr={IS_NARROW ? [1, 1.5] : [1, 2]}
        camera={{ position: view ?? (IS_NARROW ? [-1.3, 5.9, 4.6] : [-1.5, 7.0, 5.5]), fov: 34, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
      >

        <Environment preset="city" environmentIntensity={0.8} />

        <ambientLight intensity={0.25} />

        <directionalLight position={[-4, 6, 3]} intensity={2.8} color="#e8dfc8" castShadow shadow-mapSize={IS_NARROW ? [1024, 1024] : [2048, 2048]} />

        <directionalLight position={[5, 4, -3]} intensity={1.6} color="#c8d8f0" />

        <pointLight position={[0, -3, 5]} intensity={1.2} color="#ffffff" />

        <ResponsiveCamera />
        <OrbitControls
          enabled={controlsEnabled && !view}
          enableDamping
          dampingFactor={0.05}
          minDistance={2.1}
          maxDistance={10}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          makeDefault
          onStart={() => {
            setHasInteracted(true);
            orbitingRef.current = true;
            document.body.style.cursor = "grabbing";
          }}
          onEnd={() => {
            orbitingRef.current = false;
            document.body.style.cursor = chassisHoveredRef.current ? "move" : "";
          }}
        />
        <CameraShake stompCount={stompCount} />

        <group
          position={[0, 0, 0]}
          onPointerDown={() => setHasInteracted(true)}
        >
          {!hasInteracted && !IS_TOUCH && !view && <HintSystem accent={palette.accent} />}
          <PedalScene
            palette={palette}
            xray={xray}
            ledColor={ledColor}
            ledActive={ledActive}
            onTap={onTap}
            knobDrive={knobDrive}
            knobEcho={knobEcho}
            knobTone={knobTone}
            knobReverb={knobReverb}
            knobMaster={knobMaster}
            onKnobChange={onKnobChange}
            setControlsEnabled={setControlsEnabled}
            bootTrigger={bootTrigger}
            presetIdx={presetIdx}
            onChassisEnter={onChassisEnter}
            onChassisLeave={onChassisLeave}
          />
        </group>
      </Canvas>
    </div>
  );
}

function HintSystem({ accent }: { accent: string }) {
  return (
    <group>
      <SideHint
        label="DRAG KNOBS"
        labelPos={[2.4, 0.9, -0.8]}
        targetPos={[0.72, 0.58, -1.0]}
        accent={accent}
      />
      <SideHint
        label="STOMP"
        labelPos={[1.4, 1.1, 1.3]}
        targetPos={[0.22, 0.82, 1.05]}
        accent={accent}
      />
      <SideHint
        label="ROTATE"
        labelPos={[-1.7, 0.8, 0.4]}
        targetPos={[-1.08, 0.2, 0.3]}
        accent={accent}
        alignRight
      />
    </group>
  );
}

function SideHint({
  label,
  labelPos,
  targetPos,
  accent,
  alignRight = false,
}: {
  label: string;
  labelPos: [number, number, number];
  targetPos: [number, number, number];
  accent: string;
  alignRight?: boolean;
}) {
  return (
    <group>

      <Line
        points={[labelPos, targetPos]}
        color={accent}
        lineWidth={1}
        transparent={true}
        opacity={0.45}
        dashed
        dashSize={0.08}
        gapSize={0.05}
      />

      <mesh position={targetPos}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={accent} />
      </mesh>

      <Html position={labelPos} center distanceFactor={6}>
        <div
          className="pointer-events-none select-none whitespace-nowrap font-[var(--font-pixel)] animate-pulse"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            padding: "5px 10px",
            borderRadius: 3,
            background: "rgba(0,0,0,0.88)",
            border: `1px solid ${accent}88`,
            color: accent,
            backdropFilter: "blur(4px)",
            textAlign: alignRight ? "right" : "left",
            boxShadow: `0 0 12px ${accent}22`,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

const GHOST_ICON = { scale: 0.0094, ip: [-0.300, 0.330] as [number, number], lp: [0.038, 0.076] as [number, number] };

type PresetVisual = {
  pickguard: { top: string; mid: string; base: string; screw: string };
  knobTheme: "dark" | "cream";
  silk:  string;
  ink:   string;
  knobAccent: string;
  showArc: boolean;
};
const PRESET_VISUALS: PresetVisual[] = [
  { pickguard: { top: "#0a0710", mid: "#150a22", base: "#050409", screw: "#231334" }, knobTheme: "dark", silk: "#8a2be2", ink: "#e0d4f6", knobAccent: "#8a2be2", showArc: false },
  { pickguard: { top: "#0c0c0e", mid: "#16161a", base: "#050506", screw: "#2a2a30" }, knobTheme: "dark", silk: "#cdd2da", ink: "#ececf0", knobAccent: "#cdd2da", showArc: false },
  { pickguard: { top: "#0a0a0e", mid: "#180808", base: "#06060a", screw: "#2a1010" }, knobTheme: "dark", silk: "#e02828", ink: "#f0b0b0", knobAccent: "#cc2020", showArc: false },
  { pickguard: { top: "#100806", mid: "#200a04", base: "#090504", screw: "#3a1810" }, knobTheme: "dark", silk: "#ff4a28", ink: "#f8d2c4", knobAccent: "#ff4a28", showArc: false },
  { pickguard: { top: "#0a0a0e", mid: "#1a3520", base: "#06060a", screw: "#3a3a48" }, knobTheme: "dark", silk: "#20f040", ink: "#e0e0ec", knobAccent: "#16a030", showArc: false },
];

function LabelText(props: React.ComponentProps<typeof Text>) {
  const ref = useRef<any>(null);
  useFrame(() => {
    const mat = ref.current?.material;
    if (mat) {
      if (mat.alphaTest !== 0.5) { mat.alphaTest = 0.5; mat.needsUpdate = true; }
      if (mat.depthTest !== false) { mat.depthTest = false; mat.needsUpdate = true; }
    }
  });
  return <Text ref={ref} renderOrder={100} {...props} />;
}

function PedalBody({
  palette,
  xray = false,
  ledColor,
  ledActive,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
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
  ledColor: string;
  ledActive: boolean;
  knobDrive: number;
  knobEcho: number;
  knobTone: number;
  knobReverb: number;
  knobMaster: number;
  onKnobChange: (knob: "drive" | "echo" | "tone" | "reverb" | "master", value: number) => void;
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
  const svgMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: inkColor }), [inkColor]);

  const W = 2.10;
  const H = 0.95;
  const L = 3.20;

  const FSZ = 1.05;

  const kp = {
    drive:  [-0.62, H / 2, -1.05] as [number, number, number],
    echo:   [ 0.00, H / 2, -1.05] as [number, number, number],
    reverb: [ 0.62, H / 2, -1.05] as [number, number, number],
    tone:   [-0.31, H / 2, -0.52] as [number, number, number],
    master: [ 0.31, H / 2, -0.52] as [number, number, number],
  };

  return (
    <group>
      <Internals width={W} length={L} height={H} />

      <RoundedBox
        position={[0, 0, 0]}
        args={[W, H, L]}
        radius={0.08}
        smoothness={8}
        onPointerEnter={onChassisEnter}
        onPointerLeave={onChassisLeave}
      >
        <meshPhysicalMaterial
          color={palette.pedal}
          roughness={0.30}
          metalness={0.20}
          envMapIntensity={0.5}
          clearcoat={0.45}
          clearcoatRoughness={0.12}
          transparent
          opacity={xray ? 0.12 : 0.82}
          depthWrite={false}
        />
      </RoundedBox>

      {/* I/O jacks recessed into the rear third: output left, input right */}
      <SideJack position={[-W / 2 - 0.04, 0.08, -0.60]} metal={palette.metal} />
      <SideJack position={[W / 2 + 0.04, 0.08, -0.60]} metal={palette.metal} />
      <HangTag />

      <group position={[0, H / 2 + 0.02, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>

        <Svg src="/ghost-led-solo.svg" scale={GHOST_ICON.scale} position={[GHOST_ICON.ip[0], GHOST_ICON.ip[1], 0]} fillMaterial={svgMaterial as any} strokeMaterial={svgMaterial as any} />
        {/* cyclops eye: a filled LED disc on the solid body (no dark ring) */}
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

      {/* one-ink mono silkscreen wordmark, centred under the ghost mark */}
      <LabelText font="/fonts/saira-800.woff" position={[0, H / 2 + 0.02, 0.55]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.17} color={inkColor} outlineColor={inkColor} outlineWidth="2%" anchorX="center" letterSpacing={-0.035}>GHOSTFX</LabelText>

      <LabelText position={[kp.drive[0],  H / 2 + 0.005, kp.drive[2]  + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">DRIVE</LabelText>
      <LabelText position={[kp.echo[0],   H / 2 + 0.005, kp.echo[2]   + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">ECHO</LabelText>
      <LabelText position={[kp.tone[0],   H / 2 + 0.005, kp.tone[2]   + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">TONE</LabelText>
      <LabelText position={[kp.reverb[0], H / 2 + 0.005, kp.reverb[2] + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">REVERB</LabelText>
      <LabelText position={[kp.master[0], H / 2 + 0.005, kp.master[2] + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">VOLUME</LabelText>

      <Knob3D position={kp.drive}  value={knobDrive}  onChange={(val) => onKnobChange("drive",  val)} ink={inkColor} accent={knobAccent} label="Drive"  setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.00} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.echo}   value={knobEcho}   onChange={(val) => onKnobChange("echo",   val)} ink={inkColor} accent={knobAccent} label="Echo"   setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.08} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.tone}   value={knobTone}   onChange={(val) => onKnobChange("tone",   val)} ink={inkColor} accent={knobAccent} label="Tone"   setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.16} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.reverb} value={knobReverb} onChange={(val) => onKnobChange("reverb", val)} ink={inkColor} accent={knobAccent} label="Reverb" setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.24} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <MasterKnob3D position={kp.master} value={knobMaster} onChange={(val) => onKnobChange("master", val)} accent={knobAccent} setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.32} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />

      <Footswitch3D
        position={[0, H / 2 + 0.01, FSZ]}
        pressed={pressed}
        onPress={onPress}
        onRelease={onRelease}
        onCancel={onCancel}
        metal={palette.metal}
        accent={palette.accent}
      />

      {(() => {
        const topY = H / 2;
        const POT_LUG_Y = topY - 0.21;
        const POT_LUG_Z = -0.10;
        const SW_LUG_Y = topY - 0.235; // matches SwitchBody lugY (topY - 0.055 - h, h=0.18)
        const LED_Y = topY - 0.06;
        const PAD_Y = -0.026;
        return (
          <group>

            <PotBody x={kp.drive[0]}  z={kp.drive[2]}  topY={topY} />
            <PotBody x={kp.echo[0]}   z={kp.echo[2]}   topY={topY} />
            <PotBody x={kp.reverb[0]} z={kp.reverb[2]} topY={topY} />
            <PotBody x={kp.tone[0]}   z={kp.tone[2]}   topY={topY} />
            <PotBody x={kp.master[0]} z={kp.master[2]} topY={topY} />
            <SwitchBody x={0} z={FSZ} topY={topY} />
            <Battery9V />

            {/* bateria (agora sob a placa) → pads de força, saindo do snap e
                contornando a beirada traseira da placa */}
            <Wire start={[0.32, -0.26, -0.70]} mid={[0.50, -0.14, -1.32]} end={[0.50, PAD_Y, -1.31]} color="#d02020" />
            <Wire start={[0.32, -0.26, -0.48]} mids={[[0.43, -0.19, -0.80], [0.40, -0.13, -1.18]]} end={[-0.06, PAD_Y, -1.31]} color="#181818" />

            <Wire start={[kp.drive[0],  POT_LUG_Y, kp.drive[2]  + POT_LUG_Z]} mid={[kp.drive[0],  0.03, kp.drive[2]  + POT_LUG_Z]} end={[-0.55, PAD_Y, -0.98]} color="#202020" />
            <Wire start={[kp.echo[0],   POT_LUG_Y, kp.echo[2]   + POT_LUG_Z]} mid={[kp.echo[0],   0.03, kp.echo[2]   + POT_LUG_Z]} end={[ 0.02, PAD_Y, -0.98]} color="#22aa3a" />
            <Wire start={[kp.reverb[0], POT_LUG_Y, kp.reverb[2] + POT_LUG_Z]} mid={[kp.reverb[0], 0.03, kp.reverb[2] + POT_LUG_Z]} end={[ 0.55, PAD_Y, -0.98]} color="#e0b020" />
            <Wire start={[kp.tone[0],   POT_LUG_Y, kp.tone[2]   + POT_LUG_Z]} mid={[kp.tone[0],   0.03, kp.tone[2]   + POT_LUG_Z]} end={[-0.26, PAD_Y, -0.72]} color="#e8e8e8" />
            <Wire start={[kp.master[0], POT_LUG_Y, kp.master[2] + POT_LUG_Z]} mid={[kp.master[0], 0.03, kp.master[2] + POT_LUG_Z]} end={[ 0.30, PAD_Y, -0.72]} color="#d02020" />

            {/* true bypass no 3PDT: coluna direita = input, esquerda = output, frente = LED + jumper */}
            <Wire start={[ 0.08, SW_LUG_Y, FSZ - 0.08]} end={[ 0.14, PAD_Y, 1.05]} color="#22aa3a" />
            <Wire start={[-0.08, SW_LUG_Y, FSZ - 0.08]} end={[-0.14, PAD_Y, 1.05]} color="#3a6ad0" />
            <Wire start={[ 0.705, 0.13, -0.60]} mids={[[0.80, -0.01, -0.45], [0.80, -0.02, 0.30], [0.80, -0.02, 0.80], [0.42, -0.01, 1.00]]} end={[ 0.08, SW_LUG_Y, FSZ - 0.08]} color="#e8e8e8" r={0.009} />
            {/* input jack sleeve (2º polo) → trilho de terra */}
            <Wire start={[ 0.705, 0.03, -0.60]} end={[ 0.74, PAD_Y, -0.40]} color="#181818" sag={0.05} r={0.009} />
            <CableClip x={0.80} z={-0.20} />
            <CableClip x={0.80} z={ 0.40} />
            <Wire start={[ 0.08, SW_LUG_Y, FSZ + 0.08]} end={[-0.08, SW_LUG_Y, FSZ + 0.08]} color="#d02020" sag={0.04} r={0.009} />
            <Wire start={[-0.08, SW_LUG_Y + 0.02, FSZ]} end={[-0.08, SW_LUG_Y - 0.02, FSZ - 0.08]} color="#181818" sag={0.025} r={0.009} />
            <Wire start={[0, SW_LUG_Y, FSZ + 0.08]} mids={[[0.20, -0.01, 0.78], [0.34, -0.02, 0.34], [0.33, -0.02, 0.02]]} end={[0.24, PAD_Y, -0.05]} color="#181818" r={0.009} />

            <Wire start={[-0.705, 0.13, -0.60]} end={[-0.74, PAD_Y, -0.57]} color="#3a8ade" sag={0.04} />
            {/* output jack sleeve (2º polo) → trilho de terra */}
            <Wire start={[-0.705, 0.03, -0.60]} end={[-0.74, PAD_Y, -0.40]} color="#181818" sag={0.05} r={0.009} />

            <Wire start={[ 0.035, LED_Y, 0.17]} end={[ 0.14, PAD_Y, 0.30]} color="#d02020" r={0.008} />
            <Wire start={[-0.035, LED_Y, 0.17]} end={[ 0.02, PAD_Y, 0.30]} color="#181818" r={0.008} />
          </group>
        );
      })()}

    </group>
  );
}

function PedalScene({
  palette,
  xray = false,
  ledColor,
  ledActive,
  onTap,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
  knobMaster,
  onKnobChange,
  setControlsEnabled,
  bootTrigger,
  presetIdx = null,
  onChassisEnter,
  onChassisLeave,
}: {
  palette: { pedal: string; ink: string; accent: string; cream: string; metal: string };
  xray?: boolean;
  ledColor: string;
  ledActive: boolean;
  onTap: () => void;
  knobDrive: number;
  knobEcho: number;
  knobTone: number;
  knobReverb: number;
  knobMaster: number;
  onKnobChange: (knob: "drive" | "echo" | "tone" | "reverb" | "master", value: number) => void;
  setControlsEnabled: (enabled: boolean) => void;
  bootTrigger: number;
  presetIdx?: number | null;
  onChassisEnter: () => void;
  onChassisLeave: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <PedalBody
      palette={palette}
      xray={xray}
      presetIdx={presetIdx}
      ledColor={ledColor}
      ledActive={ledActive}
      knobDrive={knobDrive}
      knobEcho={knobEcho}
      knobTone={knobTone}
      knobReverb={knobReverb}
      knobMaster={knobMaster}
      onKnobChange={onKnobChange}
      setControlsEnabled={setControlsEnabled}
      bootTrigger={bootTrigger}
      onChassisEnter={onChassisEnter}
      onChassisLeave={onChassisLeave}
      pressed={pressed}
      onPress={() => setPressed(true)}
      onRelease={() => { if (pressed) { setPressed(false); onTap(); } }}
      onCancel={() => setPressed(false)}
    />
  );
}

function CameraShake({ stompCount }: { stompCount: number }) {
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
    camera.position.y = s.current.baseY + Math.sin(s.current.t * 32) * 0.28 * Math.exp(-s.current.t * 9);
  });
  return null;
}

function Footswitch3D({
  position,
  pressed,
  onPress,
  onRelease,
  onCancel,
  metal,
  accent = "#ffffff",
}: {
  position: [number, number, number];
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onCancel: () => void;
  metal: string;
  accent?: string;
}) {
  const plungerRef = useRef<THREE.Group>(null);
  const yRef = useRef(0);
  const targetY = pressed ? -0.05 : 0;

  useFrame((_, delta) => {
    const g = plungerRef.current;
    if (!g) return;
    yRef.current += (targetY - yRef.current) * Math.min(1, delta * 28);
    g.position.y = 0.18 + yRef.current;
  });

  return (
    <group
      position={position}
      scale={0.8}
      onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { document.body.style.cursor = ""; }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        onPress();
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onRelease();
      }}
      onPointerCancel={() => onCancel()}
    >

      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 32]} />
        <meshStandardMaterial color={accent} roughness={0.5} emissive={accent} emissiveIntensity={0.12} />
      </mesh>

      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 6]} />
        <meshStandardMaterial color={metal} metalness={1} roughness={0.2} envMapIntensity={2} />
      </mesh>

      <group position={[0, 0.08, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 32]} />
          <meshStandardMaterial color={metal} metalness={1} roughness={0.2} envMapIntensity={2} />
        </mesh>
        {[0.02, 0.04, 0.06, 0.08].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 0.005, 32]} />
            <meshStandardMaterial color={metal} metalness={1} roughness={0.2} envMapIntensity={2} />
          </mesh>
        ))}
      </group>

      <group ref={plungerRef} position={[0, 0.18, 0]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 24]} />
          <meshStandardMaterial color={metal} metalness={1} roughness={0.2} envMapIntensity={2} />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.18, 32]} />
          <meshStandardMaterial color={metal} metalness={1} roughness={0.2} envMapIntensity={2} />
        </mesh>
      </group>
    </group>
  );
}

function HangTag() {
  // hang tag seguindo brand/GhostFX Tag.html, pendurada do footswitch e caída
  // sobre a face frontal; clicável → github.com/vinicsperes
  const { tex, redraw } = useMemo(() => {
    // desenhado em coords 512×640, rasterizado a 3× (spec da tag pede 2–3×)
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

      // FREE — herói (sem marca no topo)
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

      // link do GitHub — embaixo, acende em verde no hover
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

      // assinatura: fantasma caolho v3 (corpo + olho-LED verde)
      {
        const gs = 0.75;
        const gx = 256 - 32 * gs;   // centra horizontalmente (body center x=32)
        const gy = 571 - 32 * gs;   // mantém centro vertical em ~571
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

      // ilhós + furo
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
    // redesenha quando Unbounded/Space Mono chegarem (1º draw cai no fallback);
    // fonts.ready primeiro: o CSS do Google pode ainda não ter registrado as faces
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
    // da base do footswitch, por cima da borda frontal, entrando no ilhós
    // (termina logo atrás do plano da tag, no centro do furo)
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

  // pivô no ilhós: hover balança a tag no barbante sem o furo sair do fio
  const EYELET_LOCAL_Y = 0.625 * (0.5 - 54 / 640);
  const pivot = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, dt) => {
    const g = pivot.current;
    if (!g) return;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, hovered ? -0.22 : 0, 6, dt);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, hovered ? -0.13 : -0.07, 6, dt);
  });

  // hover acende o link do GitHub em verde (redesenha a textura)
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
