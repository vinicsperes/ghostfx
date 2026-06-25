import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, Text, RoundedBox, Environment, OrbitControls, Svg, Html } from "@react-three/drei";
import * as THREE from "three";

function easeOutBack(x: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

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

function KnobArc({
  value,
  radius,
  color,
  yOffset = 0.006,
}: {
  value: number;
  radius: number;
  color: string;
  yOffset?: number;
}) {
  const START = -2.35;
  const RANGE = 4.70;
  const N_TRACK = 64;

  const trackPoints = useMemo<[number, number, number][]>(() => (
    Array.from({ length: N_TRACK }, (_, i) => {
      const θ = START + (i / (N_TRACK - 1)) * RANGE;
      return [Math.sin(θ) * radius, yOffset, -Math.cos(θ) * radius];
    })
  ), [radius, yOffset]);

  const activePoints = useMemo<[number, number, number][]>(() => {
    const clamped = Math.max(0.001, Math.min(1, value));
    const endθ = START + clamped * RANGE;
    const count = Math.max(2, Math.round(clamped * (N_TRACK - 1)) + 1);
    return Array.from({ length: count }, (_, i) => {
      const θ = START + (i / (count - 1)) * (endθ - START);
      return [Math.sin(θ) * radius, yOffset, -Math.cos(θ) * radius];
    });
  }, [value, radius, yOffset]);

  return (
    <>
      <Line points={trackPoints} color={color} lineWidth={1.2} transparent opacity={0.18} />
      <Line points={activePoints} color={color} lineWidth={2.8} transparent opacity={0.92} />
    </>
  );
}

function KnobTooltip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Html position={[0, 0.65, 0]} center distanceFactor={7} zIndexRange={[50, 0]}>
      <div style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 3,
        background: "rgba(0,0,0,0.92)",
        border: `1px solid ${accent}88`,
        color: accent,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        letterSpacing: "0.06em",
        boxShadow: `0 0 10px ${accent}22`,
      }}>
        {label} {Math.round(value * 100)}%
      </div>
    </Html>
  );
}

