import { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { HintSurface } from "../knobs/HintSurface";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const MAX_FRAME = 0.033;
const SUB_STEP = 1 / 240;
const TRAVEL = -0.05;
const HOVER_DIP = TRAVEL * 0.18;
const HOVER_IN = 20;
const HOVER_OUT = 9;
const ON_GLOW = 0.9;
const HOVER_GLOW_OFF = 0.38;
const HOVER_GLOW_ON = 0.22;
const FLASH_GLOW = 0.7;
const CAN_HOVER = typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover)").matches;

export function Footswitch3D({
  position,
  pressed,
  onPress,
  onRelease,
  onCancel,
  metal,
  accent = "#ffffff",
  active = false,
}: {
  position: [number, number, number];
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onCancel: () => void;
  metal: string;
  accent?: string;
  active?: boolean;
}) {
  const plungerRef = useRef<THREE.Group>(null);
  const bezelMat = useRef<THREE.MeshStandardMaterial>(null);
  const yRef = useRef(0);
  const vRef = useRef(0);
  const flashRef = useRef(0);
  const hoverRef = useRef(0);
  const litRef = useRef(active ? 1 : 0);
  const isHoveredRef = useRef(false);
  const prevPressed = useRef(false);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    const g = plungerRef.current;
    if (!g) return;
    const dt = Math.min(delta, MAX_FRAME);

    hoverRef.current = THREE.MathUtils.damp(
      hoverRef.current,
      isHoveredRef.current ? 1 : 0,
      isHoveredRef.current ? HOVER_IN : HOVER_OUT,
      dt,
    );
    litRef.current = THREE.MathUtils.damp(litRef.current, active ? 1 : 0, 10, dt);

    const target = pressed ? TRAVEL : hoverRef.current * HOVER_DIP;
    const k = pressed ? 900 : 320;
    const c = pressed ? 60 : 16;
    const steps = Math.ceil(dt / SUB_STEP);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      vRef.current += (-k * (yRef.current - target) - c * vRef.current) * h;
      yRef.current += vRef.current * h;
    }
    yRef.current = THREE.MathUtils.clamp(yRef.current, TRAVEL * 1.5, 0.02);
    g.position.y = 0.18 + yRef.current;

    if (pressed && !prevPressed.current) flashRef.current = 1;
    prevPressed.current = pressed;
    flashRef.current = Math.max(0, flashRef.current - dt * 4);
    if (bezelMat.current) {
      const lit = litRef.current;
      const hoverGlow = THREE.MathUtils.lerp(HOVER_GLOW_OFF, HOVER_GLOW_ON, lit);
      bezelMat.current.emissiveIntensity =
        lit * ON_GLOW + hoverRef.current * hoverGlow + flashRef.current * FLASH_GLOW;
    }
  });

  return (
    <group
      position={position}
      scale={0.8}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        isHoveredRef.current = true;
        if (CAN_HOVER) setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        isHoveredRef.current = false;
        setHovered(false);
        document.body.style.cursor = "";
      }}
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
      {hovered && (
        <Html
          position={[0, 0.78, 0]}
          center
          distanceFactor={5.4}
          zIndexRange={[50, 0]}
          pointerEvents="none"
        >
          <HintSurface>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "0.14em",
                color: accent,
              }}
            >
              {active ? "STOMP TO BYPASS" : "STOMP TO ARM"}
            </div>
          </HintSurface>
        </Html>
      )}

      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 32]} />
        <meshStandardMaterial
          ref={bezelMat}
          color="#0b0d0c"
          roughness={0.5}
          emissive={accent}
          emissiveIntensity={0}
        />
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
