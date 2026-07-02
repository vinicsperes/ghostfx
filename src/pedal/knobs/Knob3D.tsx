import { useEffect, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { KnobArc } from "./KnobArc";
import { KnobTooltip } from "./KnobTooltip";
import { easeOutBack } from "../easing";

export function Knob3D({
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
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const noSelect = (e: Event) => {
      if (dragRef.current) e.preventDefault();
    };
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
    if (g) g.rotation.y = (3 / 4) * Math.PI;
  }, []);

  useEffect(() => {
    if (bootTrigger > animRef.current.seenTrigger) {
      animRef.current.seenTrigger = bootTrigger;
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
      if (!g || animRef.current.progress >= 0 || animRef.current.seenTrigger === 0) return;
      const from = g.rotation.y;
      if (Math.abs(from - targetAngle) < 0.01) return;
      transRef.current = { active: true, from, to: targetAngle, progress: 0 };
    }, delay * 400);
    return () => {
      if (transTimeoutRef.current) clearTimeout(transTimeoutRef.current);
    };
  }, [value, delay]);

  useFrame((_, delta) => {
    const g = knobGroupRef.current;
    if (!g) return;
    if (dragRef.current) {
      g.rotation.y = (3 / 4) * Math.PI - value * (3 / 2) * Math.PI;
      return;
    }
    if (animRef.current.progress >= 0) {
      animRef.current.progress = Math.min(1, animRef.current.progress + delta / 1.1);
      const p = easeOutBack(animRef.current.progress);
      g.rotation.y = (3 / 4) * Math.PI - animRef.current.targetValue * p * (3 / 2) * Math.PI;
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
      onPointerEnter={() => {
        isHoveredRef.current = true;
        setControlsEnabled(false);
        document.body.style.cursor = "grab";
      }}
      onPointerLeave={() => {
        isHoveredRef.current = false;
        if (!dragRef.current) {
          setControlsEnabled(true);
          document.body.style.cursor = "";
        }
      }}
      onWheel={(e: ThreeEvent<WheelEvent>) => {
        e.stopPropagation();
        if (animRef.current.seenTrigger === 0) animRef.current.seenTrigger = 1;
        const step = e.deltaY < 0 ? 0.04 : -0.04;
        onChange(Math.max(0, Math.min(1, value + step)));
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (animRef.current.seenTrigger === 0) animRef.current.seenTrigger = 1;
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
              <cylinderGeometry args={[0.168, 0.18, 0.016, 36]} />
              <meshStandardMaterial color="#131313" roughness={0.92} metalness={0} />
            </mesh>

            <mesh position={[0, 0.108, 0]} castShadow>
              <cylinderGeometry args={[0.128, 0.138, 0.195, 36]} />
              <meshStandardMaterial color="#111111" roughness={0.9} metalness={0} />
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
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#c8b870" : "#1e1e1e"}
                roughness={0.6}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.105, 0]} castShadow>
              <cylinderGeometry args={[0.138, 0.143, 0.172, 40]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#bfae72" : "#161616"}
                roughness={0.6}
                metalness={0}
              />
            </mesh>

            {[...Array(26)].map((_, i) => {
              const a = (i / 26) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.145, 0.105, Math.sin(a) * 0.145]}
                  rotation={[0, a, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.006, 0.172, 0.012]} />
                  <meshStandardMaterial
                    color={knobTheme === "cream" ? "#d0be80" : "#242424"}
                    roughness={0.58}
                    metalness={0}
                  />
                </mesh>
              );
            })}

            <mesh position={[0, 0.196, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.01, 40]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#d4c27a" : "#1a1a1a"}
                roughness={0.52}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.202, -0.068]}>
              <boxGeometry args={[0.008, 0.004, 0.136]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : knobStyle === "orb" ? (
          <>
            <mesh position={[0, 0.01, 0]} castShadow>
              <cylinderGeometry args={[0.175, 0.183, 0.02, 32]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.2} />
            </mesh>

            {[...Array(20)].map((_, i) => {
              const a = (i / 20) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.168, 0.032, Math.sin(a) * 0.168]}
                  rotation={[0, a, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.007, 0.024, 0.014]} />
                  <meshStandardMaterial color="#141414" roughness={0.9} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.08, 0.14, 24]} />
              <meshStandardMaterial color="#0c0c0c" roughness={0.8} metalness={0.12} />
            </mesh>

            <mesh position={[0, 0.215, 0]}>
              <sphereGeometry args={[0.092, 28, 28]} />
              <meshPhysicalMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={1.0}
                roughness={0.05}
                metalness={0}
                transparent
                opacity={0.78}
              />
            </mesh>

            <mesh position={[0, 0.215, 0]}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshBasicMaterial color={accent} />
            </mesh>

            <mesh position={[0, 0.058, -0.082]}>
              <boxGeometry args={[0.008, 0.036, 0.01]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, -0.01, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.17, 0.04, 32]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#c4b890" : "#050505"}
                roughness={0.85}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 0.22, 32]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#d4c8a0" : "#080808"}
                roughness={0.8}
                metalness={0}
              />
            </mesh>

            {[...Array(8)].map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const r = 0.085;
              return (
                <mesh key={i} position={[Math.cos(a) * r, 0.1, Math.sin(a) * r]} castShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.22, 12]} />
                  <meshStandardMaterial
                    color={knobTheme === "cream" ? "#ddd0ac" : "#0a0a0a"}
                    roughness={0.8}
                    metalness={0}
                  />
                </mesh>
              );
            })}

            <mesh position={[0, 0.21, 0]} castShadow>
              <cylinderGeometry args={[0.105, 0.115, 0.025, 32]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#e8dcbc" : "#111118"}
                roughness={0.75}
                metalness={0}
              />
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
