import { useMemo } from "react";
import { RoundedBox, Svg } from "@react-three/drei";
import * as THREE from "three";
import { Wire, CableClip, SideJack, PotBody, SwitchBody, Battery9V } from "../parts";
import { Knob3D, MasterKnob3D } from "../knobs";
import { Internals } from "../internals";
import { LabelText } from "./LabelText";
import { Footswitch3D } from "./Footswitch3D";
import { HangTag } from "./HangTag";

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
  { pickguard: { top: "#0a0a0e", mid: "#1a3520", base: "#06060a", screw: "#3a3a48" }, knobTheme: "dark", silk: "#20f040", ink: "#e0e0ec", knobAccent: "#16a030", showArc: false },
  { pickguard: { top: "#0a0612", mid: "#170926", base: "#050208", screw: "#2a1640" }, knobTheme: "dark", silk: "#7d22c4", ink: "#e0d4f6", knobAccent: "#7d22c4", showArc: false },
  { pickguard: { top: "#0a0c10", mid: "#141a22", base: "#050608", screw: "#2a3340" }, knobTheme: "dark", silk: "#a8c4dc", ink: "#e8eef6", knobAccent: "#a8c4dc", showArc: false },
  { pickguard: { top: "#0a0a0e", mid: "#180808", base: "#06060a", screw: "#2a1010" }, knobTheme: "dark", silk: "#e02828", ink: "#f0b0b0", knobAccent: "#cc2020", showArc: false },
  { pickguard: { top: "#0e0810", mid: "#1e0a1a", base: "#070409", screw: "#3a1830" }, knobTheme: "dark", silk: "#d46a9f", ink: "#f4d2e6", knobAccent: "#d46a9f", showArc: false },
];

export function PedalBody({
  palette,
  xray = false,
  ledColor,
  ledActive,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
  knobFlanger,
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
  knobFlanger: number;
  knobMaster: number;
  onKnobChange: (knob: "drive" | "echo" | "tone" | "reverb" | "flanger" | "master", value: number) => void;
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
    tone:   [-0.62, H / 2, -0.52] as [number, number, number],
    flanger: [ 0.00, H / 2, -0.52] as [number, number, number],
    master: [ 0.62, H / 2, -0.52] as [number, number, number],
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
      <LabelText position={[kp.flanger[0], H / 2 + 0.005, kp.flanger[2] + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">FLANGER</LabelText>
      <LabelText position={[kp.master[0], H / 2 + 0.005, kp.master[2] + 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.062} color={silkColor} outlineColor={silkColor} outlineWidth="1%" anchorX="center">VOLUME</LabelText>

      <Knob3D position={kp.drive}  value={knobDrive}  onChange={(val) => onKnobChange("drive",  val)} ink={inkColor} accent={knobAccent} label="Drive"  setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.00} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.echo}   value={knobEcho}   onChange={(val) => onKnobChange("echo",   val)} ink={inkColor} accent={knobAccent} label="Echo"   setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.08} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.tone}   value={knobTone}   onChange={(val) => onKnobChange("tone",   val)} ink={inkColor} accent={knobAccent} label="Tone"   setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.16} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.reverb} value={knobReverb} onChange={(val) => onKnobChange("reverb", val)} ink={inkColor} accent={knobAccent} label="Reverb" setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.24} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <Knob3D position={kp.flanger} value={knobFlanger} onChange={(val) => onKnobChange("flanger", val)} ink={inkColor} accent={knobAccent} label="Flanger" setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.32} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />
      <MasterKnob3D position={kp.master} value={knobMaster} onChange={(val) => onKnobChange("master", val)} accent={knobAccent} setControlsEnabled={setControlsEnabled} bootTrigger={bootTrigger} delay={0.40} knobTheme={knobTheme} knobStyle="default" showArc={v?.showArc} />

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
        const SW_LUG_Y = topY - 0.235;
        const LED_Y = topY - 0.06;
        const PAD_Y = -0.026;
        return (
          <group>

            <PotBody x={kp.drive[0]}  z={kp.drive[2]}  topY={topY} />
            <PotBody x={kp.echo[0]}   z={kp.echo[2]}   topY={topY} />
            <PotBody x={kp.reverb[0]} z={kp.reverb[2]} topY={topY} />
            <PotBody x={kp.tone[0]}   z={kp.tone[2]}   topY={topY} />
            <PotBody x={kp.flanger[0]} z={kp.flanger[2]} topY={topY} />
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
            <Wire start={[kp.flanger[0], POT_LUG_Y, kp.flanger[2] + POT_LUG_Z]} mid={[kp.flanger[0], 0.03, kp.flanger[2] + POT_LUG_Z]} end={[ 0.02, PAD_Y, -0.60]} color="#3a6ad0" />
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
