import { useMemo } from "react";
import { rigAt } from "../data/presets";

const F_MIN = 60;
const F_MAX = 12000;
const POINTS = 44;
const DB_RANGE = 26;

function bell(octaves: number, width: number): number {
  return Math.exp(-(octaves * octaves) / (2 * width * width));
}

export function PresetCurve({
  presetIdx,
  color,
  width = 62,
  height = 18,
  dim = false,
}: {
  presetIdx: number;
  color: string;
  width?: number;
  height?: number;
  dim?: boolean;
}) {
  const path = useMemo(() => {
    const cab = rigAt(presetIdx).cab;
    const span = Math.log2(F_MAX / F_MIN);
    const points: [number, number][] = [];

    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      const f = F_MIN * Math.pow(2, t * span);
      let db = 0;
      if (f < cab.lowCut) db -= 12 * Math.log2(cab.lowCut / f);
      if (f > cab.topCut) db -= 12 * Math.log2(f / cab.topCut);
      db += cab.bodyGain * bell(Math.log2(f / cab.bodyHz), 0.85);
      db += cab.presGain * bell(Math.log2(f / cab.presHz), 0.7);
      const y =
        height -
        ((Math.max(-DB_RANGE, Math.min(DB_RANGE, db)) + DB_RANGE) / (2 * DB_RANGE)) * height;
      points.push([t * width, y]);
    }

    return points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ");
  }, [presetIdx, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden>
      <path
        d={path}
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={dim ? 0.32 : 0.95}
      />
    </svg>
  );
}
