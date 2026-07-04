import { useEffect, useRef, useState } from "react";
import {
  PRESET_OPACITY,
  BLEND_OUT,
  BLEND_IN,
  INTRO_IDX,
  buildShader,
  type GlState,
} from "./shaders";

export default function PresetBg({
  presetIdx,
  introActive = false,
}: {
  presetIdx: number | null;
  introActive?: boolean;
}) {
  const effIdx = introActive ? INTRO_IDX : presetIdx;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const glState = useRef<GlState | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(performance.now());

  const [canvasOpacity, setCanvasOpacity] = useState(effIdx !== null ? PRESET_OPACITY[effIdx] : 0);
  const setOpacityRef = useRef(setCanvasOpacity);
  setOpacityRef.current = setCanvasOpacity;

  const tr = useRef<{
    phase: "in" | "out" | "stable";
    phaseStart: number;
    blend: number;
    currentIdx: number | null;
    pendingIdx: number | null;
  }>({
    phase: "in",
    phaseStart: performance.now(),
    blend: 0,
    currentIdx: effIdx,
    pendingIdx: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    gl.getExtension("OES_standard_derivatives");
    glRef.current = gl;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    if (tr.current.currentIdx !== null) glState.current = buildShader(gl, tr.current.currentIdx);
    const onContextLost = (e: Event) => {
      e.preventDefault();
      glState.current = null;
    };
    const onContextRestored = () => {
      gl.getExtension("OES_standard_derivatives");
      resize();
      if (tr.current.currentIdx !== null) glState.current = buildShader(gl, tr.current.currentIdx);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, []);

  useEffect(() => {
    const t = tr.current;
    if (effIdx === t.currentIdx && t.phase === "stable") return;
    t.pendingIdx = effIdx;
    if (t.phase !== "out") {
      t.phase = "out";
      t.phaseStart = performance.now();
    }
  }, [effIdx]);

  useEffect(() => {
    const tick = () => {
      const gl = glRef.current;
      const t = tr.current;
      const now = performance.now();

      if (t.phase === "out") {
        const p = Math.min(1, (now - t.phaseStart) / BLEND_OUT);
        const e = p * p;
        t.blend = 1 - e;
        if (p >= 1) {
          if (t.pendingIdx !== null && gl && !gl.isContextLost()) {
            glState.current = buildShader(gl, t.pendingIdx, glState.current?.prog);
            setOpacityRef.current(PRESET_OPACITY[t.pendingIdx]);
          }
          t.currentIdx = t.pendingIdx;
          t.pendingIdx = null;
          t.phase = "in";
          t.phaseStart = now;
          t.blend = 0;
        }
      } else if (t.phase === "in") {
        const p = Math.min(1, (now - t.phaseStart) / BLEND_IN);
        const e = 1 - (1 - p) * (1 - p) * (1 - p);
        t.blend = e;
        if (p >= 1) {
          t.phase = "stable";
          t.blend = 1;
        }
      }

      const s = glState.current;
      if (s && gl) {
        const time = (now - startRef.current) * 0.00012;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const sidebar = window.innerWidth >= 1024 ? 360 * dpr : 0;
        gl.uniform1f(s.tLoc, time);
        gl.uniform2f(s.rLoc, gl.canvas.width + sidebar, gl.canvas.height);
        gl.uniform1f(s.blendLoc, t.blend);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", zIndex: 1, opacity: canvasOpacity }}
    />
  );
}
