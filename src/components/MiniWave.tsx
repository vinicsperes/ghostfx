const BARS = 42;

export function MiniWave({
  peaks,
  color,
  width = 96,
  height = 20,
}: {
  peaks: Float32Array;
  color: string;
  width?: number;
  height?: number;
}) {
  if (!peaks.length) return null;
  let max = 0;
  for (const v of peaks) if (v > max) max = v;
  const scale = 1 / Math.max(0.12, max);
  const step = width / BARS;
  const w = Math.max(1, step - 1);
  const mid = height / 2;

  const bars = Array.from({ length: BARS }, (_, b) => {
    const from = Math.floor((b / BARS) * peaks.length);
    const to = Math.max(from + 1, Math.floor(((b + 1) / BARS) * peaks.length));
    let p = 0;
    for (let i = from; i < to; i++) if (peaks[i] > p) p = peaks[i];
    const h = Math.max(1, Math.pow(Math.min(1, p * scale), 0.8) * (mid - 1));
    return { x: b * step, h };
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden>
      {bars.map(({ x, h }, i) => (
        <rect
          key={i}
          x={x}
          y={mid - h}
          width={w}
          height={h * 2}
          rx={w / 2}
          fill={color}
          opacity={0.72}
        />
      ))}
    </svg>
  );
}
