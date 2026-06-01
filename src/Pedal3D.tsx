import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, Text, RoundedBox, Environment, OrbitControls, Svg, Html } from "@react-three/drei";
import * as THREE from "three";

function easeOutBack(x: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function ResponsiveCamera() {
  const { camera } = useThree();
  useEffect(() => {
    const update = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = window.innerWidth < 768 ? 52 : 34;
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
    <div style={{ width: "100%", height: "100%", userSelect: "none", WebkitUserSelect: "none" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [-1.5, 7.0, 5.5], fov: 34, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
      >

        <Environment preset="city" environmentIntensity={0.8} />

        <ambientLight intensity={0.25} />

        <directionalLight position={[-4, 6, 3]} intensity={2.8} color="#e8dfc8" castShadow shadow-mapSize={[2048, 2048]} />

        <directionalLight position={[5, 4, -3]} intensity={1.6} color="#c8d8f0" />

        <pointLight position={[0, -3, 5]} intensity={1.2} color="#ffffff" />

        <pointLight position={[2, 4, 1]} intensity={2.5} color="#9d4edd" distance={8} />
        <pointLight position={[-2, 4, 1]} intensity={2.0} color="#48cae4" distance={8} />

        <ResponsiveCamera />
        <OrbitControls
          enabled={controlsEnabled}
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
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
          {!hasInteracted && <HintSystem accent={palette.accent} />}
          <PedalScene
            palette={palette}
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

const GHOST_ICON = { scale: 0.006, ip: [-0.300, 0.319] as [number, number], lp: [0.072, 0.055] as [number, number] };

type PresetVisual = {
  pickguard: { top: string; mid: string; base: string; screw: string };
  knobTheme: "dark" | "cream";
  silk:  string;
  ink:   string;
  knobAccent: string;
  showArc: boolean;
};
const PRESET_VISUALS: PresetVisual[] = [
  { pickguard: { top: "#0a0a0e", mid: "#0d1a28", base: "#06060a", screw: "#1a2a3a" }, knobTheme: "dark", silk: "#48cae4", ink: "#c8e8f4", knobAccent: "#48cae4", showArc: false },
  { pickguard: { top: "#0a0a0e", mid: "#1a0e04", base: "#06060a", screw: "#2a1a08" }, knobTheme: "dark", silk: "#f77f00", ink: "#f4d8b0", knobAccent: "#f77f00", showArc: false },
  { pickguard: { top: "#0a0a0e", mid: "#180808", base: "#06060a", screw: "#2a1010" }, knobTheme: "dark", silk: "#e02828", ink: "#f0b0b0", knobAccent: "#cc2020", showArc: false },
  { pickguard: { top: "#0a0a0e", mid: "#140e00", base: "#06060a", screw: "#281e04" }, knobTheme: "dark", silk: "#c8a832", ink: "#e8d890", knobAccent: "#c8a832", showArc: false },
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
          envMapIntensity={1.0}
          clearcoat={0.45}
          clearcoatRoughness={0}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </RoundedBox>

      <SideJack position={[-W / 2 - 0.04, 0, 0]} metal={palette.metal} />
      <SideJack position={[W / 2 + 0.04, 0, 0]} metal={palette.metal} />

      <group position={[0, H / 2 + 0.02, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>

        <Svg src="/ghost.svg" scale={GHOST_ICON.scale} position={[GHOST_ICON.ip[0], GHOST_ICON.ip[1], 0]} fillMaterial={svgMaterial as any} strokeMaterial={svgMaterial as any} />
        <group position={[GHOST_ICON.lp[0], GHOST_ICON.lp[1], 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.8}>
          <LED3D position={[0, 0, 0]} color={ledColor} active={ledActive} ink="#000000" />
        </group>
      </group>

      <LabelText position={[0, H / 2 + 0.02, 0.54]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.20} color={inkColor} outlineColor={inkColor} outlineWidth="2%" anchorX="center" letterSpacing={0.28}>
        GHOST
      </LabelText>

      <LabelText position={[kp.drive[0],  H / 2 + 0.005, kp.drive[2]  + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">DRIVE</LabelText>
      <LabelText position={[kp.echo[0],   H / 2 + 0.005, kp.echo[2]   + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">ECHO</LabelText>
      <LabelText position={[kp.tone[0],   H / 2 + 0.005, kp.tone[2]   + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">TONE</LabelText>
      <LabelText position={[kp.reverb[0], H / 2 + 0.005, kp.reverb[2] + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">REVERB</LabelText>
      <LabelText position={[kp.master[0], H / 2 + 0.005, kp.master[2] + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">VOLUME</LabelText>

      <Knob3D position={kp.drive}  value={knobDrive}  onChange={(val) => onKnobChange("drive",  val)} ink={inkColor} accent={knobAccent} label="Drive"  setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.00} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.echo}   value={knobEcho}   onChange={(val) => onKnobChange("echo",   val)} ink={inkColor} accent={knobAccent} label="Echo"   setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.08} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.tone}   value={knobTone}   onChange={(val) => onKnobChange("tone",   val)} ink={inkColor} accent={knobAccent} label="Tone"   setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.16} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.reverb} value={knobReverb} onChange={(val) => onKnobChange("reverb", val)} ink={inkColor} accent={knobAccent} label="Reverb" setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.24} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <MasterKnob3D position={kp.master} value={knobMaster} onChange={(val) => onKnobChange("master", val)} accent={palette.accent} setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.32} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />

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
        const POT_LUG_Y = topY - 0.17;
        const SW_LUG_Y = topY - 0.17;
        const BAT_Y = 0.10;
        const LED_Y = topY - 0.06;
        const PAD_Y = -0.066;
        return (
          <group>

            <PotBody x={kp.drive[0]}  z={kp.drive[2]}  topY={topY} />
            <PotBody x={kp.echo[0]}   z={kp.echo[2]}   topY={topY} />
            <PotBody x={kp.reverb[0]} z={kp.reverb[2]} topY={topY} />
            <PotBody x={kp.tone[0]}   z={kp.tone[2]}   topY={topY} />
            <PotBody x={kp.master[0]} z={kp.master[2]} topY={topY} />
            <SwitchBody x={0} z={FSZ} topY={topY} />
            <group rotation={[0, Math.PI, 0]}>
              <Battery9V x={0} z={0.05} />
            </group>

            <Wire start={[ 0.035, BAT_Y, -0.24]} end={[ 0.07, PAD_Y, -0.30]} color="#d02020" sag={0.03} />
            <Wire start={[-0.035, BAT_Y, -0.24]} end={[-0.07, PAD_Y, -0.30]} color="#181818" sag={0.03} />

            <Wire start={[kp.drive[0],  POT_LUG_Y, kp.drive[2]]}  end={[-0.55, PAD_Y, -1.12]} color="#202020" />
            <Wire start={[kp.echo[0],   POT_LUG_Y, kp.echo[2]]}   end={[ 0.02, PAD_Y, -1.12]} color="#22aa3a" />
            <Wire start={[kp.reverb[0], POT_LUG_Y, kp.reverb[2]]} end={[ 0.55, PAD_Y, -1.12]} color="#e0b020" />
            <Wire start={[kp.tone[0],   POT_LUG_Y, kp.tone[2]]}   end={[-0.26, PAD_Y, -0.72]} color="#9d4edd" />
            <Wire start={[kp.master[0], POT_LUG_Y, kp.master[2]]} end={[ 0.30, PAD_Y, -0.72]} color="#c040b0" />

            <Wire start={[ 0.06, SW_LUG_Y, FSZ - 0.06]} end={[ 0.14, PAD_Y, 1.05]} color="#22aa3a" />
            <Wire start={[-0.06, SW_LUG_Y, FSZ - 0.06]} end={[-0.14, PAD_Y, 1.05]} color="#3a6ad0" />

            <Wire start={[-0.76, 0.0, -0.09]} end={[-0.78, PAD_Y, -0.05]} color="#3a8ade" sag={0.03} />
            <Wire start={[ 0.76, 0.0, -0.09]} end={[ 0.78, PAD_Y,  0.05]} color="#3a8ade" sag={0.03} />

            <Wire start={[0.092, LED_Y, 0.165]} end={[ 0.14, PAD_Y, 0.22]} color="#d02020" r={0.008} />
            <Wire start={[0.052, LED_Y, 0.165]} end={[ 0.02, PAD_Y, 0.22]} color="#181818" r={0.008} />
          </group>
        );
      })()}

    </group>
  );
}

function PedalScene({
  palette,
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

function LED3D({
  position,
  color,
  active,
  ink,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  active: boolean;
  ink: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.008, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.064, 0.02, 24]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, 0.024, 0]}>
        <sphereGeometry args={[0.04, 24, 24]} />
        <meshBasicMaterial color={active ? color : "#321b52"} />
      </mesh>
      {active && (
        <mesh position={[0, 0.024, 0]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.32} />
        </mesh>
      )}
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

  return (
    <group position={position} rotation={[0, 0, isLeft ? -Math.PI / 2 : Math.PI / 2]}>

      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.078, 0.078, 0.16, 20]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.62} metalness={0.18} />
      </mesh>

      {[-0.03, 0.03].map((dx, i) => (
        <mesh key={`lug${i}`} position={[dx, 0.37, 0]} castShadow>
          <boxGeometry args={[0.02, 0.036, 0.06]} />
          <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.24} />
        </mesh>
      ))}

      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.064, 0.064, 0.19, 24]} />
        <meshStandardMaterial color={chrome} metalness={0.92} roughness={0.30} />
      </mesh>
      {[0.066, 0.090, 0.114, 0.138, 0.162, 0.186, 0.210, 0.234].map((y, i) => (
        <mesh key={`t${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.064, 0.0042, 6, 24]} />
          <meshStandardMaterial color={chrome} metalness={0.9} roughness={0.26} />
        </mesh>
      ))}

      <mesh position={[0, 0.043, 0]}>
        <cylinderGeometry args={[0.096, 0.096, 0.007, 24]} />
        <meshStandardMaterial color={metal} metalness={0.85} roughness={0.24} />
      </mesh>

      <mesh position={[0, 0.011, 0]} castShadow>
        <cylinderGeometry args={[0.086, 0.086, 0.058, 6]} />
        <meshStandardMaterial color={chrome} metalness={0.95} roughness={0.16} />
      </mesh>

      <mesh position={[0, -0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.060, 0.011, 10, 28]} />
        <meshStandardMaterial color={chrome} metalness={0.95} roughness={0.12} />
      </mesh>

      <mesh position={[0, 0.016, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.074, 24]} />
        <meshStandardMaterial color="#040404" roughness={0.92} metalness={0} />
      </mesh>
      <mesh position={[0, 0.054, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.05, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function PotBody({ x, z, topY }: { x: number; z: number; topY: number }) {
  const bodyR = 0.085;
  const bodyH = 0.11;
  const bodyCY = topY - 0.025 - bodyH / 2;
  const canBottom = bodyCY - bodyH / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, topY - 0.025, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.05, 16]} />
        <meshStandardMaterial color="#caa83c" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, bodyCY, 0]} castShadow>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 24]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.82} roughness={0.32} />
      </mesh>
      <mesh position={[0, canBottom + 0.007, 0]}>
        <cylinderGeometry args={[bodyR + 0.006, bodyR + 0.006, 0.012, 24]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
      </mesh>
      {[-0.032, 0, 0.032].map((dx, i) => (
        <mesh key={i} position={[dx, canBottom - 0.016, 0]}>
          <boxGeometry args={[0.009, 0.034, 0.013]} />
          <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
}

function SwitchBody({ x, z, topY }: { x: number; z: number; topY: number }) {
  const w = 0.20, d = 0.20, h = 0.11;
  const cy = topY - 0.025 - h / 2;
  const lugY = cy - h / 2 - 0.016;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, cy, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#d8c298" metalness={0.12} roughness={0.6} />
      </mesh>
      {[-0.06, 0, 0.06].flatMap((lx) =>
        [-0.06, 0, 0.06].map((lz) => (
          <mesh key={`${lx}_${lz}`} position={[lx, lugY, lz]}>
            <boxGeometry args={[0.013, 0.034, 0.013]} />
            <meshStandardMaterial color="#c9b070" metalness={0.78} roughness={0.22} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Battery9V({ x, z }: { x: number; z: number }) {
  const cy = 0.05;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, cy, 0]} castShadow>
        <boxGeometry args={[0.17, 0.17, 0.34]} />
        <meshStandardMaterial color="#202024" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, cy + 0.05, 0.18]}>
        <boxGeometry args={[0.12, 0.06, 0.02]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.5} metalness={0.3} />
      </mesh>
      {[-0.035, 0.035].map((dx, i) => (
        <mesh key={i} position={[dx, cy + 0.05, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.02, 12]} />
          <meshStandardMaterial color="#c0c0c4" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Wire({ start, end, color, sag, r = 0.010 }: {
  start: [number, number, number]; end: [number, number, number]; color: string; sag?: number; r?: number;
}) {
  const geometry = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const horiz = Math.hypot(e.x - s.x, e.z - s.z);
    const drop = sag ?? Math.min(0.045 + horiz * 0.10, 0.14);
    const mid = new THREE.Vector3().lerpVectors(s, e, 0.5);
    mid.y -= drop;
    const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
    return new THREE.TubeGeometry(curve, 24, r, 8, false);
  }, [start, end, sag, r]);
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.04} />
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

function ICDip({ x, z, pins = 8, rot = 0, color = "#101010" }: {
  x: number; z: number; pins?: number; rot?: number; color?: string;
}) {
  const half = pins / 2;
  const chipW = 0.10;
  const chipL = half * 0.055 + 0.015;
  const chipH = 0.038;
  const topY = PCB_BH / 2 + chipH / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, topY, 0]} castShadow>
        <boxGeometry args={[chipW, chipH, chipL]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.04} />
      </mesh>
      <mesh position={[0, topY + chipH / 2 + 0.0005, -chipL / 2 + 0.022]}>
        <cylinderGeometry args={[0.009, 0.009, 0.001, 10]} />
        <meshBasicMaterial color="#383838" />
      </mesh>
      {Array.from({ length: half }, (_, i) => {
        const pz = -chipL / 2 + 0.030 + i * 0.055;
        return (
          <group key={i}>
            <mesh position={[-chipW / 2 - 0.013, PCB_BH / 2 + 0.005, pz]}>
              <boxGeometry args={[0.026, 0.010, 0.011]} />
              <meshStandardMaterial color="#b0b0b0" metalness={0.88} roughness={0.12} />
            </mesh>
            <mesh position={[chipW / 2 + 0.013, PCB_BH / 2 + 0.005, pz]}>
              <boxGeometry args={[0.026, 0.010, 0.011]} />
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
  const bL = 0.052;
  const bR = 0.015;
  const bodyY = PCB_BH / 2 + bR;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, bodyY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[bR, bR, bL, 10]} />
        <meshStandardMaterial color="#e8d8b0" roughness={0.6} />
      </mesh>
      {([0, 0.010, 0.022] as const).map((dz, i) => (
        <mesh key={i} position={[0, bodyY, -bL / 2 + 0.014 + dz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[bR + 0.0015, bR + 0.0015, 0.006, 10]} />
          <meshBasicMaterial color={i === 0 ? b1 : i === 1 ? b2 : b3} />
        </mesh>
      ))}
      <mesh position={[0, PCB_BH / 2 + 0.006, bL / 2 + 0.018]}>
        <boxGeometry args={[0.003, 0.012, 0.034]} />
        <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
      </mesh>
      <mesh position={[0, PCB_BH / 2 + 0.006, -bL / 2 - 0.018]}>
        <boxGeometry args={[0.003, 0.012, 0.034]} />
        <meshStandardMaterial color="#d0d0d0" metalness={0.88} roughness={0.12} />
      </mesh>
    </group>
  );
}

function DiscCap({ x, z, color = "#d4b86a" }: { x: number; z: number; color?: string }) {
  return (
    <group position={[x, PCB_BH / 2 + 0.014, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.024, 0.020, 0.010, 14]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  );
}

function Transistor({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const h = 0.07;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, PCB_BH / 2 + h / 2, 0]} castShadow scale={[1, 1, 0.62]}>
        <cylinderGeometry args={[0.034, 0.034, h, 16]} />
        <meshStandardMaterial color="#141414" roughness={0.55} metalness={0.06} />
      </mesh>
      {[-0.018, 0, 0.018].map((dx, i) => (
        <mesh key={i} position={[dx, PCB_BH / 2 + 0.002, 0.012]}>
          <boxGeometry args={[0.005, 0.010, 0.024]} />
          <meshStandardMaterial color="#c0c0c4" metalness={0.85} roughness={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function BoxCap({ x, z, rot = 0, color = "#1a4fa0" }: { x: number; z: number; rot?: number; color?: string }) {
  const h = 0.05;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, PCB_BH / 2 + h / 2, 0]} castShadow>
        <boxGeometry args={[0.07, h, 0.026]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      {[-0.022, 0.022].map((dx, i) => (
        <mesh key={i} position={[dx, PCB_BH / 2 + 0.003, 0.020]}>
          <boxGeometry args={[0.004, 0.010, 0.026]} />
          <meshStandardMaterial color="#c0c0c4" metalness={0.85} roughness={0.18} />
        </mesh>
      ))}
    </group>
  );
}

const SILK = "#d8d8cc";

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
  const hatchY = top - 0.0007;
  const silkY = top + 0.0024;

  const railX = w / 2 - 0.10;

  const capZ = -l * 0.37;
  const ec1x = -w * 0.30, ec2x = -w * 0.10, ec3x = w * 0.10, ec4x = w * 0.30;

  const icZ = -l * 0.03;
  const ic1x = -w * 0.17, ic2x = w * 0.14;

  const raZ = -l * 0.19;
  const raX = [-w * 0.30, -w * 0.15, 0, w * 0.15, w * 0.30];
  const rbZ = l * 0.13;
  const rbX = [-w * 0.24, -w * 0.08, w * 0.08, w * 0.24];

  const bcZ = l * 0.31;
  const bc1x = -w * 0.27, bc2x = 0, bc3x = w * 0.27;

  const dc1x = -w * 0.36, dc1z = l * 0.03;
  const dc2x =  w * 0.34, dc2z = l * 0.04;
  const dc3x = -w * 0.02, dc3z = -l * 0.27;

  const t1x = w * 0.34, t1z = -l * 0.07;
  const t2x = -w * 0.36, t2z = -l * 0.11;

  type Seg = { x1: number; z1: number; x2: number; z2: number; tw: number };
  const segs: Seg[] = [
    { x1: -railX, z1: -l / 2 + 0.06, x2:  railX, z2: -l / 2 + 0.06, tw: 0.030 },
    { x1: -railX, z1:  l / 2 - 0.06, x2:  railX, z2:  l / 2 - 0.06, tw: 0.030 },
    { x1: -railX, z1: -l / 2 + 0.06, x2: -railX, z2:  l / 2 - 0.06, tw: 0.022 },
    { x1:  railX, z1: -l / 2 + 0.06, x2:  railX, z2:  l / 2 - 0.06, tw: 0.022 },

    { x1: ec1x, z1: capZ, x2: ec4x, z2: capZ, tw: 0.024 },
    { x1: ec1x, z1: capZ, x2: raX[0], z2: raZ, tw: 0.013 },
    { x1: ec4x, z1: capZ, x2: raX[4], z2: raZ, tw: 0.013 },
    { x1: dc3x, z1: dc3z, x2: ec2x, z2: capZ, tw: 0.012 },

    { x1: raX[0], z1: raZ, x2: raX[4], z2: raZ, tw: 0.014 },
    { x1: rbX[0], z1: rbZ, x2: rbX[3], z2: rbZ, tw: 0.014 },
    { x1: bc1x, z1: bcZ, x2: bc3x, z2: bcZ, tw: 0.018 },

    { x1: ic1x, z1: icZ, x2: ic1x, z2: -l * 0.30, tw: 0.016 },
    { x1: ic2x, z1: icZ, x2: ic2x, z2: -l * 0.30, tw: 0.016 },
    { x1: ic1x, z1: icZ, x2: raX[1], z2: raZ, tw: 0.013 },
    { x1: ic2x, z1: icZ, x2: raX[3], z2: raZ, tw: 0.013 },
    { x1: ic1x, z1: icZ, x2: rbX[0], z2: rbZ, tw: 0.013 },
    { x1: ic2x, z1: icZ, x2: rbX[3], z2: rbZ, tw: 0.013 },
    { x1: raX[2], z1: raZ, x2: ic1x, z2: icZ, tw: 0.011 },

    { x1: rbX[1], z1: rbZ, x2: bc1x, z2: bcZ, tw: 0.012 },
    { x1: rbX[2], z1: rbZ, x2: bc3x, z2: bcZ, tw: 0.012 },

    { x1: t1x, z1: t1z, x2: ic2x, z2: icZ, tw: 0.012 },
    { x1: t2x, z1: t2z, x2: ic1x, z2: icZ, tw: 0.012 },
    { x1: dc1x, z1: dc1z, x2: ic1x, z2: icZ, tw: 0.011 },
    { x1: dc2x, z1: dc2z, x2: ic2x, z2: icZ, tw: 0.011 },
  ];

  type Conn = { px: number; pz: number; nx: number; nz: number };
  const conns: Conn[] = [
    { px: -0.55, pz: -1.12, nx: ec1x, nz: capZ },
    { px:  0.02, pz: -1.12, nx: ec2x, nz: capZ },
    { px:  0.55, pz: -1.12, nx: ec4x, nz: capZ },
    { px: -0.26, pz: -0.72, nx: raX[1], nz: raZ },
    { px:  0.30, pz: -0.72, nx: raX[3], nz: raZ },
    { px:  0.14, pz:  1.05, nx: bc2x + 0.10, nz: bcZ },
    { px: -0.14, pz:  1.05, nx: bc2x - 0.10, nz: bcZ },
    { px: -0.78, pz: -0.05, nx: ic1x, nz: icZ },
    { px:  0.78, pz:  0.05, nx: ic2x, nz: icZ },
    { px:  0.07, pz: -0.30, nx: dc3x, nz: dc3z },
    { px: -0.07, pz: -0.30, nx: raX[2], nz: raZ },
    { px:  0.14, pz:  0.22, nx: rbX[2], nz: rbZ },
    { px:  0.02, pz:  0.22, nx: rbX[1], nz: rbZ },
  ];
  conns.forEach(({ px, pz, nx, nz }) =>
    segs.push({ x1: px, z1: pz, x2: nx, z2: nz, tw: 0.012 }));

  const groundTex = useMemo(() => {
    const cw = 256;
    const ch = Math.round(cw * (l / w));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "rgba(200,154,60,0.62)";
    ctx.lineWidth = 1.6;
    const nx = 22;
    const nz = Math.round(nx * (l / w));
    for (let i = 1; i < nx; i++) {
      const px = (i / nx) * cw;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ch); ctx.stroke();
    }
    for (let j = 1; j < nz; j++) {
      const py = (j / nz) * ch;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }, [w, l]);

  return (
    <group>
      <mesh receiveShadow>
        <boxGeometry args={[w, PCB_BH, l]} />
        <meshStandardMaterial color="#0e3a1c" roughness={0.65} metalness={0.08} />
      </mesh>

      <mesh position={[0, hatchY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.16, l - 0.16]} />
        <meshBasicMaterial map={groundTex} transparent opacity={0.5} depthWrite={false} />
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
      <SilkRect x={ic1x} z={icZ} w={0.16} d={0.30} y={silkY} />
      <SilkRect x={ic2x} z={icZ} w={0.16} d={0.30} y={silkY} />
      <SilkRing x={ec1x} z={capZ} r={0.082} y={silkY} />
      <SilkRing x={ec2x} z={capZ} r={0.076} y={silkY} />
      <SilkRing x={ec3x} z={capZ} r={0.076} y={silkY} />
      <SilkRing x={ec4x} z={capZ} r={0.060} y={silkY} />
      {raX.map((rx, i) => <SilkRect key={`sra${i}`} x={rx} z={raZ} w={0.05} d={0.13} y={silkY} t={0.003} />)}
      {rbX.map((rx, i) => <SilkRect key={`srb${i}`} x={rx} z={rbZ} w={0.05} d={0.13} y={silkY} t={0.003} />)}

      <ElCap x={ec1x} z={capZ} h={0.24} r={0.072} color="#1a3a6a" />
      <ElCap x={ec2x} z={capZ} h={0.22} r={0.066} color="#1a1a1a" />
      <ElCap x={ec3x} z={capZ} h={0.22} r={0.066} color="#1a3a6a" />
      <ElCap x={ec4x} z={capZ} h={0.16} r={0.048} color="#2a4a1a" />
      <ICDip x={ic1x} z={icZ} pins={8} />
      <ICDip x={ic2x} z={icZ} pins={8} color="#1c1c1c" />
      <THResistor x={raX[0]} z={raZ} />
      <THResistor x={raX[1]} z={raZ} b1="#c02010" b2="#101010" b3="#e0a020" />
      <THResistor x={raX[2]} z={raZ} b1="#202080" b2="#c02010" b3="#e0a020" />
      <THResistor x={raX[3]} z={raZ} b1="#101010" b2="#e0a010" b3="#a0a010" />
      <THResistor x={raX[4]} z={raZ} />
      <THResistor x={rbX[0]} z={rbZ} b1="#e0a010" b2="#101010" b3="#c02010" />
      <THResistor x={rbX[1]} z={rbZ} />
      <THResistor x={rbX[2]} z={rbZ} b1="#202080" b2="#c02010" b3="#e0a020" />
      <THResistor x={rbX[3]} z={rbZ} b1="#101010" b2="#e0a010" b3="#a0a010" />
      <DiscCap x={dc1x} z={dc1z} />
      <DiscCap x={dc2x} z={dc2z} color="#c8a050" />
      <DiscCap x={dc3x} z={dc3z} color="#b8c070" />
      <Transistor x={t1x} z={t1z} />
      <Transistor x={t2x} z={t2z} />
      <BoxCap x={bc1x} z={bcZ} color="#1a4fa0" />
      <BoxCap x={bc2x} z={bcZ} color="#7a1010" />
      <BoxCap x={bc3x} z={bcZ} color="#1a4fa0" />
    </group>
  );
}

function Internals({ width, length }: { width: number; length: number; height: number }) {
  const PCB_Y = -0.10;
  const PCB_W = width - 0.42;
  const PCB_L = length - 0.42;

  return (
    <group>
      <group position={[0, PCB_Y, 0]}>
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
