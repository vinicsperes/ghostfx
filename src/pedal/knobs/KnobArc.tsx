import { useMemo } from "react";
import { Line } from "@react-three/drei";

const START = -2.35;
const RANGE = 4.7;
const N_TRACK = 64;

export function KnobArc({
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
  const trackPoints = useMemo<[number, number, number][]>(
    () =>
      Array.from({ length: N_TRACK }, (_, i) => {
        const θ = START + (i / (N_TRACK - 1)) * RANGE;
        return [Math.sin(θ) * radius, yOffset, -Math.cos(θ) * radius];
      }),
    [radius, yOffset],
  );

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
