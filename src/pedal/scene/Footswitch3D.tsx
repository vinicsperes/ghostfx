import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

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
  const isHoveredRef = useRef(false);
  const prevPressed = useRef(false);

  useFrame((_, delta) => {
    const g = plungerRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.033);
    const target = pressed ? -0.05 : 0;
    const k = pressed ? 900 : 320;
    const c = pressed ? 60 : 16;
    vRef.current += (-k * (yRef.current - target) - c * vRef.current) * dt;
    yRef.current += vRef.current * dt;
    g.position.y = 0.18 + yRef.current;

    if (pressed && !prevPressed.current) flashRef.current = 1;
    prevPressed.current = pressed;
    flashRef.current = Math.max(0, flashRef.current - dt * 4);
    hoverRef.current = THREE.MathUtils.damp(hoverRef.current, isHoveredRef.current ? 1 : 0, 12, dt);
    if (bezelMat.current) {
      const base = active ? 0.55 : 0;
      const target = base + hoverRef.current * 1.5 + flashRef.current * 0.7;
      bezelMat.current.emissiveIntensity = THREE.MathUtils.damp(
        bezelMat.current.emissiveIntensity,
        target,
        9,
        dt,
      );
    }
  });

  return (
    <group
      position={position}
      scale={0.8}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        isHoveredRef.current = true;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        isHoveredRef.current = false;
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
