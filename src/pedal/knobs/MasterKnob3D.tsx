import { useEffect, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { KnobArc } from "./KnobArc";
import { KnobTooltip } from "./KnobTooltip";
import { easeOutBack } from "../easing";

export function MasterKnob3D({
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
  mutedHint = false,
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
  mutedHint?: boolean;
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
  const masterGroupRef = useRef<THREE.Group>(null);
  const masterAnimRef = useRef({ progress: -1, seenTrigger: 0, targetValue: 0 });
  const masterTransRef = useRef({ active: false, from: 0, to: 0, progress: 0 });
  const masterTransTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const g = masterGroupRef.current;
    if (g) g.rotation.y = (3 / 4) * Math.PI;
  }, []);

  useEffect(() => {
    if (bootTrigger > masterAnimRef.current.seenTrigger) {
      masterAnimRef.current.seenTrigger = bootTrigger;
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
      if (!g || masterAnimRef.current.progress >= 0 || masterAnimRef.current.seenTrigger === 0)
        return;
      const from = g.rotation.y;
      if (Math.abs(from - targetAngle) < 0.01) return;
      masterTransRef.current = { active: true, from, to: targetAngle, progress: 0 };
    }, delay * 400);
    return () => {
      if (masterTransTimeoutRef.current) clearTimeout(masterTransTimeoutRef.current);
    };
  }, [value, delay]);

  useFrame((_, delta) => {
    const g = masterGroupRef.current;
    if (!g) return;
    if (dragRef.current) {
      g.rotation.y = (3 / 4) * Math.PI - value * (3 / 2) * Math.PI;
      return;
    }
    if (masterAnimRef.current.progress >= 0) {
      masterAnimRef.current.progress = Math.min(1, masterAnimRef.current.progress + delta / 1.1);
      const p = easeOutBack(masterAnimRef.current.progress);
      g.rotation.y = (3 / 4) * Math.PI - masterAnimRef.current.targetValue * p * (3 / 2) * Math.PI;
      if (masterAnimRef.current.progress >= 1) masterAnimRef.current.progress = -1;
      return;
    }
    if (masterTransRef.current.active) {
      masterTransRef.current.progress = Math.min(1, masterTransRef.current.progress + delta / 0.55);
      const p = easeOutBack(masterTransRef.current.progress);
      g.rotation.y =
        masterTransRef.current.from + (masterTransRef.current.to - masterTransRef.current.from) * p;
      if (masterTransRef.current.progress >= 1) masterTransRef.current.active = false;
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
        if (masterAnimRef.current.seenTrigger === 0) masterAnimRef.current.seenTrigger = 1;
        const step = e.deltaY < 0 ? 0.04 : -0.04;
        onChange(Math.max(0, Math.min(1, value + step)));
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (masterAnimRef.current.seenTrigger === 0) masterAnimRef.current.seenTrigger = 1;
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
      {isDragging && <KnobTooltip label="Volume" value={value} accent={accent} showBar />}
      {!isDragging && mutedHint && (
        <KnobTooltip label="TURN UP" value={value} accent={accent} pulse showBar icon="volumeUp" />
      )}
      <group ref={masterGroupRef}>
        {knobStyle === "bigmuff" ? (
          <>
            <mesh position={[0, 0.008, 0]} castShadow>
              <cylinderGeometry args={[0.192, 0.206, 0.016, 36]} />
              <meshStandardMaterial color="#131313" roughness={0.92} metalness={0} />
            </mesh>

            <mesh position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.148, 0.16, 0.215, 36]} />
              <meshStandardMaterial color="#111111" roughness={0.9} metalness={0} />
            </mesh>

            <mesh position={[0, 0.23, 0]} castShadow>
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
              <cylinderGeometry args={[0.24, 0.244, 0.018, 40]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#c8b870" : "#1e1e1e"}
                roughness={0.6}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.115, 0]} castShadow>
              <cylinderGeometry args={[0.152, 0.158, 0.19, 40]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#bfae72" : "#161616"}
                roughness={0.6}
                metalness={0}
              />
            </mesh>

            {[...Array(28)].map((_, i) => {
              const a = (i / 28) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.16, 0.115, Math.sin(a) * 0.16]}
                  rotation={[0, a, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.006, 0.19, 0.012]} />
                  <meshStandardMaterial
                    color={knobTheme === "cream" ? "#d0be80" : "#242424"}
                    roughness={0.58}
                    metalness={0}
                  />
                </mesh>
              );
            })}

            <mesh position={[0, 0.215, 0]} castShadow>
              <cylinderGeometry args={[0.153, 0.153, 0.01, 40]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#d4c27a" : "#1a1a1a"}
                roughness={0.52}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.221, -0.075]}>
              <boxGeometry args={[0.008, 0.004, 0.154]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : knobStyle === "orb" ? (
          <>
            <mesh position={[0, 0.01, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.21, 0.02, 32]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.2} />
            </mesh>

            {[...Array(24)].map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.193, 0.032, Math.sin(a) * 0.193]}
                  rotation={[0, a, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.007, 0.024, 0.014]} />
                  <meshStandardMaterial color="#141414" roughness={0.9} metalness={0} />
                </mesh>
              );
            })}

            <mesh position={[0, 0.115, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.095, 0.16, 24]} />
              <meshStandardMaterial color="#0c0c0c" roughness={0.8} metalness={0.12} />
            </mesh>

            <mesh position={[0, 0.245, 0]}>
              <sphereGeometry args={[0.11, 28, 28]} />
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

            <mesh position={[0, 0.245, 0]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color={accent} />
            </mesh>

            <mesh position={[0, 0.07, -0.096]}>
              <boxGeometry args={[0.008, 0.044, 0.01]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, -0.01, 0]} castShadow>
              <cylinderGeometry args={[0.165, 0.185, 0.045, 32]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#c4b890" : "#030305"}
                roughness={0.85}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.11, 0]} castShadow>
              <cylinderGeometry args={[0.155, 0.155, 0.24, 48]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#d8ccaa" : "#0c0c14"}
                roughness={0.8}
                metalness={0}
              />
            </mesh>

            {[...Array(36)].map((_, i) => {
              const a = (i / 36) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.157, 0.1, Math.sin(a) * 0.157]} castShadow>
                  <boxGeometry args={[0.008, 0.1, 0.01]} />
                  <meshStandardMaterial
                    color={knobTheme === "cream" ? "#bfb488" : "#1c1c28"}
                    roughness={0.9}
                    metalness={0}
                  />
                </mesh>
              );
            })}

            <mesh position={[0, 0.237, 0]} castShadow>
              <cylinderGeometry args={[0.135, 0.155, 0.02, 32]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#ddd0b0" : "#111118"}
                roughness={0.8}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.248, 0]}>
              <cylinderGeometry args={[0.134, 0.134, 0.002, 48]} />
              <meshStandardMaterial
                color={knobTheme === "cream" ? "#e8dcbc" : "#0a0a10"}
                roughness={0.75}
                metalness={0}
              />
            </mesh>

            <mesh position={[0, 0.25, -0.072]}>
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
