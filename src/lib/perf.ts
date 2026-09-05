export const perfOn =
  typeof location !== "undefined" && new URLSearchParams(location.search).has("perf");

export const savings = { on: true };

export const bg = { covered: false };

export type FrameStats = { fps: number; p50: number; p95: number; jank: number };

export function watchFrames(onSample: (stats: FrameStats) => void, span = 1000): () => void {
  const times: number[] = [];
  let last = performance.now();
  let since = last;
  let raf = 0;

  const tick = (now: number) => {
    times.push(now - last);
    last = now;
    if (now - since >= span) {
      const sorted = [...times].sort((a, b) => a - b);
      const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
      onSample({
        fps: Math.round((times.length * 1000) / (now - since)),
        p50: at(0.5) ?? 0,
        p95: at(0.95) ?? 0,
        jank: times.filter((t) => t > 33).length,
      });
      times.length = 0;
      since = now;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
