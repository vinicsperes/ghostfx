import { useEffect, useRef, useState } from "react";

const DURATION = 450;

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return (
    "#" +
    [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function useColorTransition(target: string): string {
  const liveRef = useRef(target);
  const rafRef = useRef(0);
  const [color, setColor] = useState(target);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const from = liveRef.current;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / DURATION);
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const c = lerpHex(from, target, e);
      liveRef.current = c;
      setColor(c);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return color;
}