function Knob3D({
  position,
  value,
  onChange,
  accent,
  label,
  setControlsEnabled,
  bootTrigger = 0,
  delay = 0,
  knobTheme = "dark",
  knobStyle = "default",
  showArc = false,
}: {
  position: [number, number, number];
  value: number;
  onChange: (v: number) => void;
  ink: string;
  accent: string;
  label: string;
  setControlsEnabled: (enabled: boolean) => void;
  knobTheme?: "dark" | "cream";
  knobStyle?: "default" | "strat" | "bigmuff" | "orb";
  bootTrigger?: number;
  delay?: number;
  showArc?: boolean;
}) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const isHoveredRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const noSelect = (e: Event) => { if (dragRef.current) e.preventDefault(); };
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      const next = Math.max(0, Math.min(1, dragRef.current.startValue + dy / 180));
      onChangeRef.current(next);
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = "";
        setIsDragging(false);
        if (!isHoveredRef.current) setControlsEnabled(true);
      }
    };
    window.addEventListener("selectstart", noSelect);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("selectstart", noSelect);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [setControlsEnabled]);

  const lastClickRef = useRef(0);
  const knobGroupRef = useRef<THREE.Group>(null);
  const animRef = useRef({ progress: -1, seenTrigger: 0, targetValue: 0 });
  const transRef = useRef({ active: false, from: 0, to: 0, progress: 0 });
  const transTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const g = knobGroupRef.current;
    if (g) g.rotation.y = (3 / 4) * Math.PI - value * (3 / 2) * Math.PI;
  }, []);

  useEffect(() => {
    if (bootTrigger > animRef.current.seenTrigger) {
      animRef.current.seenTrigger = bootTrigger;
      const g = knobGroupRef.current;
      if (g) g.rotation.y = 0;
      const t = setTimeout(() => {
        animRef.current.targetValue = value;
        animRef.current.progress = 0;
      }, delay * 1000);
      return () => clearTimeout(t);
    }
  }, [bootTrigger, delay, value]);

  useEffect(() => {
    if (dragRef.current) return;
    const targetAngle = (3 / 4) * Math.PI - value * (3 / 2) * Math.PI;
    if (transTimeoutRef.current) clearTimeout(transTimeoutRef.current);
    transTimeoutRef.current = setTimeout(() => {
      const g = knobGroupRef.current;
      if (!g || animRef.current.progress >= 0) return;
      const from = g.rotation.y;
      if (Math.abs(from - targetAngle) < 0.01) return;
      transRef.current = { active: true, from, to: targetAngle, progress: 0 };
    }, delay * 400);
    return () => { if (transTimeoutRef.current) clearTimeout(transTimeoutRef.current); };
  }, [value, delay]);

  useFrame((_, delta) => {
    const g = knobGroupRef.current;
    if (!g) return;
    if (animRef.current.progress >= 0) {
      animRef.current.progress = Math.min(1, animRef.current.progress + delta / 1.1);
      const p = easeOutBack(animRef.current.progress);
      g.rotation.y = (3 / 4) * Math.PI - (animRef.current.targetValue * p) * (3 / 2) * Math.PI;
      if (animRef.current.progress >= 1) animRef.current.progress = -1;
      return;
    }
    if (transRef.current.active) {
      transRef.current.progress = Math.min(1, transRef.current.progress + delta / 0.55);
      const p = easeOutBack(transRef.current.progress);
      g.rotation.y = transRef.current.from + (transRef.current.to - transRef.current.from) * p;
      if (transRef.current.progress >= 1) transRef.current.active = false;
    }
  });

  return (
    <group
      position={position}
      onPointerEnter={() => { isHoveredRef.current = true; setControlsEnabled(false); document.body.style.cursor = "grab"; }}
      onPointerLeave={() => { isHoveredRef.current = false; if (!dragRef.current) { setControlsEnabled(true); document.body.style.cursor = ""; } }}
      onWheel={(e: ThreeEvent<WheelEvent>) => {
        e.stopPropagation();
        const step = e.deltaY < 0 ? 0.04 : -0.04;
        onChange(Math.max(0, Math.min(1, value + step)));
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const now = performance.now();
        if (now - lastClickRef.current < 280) {
          onChange(0.5);
          lastClickRef.current = 0;
          return;
        }
        lastClickRef.current = now;
        dragRef.current = { startY: e.clientY, startValue: value };
        document.body.style.cursor = "grabbing";
        setIsDragging(true);
        setControlsEnabled(false);
      }}
    >
      {isDragging && <KnobTooltip label={label} value={value} accent={accent} />}
      <group ref={knobGroupRef}>
        {knobStyle === "bigmuff" ? (
          <>

            <mesh position={[0, 0.008, 0]} castShadow>
              <cylinderGeometry args={[0.168, 0.180, 0.016, 36]} />
              <meshStandardMaterial color="#131313" roughness={0.92} metalness={0} />
            </mesh>

            <mesh position={[0, 0.108, 0]} castShadow>
              <cylinderGeometry args={[0.128, 0.138, 0.195, 36]} />
              <meshStandardMaterial color="#111111" roughness={0.90} metalness={0} />
            </mesh>

            <mesh position={[0, 0.206, 0]} castShadow>
              <sphereGeometry args={[0.128, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
              <meshStandardMaterial color="#0e0e0e" roughness={0.88} metalness={0} />
            </mesh>

            <mesh position={[0, 0.185, -0.082]}>
              <boxGeometry args={[0.016, 0.005, 0.058]} />
              <meshBasicMaterial color="#c8b870" />
            </mesh>
          </>
        ) : knobStyle === "strat" ? (
          <>

            <mesh position={[0, 0.009, 0]} castShadow>
              <cylinderGeometry args={[0.215, 0.218, 0.018, 40]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#c8b870" : "#1e1e1e"} roughness={0.60} metalness={0} />
            </mesh>

            <mesh position={[0, 0.105, 0]} castShadow>
              <cylinderGeometry args={[0.138, 0.143, 0.172, 40]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#bfae72" : "#161616"} roughness={0.60} metalness={0} />
            </mesh>

            {[...Array(26)].map((_, i) => {
              const a = (i / 26) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.145, 0.105, Math.sin(a) * 0.145]} rotation={[0, a, 0]} castShadow>
                  <boxGeometry args={[0.006, 0.172, 0.012]} />
                  <meshStandardMaterial color={knobTheme === "cream" ? "#d0be80" : "#242424"} roughness={0.58} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.196, 0]} castShadow>
              <cylinderGeometry args={[0.140, 0.140, 0.010, 40]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#d4c27a" : "#1a1a1a"} roughness={0.52} metalness={0} />
            </mesh>

            <mesh position={[0, 0.202, -0.068]}>
              <boxGeometry args={[0.008, 0.004, 0.136]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : knobStyle === "orb" ? (
          <>

            <mesh position={[0, 0.010, 0]} castShadow>
              <cylinderGeometry args={[0.175, 0.183, 0.020, 32]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.20} />
            </mesh>

            {[...Array(20)].map((_, i) => {
              const a = (i / 20) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.168, 0.032, Math.sin(a) * 0.168]} rotation={[0, a, 0]} castShadow>
                  <boxGeometry args={[0.007, 0.024, 0.014]} />
                  <meshStandardMaterial color="#141414" roughness={0.9} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.100, 0]} castShadow>
              <cylinderGeometry args={[0.050, 0.080, 0.140, 24]} />
              <meshStandardMaterial color="#0c0c0c" roughness={0.80} metalness={0.12} />
            </mesh>

            <mesh position={[0, 0.215, 0]}>
              <sphereGeometry args={[0.092, 28, 28]} />
              <meshPhysicalMaterial color={accent} emissive={accent} emissiveIntensity={1.0} roughness={0.05} metalness={0} transparent opacity={0.78} />
            </mesh>

            <mesh position={[0, 0.215, 0]}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshBasicMaterial color={accent} />
            </mesh>

            <mesh position={[0, 0.058, -0.082]}>
              <boxGeometry args={[0.008, 0.036, 0.010]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : (
          <>

            <mesh position={[0, -0.01, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.17, 0.04, 32]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#c4b890" : "#050505"} roughness={0.85} metalness={0} />
            </mesh>

            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 0.22, 32]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#d4c8a0" : "#080808"} roughness={0.8} metalness={0} />
            </mesh>

            {[...Array(8)].map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const r = 0.085;
              return (
                <mesh key={i} position={[Math.cos(a) * r, 0.1, Math.sin(a) * r]} castShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.22, 12]} />
                  <meshStandardMaterial color={knobTheme === "cream" ? "#ddd0ac" : "#0a0a0a"} roughness={0.8} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.21, 0]} castShadow>
              <cylinderGeometry args={[0.105, 0.115, 0.025, 32]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#e8dcbc" : "#111118"} roughness={0.75} metalness={0} />
            </mesh>

            <group position={[0, 0.11, -0.115]}>
              <mesh>
                <boxGeometry args={[0.012, 0.24, 0.012]} />
                <meshBasicMaterial color={accent} />
              </mesh>
            </group>
            <group position={[0, 0.224, -0.055]}>
              <mesh>
                <boxGeometry args={[0.012, 0.005, 0.11]} />
                <meshBasicMaterial color={accent} />
              </mesh>
            </group>
          </>
        )}
      </group>
      {showArc && <KnobArc value={value} radius={0.28} color={accent} />}
    </group>
  );
}

function MasterKnob3D({
  position,
  value,
  onChange,
  accent,
  setControlsEnabled,
  bootTrigger = 0,
  delay = 0,
  knobTheme = "dark",
  knobStyle = "default",
  showArc = false,
}: {
  position: [number, number, number];
  value: number;
  onChange: (v: number) => void;
  accent: string;
  setControlsEnabled: (enabled: boolean) => void;
  bootTrigger?: number;
  delay?: number;
  knobTheme?: "dark" | "cream";
  knobStyle?: "default" | "strat" | "bigmuff" | "orb";
  showArc?: boolean;
}) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const isHoveredRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const noSelect = (e: Event) => { if (dragRef.current) e.preventDefault(); };
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      const next = Math.max(0, Math.min(1, dragRef.current.startValue + dy / 180));
      onChangeRef.current(next);
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = "";
        setIsDragging(false);
        if (!isHoveredRef.current) setControlsEnabled(true);
      }
    };
    window.addEventListener("selectstart", noSelect);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("selectstart", noSelect);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [setControlsEnabled]);

  const lastClickRef = useRef(0);
  const masterGroupRef = useRef<THREE.Group>(null);
  const masterAnimRef = useRef({ progress: -1, seenTrigger: 0, targetValue: 0 });
  const masterTransRef = useRef({ active: false, from: 0, to: 0, progress: 0 });
  const masterTransTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const g = masterGroupRef.current;
    if (g) g.rotation.y = (3 / 4) * Math.PI - value * (3 / 2) * Math.PI;
  }, []);

  useEffect(() => {
    if (bootTrigger > masterAnimRef.current.seenTrigger) {
      masterAnimRef.current.seenTrigger = bootTrigger;
      const g = masterGroupRef.current;
      if (g) g.rotation.y = 0;
      const t = setTimeout(() => {
        masterAnimRef.current.targetValue = value;
        masterAnimRef.current.progress = 0;
      }, delay * 1000);
      return () => clearTimeout(t);
    }
  }, [bootTrigger, delay, value]);

  useEffect(() => {
    if (dragRef.current) return;
    const targetAngle = (3 / 4) * Math.PI - value * (3 / 2) * Math.PI;
    if (masterTransTimeoutRef.current) clearTimeout(masterTransTimeoutRef.current);
    masterTransTimeoutRef.current = setTimeout(() => {
      const g = masterGroupRef.current;
      if (!g || masterAnimRef.current.progress >= 0) return;
      const from = g.rotation.y;
      if (Math.abs(from - targetAngle) < 0.01) return;
      masterTransRef.current = { active: true, from, to: targetAngle, progress: 0 };
    }, delay * 400);
    return () => { if (masterTransTimeoutRef.current) clearTimeout(masterTransTimeoutRef.current); };
  }, [value, delay]);

  useFrame((_, delta) => {
    const g = masterGroupRef.current;
    if (!g) return;
    if (masterAnimRef.current.progress >= 0) {
      masterAnimRef.current.progress = Math.min(1, masterAnimRef.current.progress + delta / 1.1);
      const p = easeOutBack(masterAnimRef.current.progress);
      g.rotation.y = (3 / 4) * Math.PI - (masterAnimRef.current.targetValue * p) * (3 / 2) * Math.PI;
      if (masterAnimRef.current.progress >= 1) masterAnimRef.current.progress = -1;
      return;
    }
    if (masterTransRef.current.active) {
      masterTransRef.current.progress = Math.min(1, masterTransRef.current.progress + delta / 0.55);
      const p = easeOutBack(masterTransRef.current.progress);
      g.rotation.y = masterTransRef.current.from + (masterTransRef.current.to - masterTransRef.current.from) * p;
      if (masterTransRef.current.progress >= 1) masterTransRef.current.active = false;
    }
  });

  return (
    <group
      position={position}
      onPointerEnter={() => { isHoveredRef.current = true; setControlsEnabled(false); document.body.style.cursor = "grab"; }}
      onPointerLeave={() => { isHoveredRef.current = false; if (!dragRef.current) { setControlsEnabled(true); document.body.style.cursor = ""; } }}
      onWheel={(e: ThreeEvent<WheelEvent>) => {
        e.stopPropagation();
        const step = e.deltaY < 0 ? 0.04 : -0.04;
        onChange(Math.max(0, Math.min(1, value + step)));
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const now = performance.now();
        if (now - lastClickRef.current < 280) {
          onChange(0.5);
          lastClickRef.current = 0;
          return;
        }
        lastClickRef.current = now;
        dragRef.current = { startY: e.clientY, startValue: value };
        document.body.style.cursor = "grabbing";
        setIsDragging(true);
        setControlsEnabled(false);
      }}
    >
      {isDragging && <KnobTooltip label="Volume" value={value} accent={accent} />}
      <group ref={masterGroupRef}>
        {knobStyle === "bigmuff" ? (
          <>

            <mesh position={[0, 0.008, 0]} castShadow>
              <cylinderGeometry args={[0.192, 0.206, 0.016, 36]} />
              <meshStandardMaterial color="#131313" roughness={0.92} metalness={0} />
            </mesh>

            <mesh position={[0, 0.120, 0]} castShadow>
              <cylinderGeometry args={[0.148, 0.160, 0.215, 36]} />
              <meshStandardMaterial color="#111111" roughness={0.90} metalness={0} />
            </mesh>

            <mesh position={[0, 0.230, 0]} castShadow>
              <sphereGeometry args={[0.148, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
              <meshStandardMaterial color="#0e0e0e" roughness={0.88} metalness={0} />
            </mesh>

            <mesh position={[0, 0.208, -0.096]}>
              <boxGeometry args={[0.018, 0.006, 0.068]} />
              <meshBasicMaterial color="#c8b870" />
            </mesh>
          </>
        ) : knobStyle === "strat" ? (
          <>

            <mesh position={[0, 0.009, 0]} castShadow>
              <cylinderGeometry args={[0.240, 0.244, 0.018, 40]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#c8b870" : "#1e1e1e"} roughness={0.60} metalness={0} />
            </mesh>

            <mesh position={[0, 0.115, 0]} castShadow>
              <cylinderGeometry args={[0.152, 0.158, 0.190, 40]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#bfae72" : "#161616"} roughness={0.60} metalness={0} />
            </mesh>

            {[...Array(28)].map((_, i) => {
              const a = (i / 28) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.160, 0.115, Math.sin(a) * 0.160]} rotation={[0, a, 0]} castShadow>
                  <boxGeometry args={[0.006, 0.190, 0.012]} />
                  <meshStandardMaterial color={knobTheme === "cream" ? "#d0be80" : "#242424"} roughness={0.58} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.215, 0]} castShadow>
              <cylinderGeometry args={[0.153, 0.153, 0.010, 40]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#d4c27a" : "#1a1a1a"} roughness={0.52} metalness={0} />
            </mesh>

            <mesh position={[0, 0.221, -0.075]}>
              <boxGeometry args={[0.008, 0.004, 0.154]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : knobStyle === "orb" ? (
          <>

            <mesh position={[0, 0.010, 0]} castShadow>
              <cylinderGeometry args={[0.200, 0.210, 0.020, 32]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.20} />
            </mesh>

            {[...Array(24)].map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.193, 0.032, Math.sin(a) * 0.193]} rotation={[0, a, 0]} castShadow>
                  <boxGeometry args={[0.007, 0.024, 0.014]} />
                  <meshStandardMaterial color="#141414" roughness={0.9} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.115, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.095, 0.160, 24]} />
              <meshStandardMaterial color="#0c0c0c" roughness={0.80} metalness={0.12} />
            </mesh>

            <mesh position={[0, 0.245, 0]}>
              <sphereGeometry args={[0.110, 28, 28]} />
              <meshPhysicalMaterial color={accent} emissive={accent} emissiveIntensity={1.0} roughness={0.05} metalness={0} transparent opacity={0.78} />
            </mesh>

            <mesh position={[0, 0.245, 0]}>
              <sphereGeometry args={[0.050, 16, 16]} />
              <meshBasicMaterial color={accent} />
            </mesh>

            <mesh position={[0, 0.070, -0.096]}>
              <boxGeometry args={[0.008, 0.044, 0.010]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : (
          <>

            <mesh position={[0, -0.01, 0]} castShadow>
              <cylinderGeometry args={[0.165, 0.185, 0.045, 32]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#c4b890" : "#030305"} roughness={0.85} metalness={0} />
            </mesh>

            <mesh position={[0, 0.11, 0]} castShadow>
              <cylinderGeometry args={[0.155, 0.155, 0.24, 48]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#d8ccaa" : "#0c0c14"} roughness={0.80} metalness={0} />
            </mesh>

            {[...Array(36)].map((_, i) => {
              const a = (i / 36) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.157, 0.10, Math.sin(a) * 0.157]} castShadow>
                  <boxGeometry args={[0.008, 0.10, 0.010]} />
                  <meshStandardMaterial color={knobTheme === "cream" ? "#bfb488" : "#1c1c28"} roughness={0.90} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.237, 0]} castShadow>
              <cylinderGeometry args={[0.135, 0.155, 0.020, 32]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#ddd0b0" : "#111118"} roughness={0.80} metalness={0} />
            </mesh>

            <mesh position={[0, 0.248, 0]}>
              <cylinderGeometry args={[0.134, 0.134, 0.002, 48]} />
              <meshStandardMaterial color={knobTheme === "cream" ? "#e8dcbc" : "#0a0a10"} roughness={0.75} metalness={0} />
            </mesh>

            <mesh position={[0, 0.250, -0.072]}>
              <boxGeometry args={[0.014, 0.004, 0.124]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        )}
      </group>
      {showArc && <KnobArc value={value} radius={0.34} color={accent} />}
    </group>
  );
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

function SideJack({ position, metal }: { position: [number, number, number], metal: string }) {
  const isLeft = position[0] < 0;
  const chrome = "#d6d6da";

  // 1/4" real: porca sextavada 14mm + arruela na face externa, bushing ø9.5mm
  // atravessando a parede, furo ø6.35mm; dentro, corpo fechado ø~14mm com lugs.
  // Eixo local +y aponta para dentro do gabinete.
  return (
    <group position={position} rotation={[0, 0, isLeft ? -Math.PI / 2 : Math.PI / 2]}>

      {/* enclosed-jack body: a smaller rectangular plastic box (not cylindrical) */}
      <mesh position={[0, 0.205, 0]} castShadow>
        <boxGeometry args={[0.20, 0.24, 0.17]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.62} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.335, 0]} castShadow>
        <boxGeometry args={[0.16, 0.04, 0.13]} />
        <meshStandardMaterial color="#141414" roughness={0.7} metalness={0.05} />
      </mesh>

      {[-0.05, 0.05].map((dx, i) => (
        <mesh key={`lug${i}`} position={[dx, 0.385, 0]} castShadow>
          <boxGeometry args={[0.028, 0.045, 0.010]} />
          <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.24} />
        </mesh>
      ))}

      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.092, 0.092, 0.14, 20]} />
        <meshStandardMaterial color={chrome} metalness={0.9} roughness={0.28} />
      </mesh>

      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.010, 20]} />
        <meshStandardMaterial color={metal} metalness={0.85} roughness={0.24} />
      </mesh>

      <mesh position={[0, -0.022, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 6]} />
        <meshStandardMaterial color={chrome} metalness={0.95} roughness={0.16} />
      </mesh>

      <mesh position={[0, -0.054, 0]}>
        <cylinderGeometry args={[0.092, 0.092, 0.012, 20]} />
        <meshStandardMaterial color={chrome} metalness={0.92} roughness={0.20} />
      </mesh>
      <mesh position={[0, -0.050, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.022, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
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

function PotBody({ x, z, topY }: { x: number; z: number; topY: number }) {
  // pot 9mm PCB-mount (padrão em pedal compacto de 5 knobs): can ø9.5 × ~6mm, bushing M7
  const bodyR = 0.128;
  const bodyH = 0.16;
  const bodyCY = topY - 0.025 - bodyH / 2;
  const canBottom = bodyCY - bodyH / 2;
  const lugZ = -(bodyR - 0.025);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, topY - 0.025, 0]}>
        <cylinderGeometry args={[0.094, 0.094, 0.05, 16]} />
        <meshStandardMaterial color="#caa83c" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, bodyCY, 0]} castShadow>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 20]} />
        <meshStandardMaterial color="#8a8a90" metalness={0.78} roughness={0.38} />
      </mesh>
      <mesh position={[0, canBottom + 0.007, 0]}>
        <cylinderGeometry args={[bodyR + 0.006, bodyR + 0.006, 0.014, 20]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
      </mesh>
      {[-0.067, 0, 0.067].map((dx, i) => (
        <mesh key={i} position={[dx, canBottom - 0.020, lugZ]}>
          <boxGeometry args={[0.026, 0.046, 0.010]} />
          <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
}

function SwitchBody({ x, z, topY }: { x: number; z: number; topY: number }) {
  // 3PDT: compact body, 9 lugs in a tight grid (LG matches SW_LUG offsets in PedalBody)
  const w = 0.24, d = 0.24, h = 0.18;
  const cy = topY - 0.025 - h / 2;
  const lugY = cy - h / 2 - 0.030;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, cy, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#45454d" metalness={0.4} roughness={0.5} />
      </mesh>
      {[-0.08, 0, 0.08].flatMap((lx) =>
        [-0.08, 0, 0.08].map((lz) => (
          <mesh key={`${lx}_${lz}`} position={[lx, lugY, lz]}>
            <boxGeometry args={[0.034, 0.060, 0.012]} />
            <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.22} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Battery9V() {
  // 9V compacta (~75% da régua — tamanho cheio dominava a cena), deitada e
  // enfiada SOB a placa (estilo celular): apoiada no fundo do chassi, topo logo
  // abaixo da PCB; ocupa a metade traseira do vão sob a placa, sem clipar.
  const cx = -0.20, cy = -0.305, cz = -0.60;
  return (
    <group position={[cx, cy, cz]}>
      <mesh castShadow>
        <boxGeometry args={[0.98, 0.34, 0.50]} />
        <meshStandardMaterial color="#15151a" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0.24, 0, 0]}>
        <boxGeometry args={[0.28, 0.342, 0.502]} />
        <meshStandardMaterial color="#c9a23c" roughness={0.45} metalness={0.35} />
      </mesh>
      <Text position={[0.0, 0.172, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.10} color="#e8e6da" anchorX="center" anchorY="middle" letterSpacing={0.10} renderOrder={6}>
        9V
      </Text>
      {/* tampa preta de plástico onde os polos se assentam */}
      <mesh position={[0.495, 0.02, 0]} castShadow>
        <boxGeometry args={[0.03, 0.26, 0.44]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* polos da 9V em níquel polido: snap redondo (+, fio vermelho) e hexagonal (−, fio preto) */}
      <mesh position={[0.515, 0.04, -0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.040, 0.040, 0.066, 20]} />
        <meshStandardMaterial color="#e4e4ea" metalness={0.98} roughness={0.12} />
      </mesh>
      <mesh position={[0.515, 0.04, 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.050, 0.050, 0.066, 6]} />
        <meshStandardMaterial color="#e4e4ea" metalness={0.98} roughness={0.12} />
      </mesh>
    </group>
  );
}

function Wire({ start, end, color, sag, r = 0.010, mid, mids }: {
  start: [number, number, number]; end: [number, number, number]; color: string; sag?: number; r?: number;
  mid?: [number, number, number];
  mids?: [number, number, number][];
}) {
  const geometry = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const way = mids ?? (mid ? [mid] : null);
    if (way) {
      // explicit waypoints — route the wire along the walls/edges with rounded bends
      const pts = [s, ...way.map((m) => new THREE.Vector3(...m)), e];
      const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
      return new THREE.TubeGeometry(curve, Math.max(40, pts.length * 18), r, 8, false);
    }
    const horiz = Math.hypot(e.x - s.x, e.z - s.z);
    const drop = sag ?? Math.min(0.045 + horiz * 0.10, 0.14);
    // folga em S com jitter determinístico (hash das pontas) — fio passado à mão
    const h1 = Math.sin(s.x * 12.9898 + e.z * 78.233) * 43758.5453;
    const h2 = Math.sin(e.x * 39.346 + s.z * 11.135) * 24634.6345;
    const j1 = (h1 - Math.floor(h1) - 0.5) * Math.min(0.09, 0.03 + horiz * 0.06);
    const j2 = (h2 - Math.floor(h2) - 0.5) * Math.min(0.09, 0.03 + horiz * 0.06);
    const p1 = new THREE.Vector3().lerpVectors(s, e, 0.33);
    p1.y -= drop * 0.85; p1.x += j1; p1.z += j2;
    const p2 = new THREE.Vector3().lerpVectors(s, e, 0.67);
    p2.y -= drop; p2.x -= j2 * 0.7; p2.z += j1 * 0.7;
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

const PCB_BH = 0.05;
const PCB_CU = "#c89a3c";

// nylon saddle clip that pins a wire/harness down to the board ("presilha")
// y default sits the feet on the board surface (board centre is at world -0.06)
function CableClip({ x, z, y = -0.06, rot = 0, color = "#141418" }: {
  x: number; z: number; y?: number; rot?: number; color?: string;
}) {
  const base = PCB_BH / 2;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* arch over the wire */}
      <mesh position={[0, base + 0.034, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.03, 0.0075, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* two feet anchoring it to the board */}
      {[-0.03, 0.03].map((dx, i) => (
        <mesh key={i} position={[dx, base + 0.016, 0]} castShadow>
          <boxGeometry args={[0.013, 0.034, 0.016]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function ElCap({ x, z, h = 0.18, r = 0.055, color = "#1a1a1a" }: {
  x: number; z: number; h?: number; r?: number; color?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, PCB_BH / 2 + h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[-r * 0.35, PCB_BH / 2 + h, 0]}>
        <boxGeometry args={[r * 0.38, 0.003, r * 2.0]} />
        <meshBasicMaterial color="#e8e8e8" />
      </mesh>
      <mesh position={[0, PCB_BH / 2 + 0.004, 0]}>
        <cylinderGeometry args={[r + 0.005, r + 0.005, 0.006, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

function ICDip({ x, z, pins = 8, rot = 0, color = "#101010", label = "" }: {
  x: number; z: number; pins?: number; rot?: number; color?: string; label?: string;
}) {
  // DIP: corpo 6.35mm de largura, pitch 2.54mm — DIP-8 9.8mm, DIP-16 19.3mm
  const half = pins / 2;
  const chipW = 0.171;
  const chipL = half * 0.066;
  const chipH = 0.089;
  const sockH = 0.055;
  const seatY = PCB_BH / 2 + sockH;
  const topY = seatY + chipH / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, PCB_BH / 2 + sockH / 2, 0]} castShadow>
        <boxGeometry args={[chipW + 0.05, sockH, chipL + 0.04]} />
        <meshStandardMaterial color="#161616" roughness={0.82} metalness={0.02} />
      </mesh>
      <mesh position={[0, topY, 0]} castShadow>
        <boxGeometry args={[chipW, chipH, chipL]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.04} />
      </mesh>
      <mesh position={[0, topY + chipH / 2 + 0.0005, -chipL / 2 + 0.030]}>
        <cylinderGeometry args={[0.016, 0.016, 0.001, 12]} />
        <meshBasicMaterial color="#383838" />
      </mesh>
      {label && (
        <Text
          position={[0, topY + chipH / 2 + 0.002, 0.012]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
          fontSize={0.046}
          color="#d8d8d8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
          renderOrder={6}
        >
          {label}
        </Text>
      )}
      {Array.from({ length: half }, (_, i) => {
        const pz = -chipL / 2 + 0.033 + i * 0.066;
        return (
          <group key={i}>
            <mesh position={[-chipW / 2 - 0.012, (seatY + PCB_BH / 2) / 2, pz]}>
              <boxGeometry args={[0.024, sockH + 0.014, 0.014]} />
              <meshStandardMaterial color="#b0b0b0" metalness={0.88} roughness={0.12} />
            </mesh>
            <mesh position={[chipW / 2 + 0.012, (seatY + PCB_BH / 2) / 2, pz]}>
              <boxGeometry args={[0.024, sockH + 0.014, 0.014]} />
              <meshStandardMaterial color="#b0b0b0" metalness={0.88} roughness={0.12} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function THResistor({ x, z, rot = 0, b1 = "#c02010", b2 = "#101010", b3 = "#e0a020" }: {
  x: number; z: number; rot?: number; b1?: string; b2?: string; b3?: string;
}) {
  // 1/4W axial: corpo 6.3 × ø2.3mm, espaçamento de furos 10.16mm (escala 1u = 37.2mm)
  const bL = 0.17;
  const bR = 0.031;
  const legZ = 0.1365;
  const bodyY = PCB_BH / 2 + bR + 0.004;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[bR, bR, bL, 12]} />
        <meshStandardMaterial color="#e8d8b0" roughness={0.6} />
      </mesh>
      {([-0.055, -0.030, -0.005, 0.055] as const).map((dz, i) => (
        <mesh key={i} position={[0, bodyY, dz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[bR + 0.0015, bR + 0.0015, 0.012, 12]} />
          <meshBasicMaterial color={i === 0 ? b1 : i === 1 ? b2 : i === 2 ? b3 : "#c8a030"} />
        </mesh>
      ))}
      {([1, -1] as const).map((s) => (
        <group key={s}>
          <mesh position={[0, bodyY, s * (bL / 2 + (legZ - bL / 2) / 2)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, legZ - bL / 2, 8]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
          </mesh>
          <mesh position={[0, (bodyY + PCB_BH / 2) / 2, s * legZ]}>
            <cylinderGeometry args={[0.008, 0.008, bodyY - PCB_BH / 2, 8]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Diode({ x, z, rot = 0, kind = "glass" }: {
  x: number; z: number; rot?: number; kind?: "glass" | "power";
}) {
  // 1N4148 DO-35: vidro âmbar 4.25×ø2mm · 1N4001 DO-41: preto 5.2×ø2.7mm
  const glass = kind === "glass";
  const bL = glass ? 0.114 : 0.14;
  const bR = glass ? 0.027 : 0.036;
  const legZ = glass ? 0.10 : 0.12;
  const bodyY = PCB_BH / 2 + bR + 0.004;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[bR, bR, bL, 12]} />
        {glass
          ? <meshPhysicalMaterial color="#b06818" roughness={0.18} metalness={0.05} clearcoat={0.6} />
          : <meshStandardMaterial color="#181818" roughness={0.5} metalness={0.05} />}
      </mesh>
      <mesh position={[0, bodyY, -bL / 2 + 0.018]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[bR + 0.0015, bR + 0.0015, 0.014, 12]} />
        <meshBasicMaterial color={glass ? "#181818" : "#d8d8d8"} />
      </mesh>
      {([1, -1] as const).map((s) => (
        <group key={s}>
          <mesh position={[0, bodyY, s * (bL / 2 + (legZ - bL / 2) / 2)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, legZ - bL / 2, 8]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
          </mesh>
          <mesh position={[0, (bodyY + PCB_BH / 2) / 2, s * legZ]}>
            <cylinderGeometry args={[0.008, 0.008, bodyY - PCB_BH / 2, 8]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DiscCap({ x, z, rot = 0, color = "#d4b86a" }: { x: number; z: number; rot?: number; color?: string }) {
  // disco cerâmico ø6mm em pé sobre duas pernas (pitch 5mm)
  const r = 0.078;
  const legX = 0.0675;
  const discY = PCB_BH / 2 + r + 0.024;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, discY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, 0.034, 18]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {([-legX, legX] as const).map((lx, i) => (
        <mesh key={i} position={[lx, (discY - r * 0.4 + PCB_BH / 2) / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, discY - r * 0.4 - PCB_BH / 2, 8]} />
          <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function Transistor({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  // TO-92: ø4.5mm × 4.5mm de corpo, erguido ~1.5mm acima da placa nas pernas
  const h = 0.12;
  const standoff = 0.04;
  const bodyCY = PCB_BH / 2 + standoff + h / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyCY, 0]} castShadow scale={[1, 1, 0.62]}>
        <cylinderGeometry args={[0.060, 0.060, h, 16]} />
        <meshStandardMaterial color="#141414" roughness={0.55} metalness={0.06} />
      </mesh>
      {[-0.034, 0, 0.034].map((dx, i) => (
        <mesh key={i} position={[dx, (PCB_BH / 2 + bodyCY - h / 2) / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, standoff + 0.004, 8]} />
          <meshStandardMaterial color="#c0c0c4" metalness={0.85} roughness={0.18} />
        </mesh>
      ))}
    </group>
  );
}

const SILK = "#8c8c80";

function SilkRect({ x, z, w, d, y, t = 0.0045 }: {
  x: number; z: number; w: number; d: number; y: number; t?: number;
}) {
  const h = 0.002;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, -d / 2]}><boxGeometry args={[w, h, t]} /><meshBasicMaterial color={SILK} /></mesh>
      <mesh position={[0, 0,  d / 2]}><boxGeometry args={[w, h, t]} /><meshBasicMaterial color={SILK} /></mesh>
      <mesh position={[-w / 2, 0, 0]}><boxGeometry args={[t, h, d]} /><meshBasicMaterial color={SILK} /></mesh>
      <mesh position={[ w / 2, 0, 0]}><boxGeometry args={[t, h, d]} /><meshBasicMaterial color={SILK} /></mesh>
    </group>
  );
}

function GhostSilk({ x, z, y, size = 0.17 }: { x: number; z: number; y: number; size?: number }) {
  // mascote da marca (caolho v3) impresso como silk discreto — easter egg.
  // path do GhostMark (bbox x16-48 / y9-55), olho offset esquerdo.
  const tex = useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d")!;
    const k = (s * 0.82) / 46;
    ctx.translate(s / 2 - 32 * k, s / 2 - 32 * k);
    ctx.scale(k, k);
    const body = new Path2D(
      "M16 51 L16 28 C16 16 23 9 32 9 C41 9 48 16 48 28 L48 51 Q44 47 40 51 Q36 55 32 51 Q28 47 24 51 Q20 55 16 51 Z"
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

function SilkText({ x, z, y, size = 0.033, children }: {
  x: number; z: number; y: number; size?: number; children: string;
}) {
  return (
    <Text position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={size} color={SILK} anchorX="center" anchorY="middle" letterSpacing={0.05} renderOrder={6}>
      {children}
    </Text>
  );
}

function BeltonBrick({ x, z }: { x: number; z: number }) {
  // módulo de reverb estilo Digi-Log mini (33.7×16.8×9.2mm), 6 pinos SIP numa ponta
  const W = 0.38, L = 0.74, H = 0.22;
  const topY = PCB_BH / 2 + 0.02 + H;

  // etiqueta desenhada em canvas — texto cravado no plano, sem flutuar
  const labelTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 320;
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
        <meshStandardMaterial color="#0d0d10" roughness={0.55} metalness={0.10} />
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

function SilkRing({ x, z, r, y }: { x: number; z: number; r: number; y: number }) {
  return (
    <mesh position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.0022, 4, 28]} />
      <meshBasicMaterial color={SILK} />
    </mesh>
  );
}

function PCBBoard({ w, l }: { w: number; l: number }) {
  const TH = 0.003;
  const top = PCB_BH / 2 + TH / 2;
  const silkY = top + 0.0024;

  // substrato da placa estendido pra trás (cavidade onde ficava a bateria);
  // o LAYOUT (componentes/pads/silk) fica centrado em z=0, só a placa cresce.
  const BACK_EXT = 0.38;
  const physL = l + BACK_EXT;

  const railX = w / 2 - 0.10;

  // ---- layout por fluxo de sinal (coords locais; mundo = local z + 0.17) ----
  // alimentação no fundo (lado do DC jack) · input/drive à direita · delay no
  // centro · reverb (brick) frente-esquerda · saída à esquerda
  // power row tucked BEHIND the back pots (clear of the knob footprints),
  // on the extended rear band: D3 → 100µF → 47µF → 78L05
  const d3:   [number, number] = [ 0.50, -1.56];
  const c100: [number, number] = [ 0.22, -1.56];
  const c47:  [number, number] = [-0.06, -1.56];
  const reg:  [number, number] = [-0.34, -1.56];

  // ── full reflow: spread the whole circuit across the board, signal flowing
  //    input(right) → drive → delay(centre) → reverb(front-left) → output(left) ──

  // resistors pulled back near the pots (flat, fit under the knob skirts);
  // tall parts (ICs, electrolytics) spread across the front — the rear is pots
  const raZ = -0.42;
  const raX = [0.08, 0.24, 0.39, 0.55];
  const rbZ = -0.42;
  const rbX = [-0.55, -0.39, -0.24, -0.08];

  // input + drive · right column
  const q1:    [number, number] = [ 0.64,  0.10];
  const rIn:   [number, number] = [ 0.66, -0.14];
  const ic1:   [number, number] = [ 0.44,  0.42];
  const dg1:   [number, number] = [ 0.66,  0.34];
  const dg2:   [number, number] = [ 0.66,  0.52];
  const disc1: [number, number] = [ 0.42,  0.69];

  // delay · centre
  const ic2: [number, number] = [ 0.00, -0.02]; // laid horizontal (rot below) so it's shallow in z
  // delay electrolytics distributed into the clear gaps between the knobs
  // (drive↔echo, echo↔reverb, and the central tone↔volume gap)
  const ecD: [number, number][] = [[-0.31, -1.18], [0.31, -1.18], [0.00, -0.70]];
  const disc2: [number, number] = [-0.30, 0.18];
  const disc3: [number, number] = [-0.06, 0.18];

  // reverb + output · left column
  const brick: [number, number] = [-0.44, 0.78];
  const q2:    [number, number] = [-0.70, -0.28];
  const ecOut: [number, number] = [-0.70, -0.06];
  const rOut:  [number, number] = [-0.70,  0.16];

  // rail perimeter: rear edge pushed into the extended band so it encloses the power row
  const zBack = -(l / 2 + BACK_EXT) + 0.04;
  const zFront = l / 2 - 0.06;

  type Seg = { x1: number; z1: number; x2: number; z2: number; tw: number };
  const segs: Seg[] = [
    { x1: -railX, z1: zBack, x2:  railX, z2: zBack, tw: 0.030 },
    { x1: -railX, z1: zFront, x2:  railX, z2: zFront, tw: 0.030 },
    { x1: -railX, z1: zBack, x2: -railX, z2: zFront, tw: 0.022 },
    { x1:  railX, z1: zBack, x2:  railX, z2: zFront, tw: 0.022 },

    // alimentação: DC/bateria → D3 → filtros → 78L05 → trilho 5V do delay
    { x1: d3[0], z1: d3[1], x2: c100[0], z2: c100[1], tw: 0.018 },
    { x1: c100[0], z1: c100[1], x2: c47[0], z2: c47[1], tw: 0.020 },
    { x1: c47[0], z1: c47[1], x2: reg[0], z2: reg[1], tw: 0.018 },
    { x1: reg[0], z1: reg[1], x2: ic2[0], z2: -0.32, tw: 0.013 },

    // sinal: input → Q1 → R → IC1 (clipping) → tone → IC2 → brick → Q2 → output
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

    { x1: ic2[0], z1: 0.28, x2: brick[0] + 0.10, z2: 0.30, tw: 0.013 },
    { x1: brick[0], z1: 0.30, x2: q2[0], z2: q2[1], tw: 0.012 },
    { x1: q2[0], z1: q2[1], x2: ecOut[0], z2: ecOut[1], tw: 0.012 },
    { x1: q2[0], z1: q2[1], x2: rOut[0], z2: rOut[1], tw: 0.012 },
  ];

  type Conn = { px: number; pz: number; nx: number; nz: number };
  const conns: Conn[] = [
    // pots: drive · echo · reverb (fileira de trás) + tone · volume
    { px: -0.55, pz: -1.15, nx: rbX[0], nz: rbZ },
    { px:  0.02, pz: -1.15, nx: ic2[0], nz: -0.32 },
    { px:  0.55, pz: -1.15, nx: rbX[3], nz: rbZ },
    { px: -0.26, pz: -0.89, nx: rbX[1], nz: rbZ },
    { px:  0.30, pz: -0.89, nx: rbX[3], nz: rbZ },
    // footswitch (true bypass send/return)
    { px:  0.14, pz:  0.88, nx: raX[0], nz: raZ },
    { px: -0.14, pz:  0.88, nx: brick[0] + 0.225, nz: 0.88 },
    // jacks recuados: input dir. → Q1, output esq. → Q2
    { px:  0.74, pz: -0.74, nx: q1[0], nz: q1[1] },
    { px: -0.74, pz: -0.74, nx: q2[0], nz: q2[1] },
    // LED
    { px:  0.14, pz:  0.13, nx: raX[0], nz: raZ },
    { px:  0.02, pz:  0.13, nx: raX[1], nz: raZ },
    // alimentação (bateria/DC): pads atrás dos pots, à frente da fileira de força
    { px:  0.50, pz: -1.48, nx: d3[0], nz: d3[1] },
    { px: -0.06, pz: -1.48, nx: c47[0], nz: c47[1] },
  ];
  conns.forEach(({ px, pz, nx, nz }) =>
    segs.push({ x1: px, z1: pz, x2: nx, z2: nz, tw: 0.012 }));

  // textura OPACA da placa: fundo verde + grid de cobre assado direto nela.
  // antes o grid era um plano transparente flutuante — debaixo da tampa de
  // acrílico (também transparente) ele desordenava e sumia em alguns ângulos.
  // Como parte da superfície opaca, renderiza estável (igual texto nos chips).
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
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ch); ctx.stroke();
    }
    for (let j = 1; j < nz; j++) {
      const py = Math.round((j / nz) * ch) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }, [w, l]);

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

      {([[-w/2+0.07,-l/2+0.07],[w/2-0.07,-l/2+0.07],[w/2-0.07,l/2-0.07],[-w/2+0.07,l/2-0.07]] as [number,number][]).map(([mx, mz], i) => (
        <mesh key={`mh${i}`} position={[mx, top, mz]}>
          <cylinderGeometry args={[0.028, 0.028, TH * 2.5, 12]} />
          <meshStandardMaterial color="#8a9a70" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      <SilkRect x={0} z={0} w={w - 0.10} d={l - 0.10} y={silkY} t={0.005} />
      <SilkRect x={ic1[0]} z={ic1[1]} w={0.24} d={0.34} y={silkY} />
      <SilkRect x={ic2[0]} z={ic2[1]} w={0.60} d={0.24} y={silkY} />
      <SilkRect x={brick[0]} z={brick[1]} w={0.49} d={0.95} y={silkY} />
      <SilkRing x={c100[0]} z={c100[1]} r={0.102} y={silkY} />
      <SilkRing x={c47[0]} z={c47[1]} r={0.084} y={silkY} />
      {ecD.map(([ex, ez], i) => <SilkRing key={`secd${i}`} x={ex} z={ez} r={0.070} y={silkY} />)}
      <SilkRing x={ecOut[0]} z={ecOut[1]} r={0.070} y={silkY} />
      {raX.map((rx, i) => <SilkRect key={`sra${i}`} x={rx} z={raZ} w={0.08} d={0.30} y={silkY} t={0.003} />)}
      {rbX.map((rx, i) => <SilkRect key={`srb${i}`} x={rx} z={rbZ} w={0.08} d={0.30} y={silkY} t={0.003} />)}

      {/* designadores */}
      {raX.map((rx, i) => <SilkText key={`dra${i}`} x={rx} z={raZ + 0.21} y={silkY}>{`R${i + 1}`}</SilkText>)}
      {rbX.map((rx, i) => <SilkText key={`drb${i}`} x={rx} z={rbZ + 0.20} y={silkY}>{`R${i + 5}`}</SilkText>)}
      <SilkText x={ic1[0]} z={ic1[1] + 0.24} y={silkY}>IC1</SilkText>
      <SilkText x={ic2[0]} z={ic2[1] + 0.18} y={silkY}>IC2</SilkText>
      <SilkText x={brick[0]} z={brick[1] - 0.55} y={silkY}>BR1</SilkText>
      <SilkText x={dg1[0] + 0.12} z={dg1[1]} y={silkY}>D1</SilkText>
      <SilkText x={dg2[0] + 0.12} z={dg2[1] + 0.06} y={silkY}>D2</SilkText>
      <SilkText x={d3[0] - 0.14} z={d3[1] + 0.07} y={silkY}>D3</SilkText>
      <SilkText x={q1[0]} z={q1[1] - 0.12} y={silkY}>Q1</SilkText>
      <SilkText x={q2[0]} z={q2[1] - 0.12} y={silkY}>Q2</SilkText>
      <SilkText x={reg[0]} z={reg[1] + 0.13} y={silkY}>REG</SilkText>
      {/* lockup de marca: wordmark à esquerda + fantasminha à direita, na faixa
          livre à direita do footswitch (easter egg do interior, #3) */}
      <Text position={[0.245, silkY, 1.0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.036} color={SILK} anchorX="left" anchorY="middle" letterSpacing={0.05} renderOrder={6}>
        GHOST FX MK.I
      </Text>
      <GhostSilk x={0.60} z={1.0} y={silkY} size={0.10} />

      {/* alimentação: 100µF + 47µF (16V) + 78L05 · saída: 10µF */}
      <ElCap x={c100[0]} z={c100[1]} h={0.30} r={0.085} color="#1a3a6a" />
      <ElCap x={c47[0]} z={c47[1]} h={0.29} r={0.067} color="#1a1a1a" />
      <Transistor x={reg[0]} z={reg[1]} rot={Math.PI} />
      <Diode x={d3[0]} z={d3[1]} rot={Math.PI / 2} kind="power" />

      {/* input + drive */}
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

      {/* delay */}
      <ICDip x={ic2[0]} z={ic2[1]} pins={16} rot={Math.PI / 2} color="#1c1c1c" label="ECTO-399" />
      <ElCap x={ecD[0][0]} z={ecD[0][1]} h={0.20} r={0.054} color="#2a4a1a" />
      <ElCap x={ecD[1][0]} z={ecD[1][1]} h={0.20} r={0.054} color="#1a3a6a" />
      <ElCap x={ecD[2][0]} z={ecD[2][1]} h={0.20} r={0.054} color="#1a1a1a" />
      <DiscCap x={disc2[0]} z={disc2[1]} color="#c8a050" />
      <DiscCap x={disc3[0]} z={disc3[1]} color="#b8c070" />
      <THResistor x={rbX[0]} z={rbZ} b1="#e0a010" b2="#101010" b3="#c02010" />
      <THResistor x={rbX[1]} z={rbZ} />
      <THResistor x={rbX[2]} z={rbZ} b1="#202080" b2="#c02010" b3="#e0a020" />
      <THResistor x={rbX[3]} z={rbZ} b1="#101010" b2="#e0a010" b3="#a0a010" />

      {/* reverb + saída */}
      <BeltonBrick x={brick[0]} z={brick[1]} />
      <Transistor x={q2[0]} z={q2[1]} rot={Math.PI / 2} />
      <ElCap x={ecOut[0]} z={ecOut[1]} h={0.20} r={0.054} color="#1a3a6a" />
      <THResistor x={rOut[0]} z={rOut[1]} />
    </group>
  );
}

function Internals({ width, length }: { width: number; length: number; height: number }) {
  // placa menor que o gabinete (como na vida real), comprida o suficiente pra
  // alcançar quase a parede frontal; cresce mantendo o centro fixo (ZOFF) pra
  // não desalinhar componentes/fios. Vão sob a placa livre pra bateria + fios.
  const PCB_Y = -0.06;
  const PCB_W = width - 0.42;
  const PCB_L = length - 0.52;
  const PCB_ZOFF = 0.17;

  return (
    <group>
      <group position={[0, PCB_Y, PCB_ZOFF]}>
        <PCBBoard w={PCB_W} l={PCB_L} />
        {([[-1,-1],[1,-1],[1,1],[-1,1]] as const).map(([sx,sz], j) => (
          <mesh key={j} position={[sx*(PCB_W/2-0.07), PCB_BH/2+0.11, sz*(PCB_L/2-0.07)]}>
            <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
            <meshStandardMaterial color="#8a8a78" metalness={0.75} roughness={0.30} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
