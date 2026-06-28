import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { ResponsiveCamera, CameraShake, HintSystem, PedalScene } from "./pedal/scene";

const IS_TOUCH = typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);
const IS_NARROW = typeof window !== "undefined" && window.innerWidth < 768;

export default function Pedal3D({
  ledColor,
  isPlaying,
  onTap,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
  knobFlanger,
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
  knobFlanger: number;
  knobMaster: number;
  onKnobChange: (knob: "drive" | "echo" | "tone" | "reverb" | "flanger" | "master", value: number) => void;
  palette: { pedal: string; ink: string; accent: string; cream: string; metal: string };
  presetIdx?: number | null;
  stompCount?: number;
  view?: [number, number, number];
  xray?: boolean;
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
            knobFlanger={knobFlanger}
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
