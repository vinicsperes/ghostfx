import { useEffect, useRef, useState } from "react";
import type { useArrangement } from "../hooks/useArrangement";
import { clipLength } from "../hooks/useArrangement";
import { LANES, LANE_H, LANE_GAP, RULER_H } from "../lib/timeline";
import { clock } from "../lib/format";

const MIN_SECONDS = 20;
const EDGE = 7;
const HEAD_H = 13;

function ClipWave({
  peaks,
  from,
  to,
  color,
  width,
  height,
}: {
  peaks: Float32Array;
  from: number;
  to: number;
  color: string;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const W = canvas.width;
    const H = canvas.height;
    const mid = H / 2;
    c.clearRect(0, 0, W, H);

    const lo = Math.max(0, Math.floor(from * peaks.length));
    const hi = Math.min(peaks.length, Math.max(lo + 1, Math.ceil(to * peaks.length)));
    let max = 0;
    for (let i = lo; i < hi; i++) if (peaks[i] > max) max = peaks[i];
    const scale = 1 / Math.max(0.12, max);

    const step = Math.max(1, Math.round(2 * dpr));
    const bars = Math.max(1, Math.floor(W / step));
    c.fillStyle = color;
    for (let b = 0; b < bars; b++) {
      const a = lo + Math.floor((b / bars) * (hi - lo));
      const z = Math.max(a + 1, lo + Math.floor(((b + 1) / bars) * (hi - lo)));
      let p = 0;
      for (let i = a; i < z && i < hi; i++) if (peaks[i] > p) p = peaks[i];
      const h = Math.max(dpr * 0.6, Math.pow(Math.min(1, p * scale), 0.8) * (mid - dpr));
      c.globalAlpha = 0.32 + 0.5 * Math.min(1, p * scale);
      c.fillRect(b * step, mid - h, Math.max(1, step - dpr), h * 2);
    }
    c.globalAlpha = 1;
  }, [peaks, from, to, color, width, height]);

  return <canvas ref={ref} style={{ width, height, display: "block" }} />;
}

export function Timeline({
  arrangement,
  accent,
  pps,
  contentRef,
}: {
  arrangement: ReturnType<typeof useArrangement>;
  accent: string;
  pps: number;
  contentRef?: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const { clips, length, move, trim, remove, seek, getPosition } = arrangement;

  const wrapRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: "move" | "in" | "out";
    dx: number;
    dy: number;
  } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const seconds = Math.max(MIN_SECONDS, Math.ceil(length) + 4);
  const width = seconds * pps;
  const used = clips.reduce((max, clip) => Math.max(max, clip.lane + 1), 0);
  const lanes = Math.max(1, Math.min(LANES, used + 1));
  const height = RULER_H + lanes * LANE_H + (lanes - 1) * LANE_GAP;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const at = getPosition();
      if (headRef.current) headRef.current.style.transform = `translateX(${at * pps}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPosition, pps]);

  const laneTop = (lane: number) => RULER_H + lane * (LANE_H + LANE_GAP);

  const onClipDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    const clip = clips.find((c) => c.id === id);
    const wrap = wrapRef.current;
    if (!clip || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const local = e.clientX - rect.left - clip.at * pps;
    const width = clipLength(clip) * pps;
    const mode = local <= EDGE ? "in" : local >= width - EDGE ? "out" : "move";
    dragRef.current = {
      id,
      mode,
      dx: local,
      dy: e.clientY - rect.top - laneTop(clip.lane),
    };
    setDragging(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onClipMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();

    if (!drag) {
      const clip = clips.find((c) => c.id === e.currentTarget.getAttribute("data-clip"));
      if (clip) {
        const local = e.clientX - rect.left - clip.at * pps;
        const width = clipLength(clip) * pps;
        e.currentTarget.style.cursor =
          local <= EDGE || local >= width - EDGE ? "ew-resize" : "grab";
      }
      return;
    }

    const clip = clips.find((c) => c.id === drag.id);
    if (!clip) return;
    const x = (e.clientX - rect.left) / pps;

    if (drag.mode === "in") {
      trim(drag.id, "in", clip.in + (x - clip.at));
      return;
    }
    if (drag.mode === "out") {
      trim(drag.id, "out", clip.in + Math.max(0, x - clip.at));
      return;
    }

    const at = (e.clientX - rect.left - drag.dx) / pps;
    const top = e.clientY - rect.top - drag.dy;
    const lane = Math.round((top - RULER_H) / (LANE_H + LANE_GAP));
    move(drag.id, lane, Math.max(0, at));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onRuler = (e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    seek(Math.max(0, (e.clientX - rect.left) / pps));
  };

  return (
    <div
      className="overflow-x-auto"
      style={{
        borderRadius: 10,
        border: "1px solid rgba(231,228,220,0.08)",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div
        ref={(el) => {
          wrapRef.current = el;
          if (contentRef) contentRef.current = el;
        }}
        style={{ position: "relative", width, height, minWidth: "100%" }}
      >
        <div
          onPointerDown={onRuler}
          style={{
            position: "absolute",
            inset: `0 0 auto 0`,
            height: RULER_H,
            borderBottom: "1px solid rgba(231,228,220,0.07)",
            cursor: "pointer",
          }}
        >
          {Array.from({ length: seconds + 1 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: i * pps,
                top: 0,
                bottom: 0,
                width: 1,
                background: i % 5 === 0 ? "rgba(231,228,220,0.16)" : "rgba(231,228,220,0.06)",
              }}
            >
              {i % 5 === 0 && (
                <span
                  className="font-[var(--font-mono)]"
                  style={{
                    position: "absolute",
                    left: 3,
                    top: 2,
                    fontSize: 8,
                    color: "rgba(231,228,220,0.35)",
                  }}
                >
                  {clock(i)}
                </span>
              )}
            </div>
          ))}
        </div>

        {Array.from({ length: lanes }, (_, lane) => (
          <div
            key={lane}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: laneTop(lane),
              height: LANE_H,
              borderRadius: 6,
              background: lane % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
              border: "1px solid rgba(231,228,220,0.04)",
            }}
          />
        ))}

        {clips.map((clip) => (
          <div
            key={clip.id}
            data-clip={clip.id}
            onPointerDown={(e) => onClipDown(e, clip.id)}
            onPointerMove={onClipMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            title={`${clip.name} · ${clock(clipLength(clip))} · drag the edges to trim`}
            style={{
              position: "absolute",
              left: clip.at * pps,
              top: laneTop(clip.lane),
              width: Math.max(26, clipLength(clip) * pps),
              height: LANE_H,
              borderRadius: 5,
              overflow: "hidden",
              border: `1px solid ${clip.color}55`,
              background: `linear-gradient(180deg, ${clip.color}1f, rgba(0,0,0,0.35))`,
              boxShadow: dragging === clip.id ? `0 6px 18px rgba(0,0,0,0.5)` : "none",
              cursor: dragging === clip.id ? "grabbing" : "grab",
              touchAction: "none",
              zIndex: dragging === clip.id ? 3 : 2,
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ height: HEAD_H, padding: "0 3px 0 5px", gap: 4 }}
            >
              <span
                className="font-[var(--font-mono)] truncate"
                style={{ fontSize: 8, letterSpacing: "0.06em", color: clip.color, opacity: 0.9 }}
              >
                {clip.name}
              </span>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => remove(clip.id)}
                aria-label="Remove clip"
                title="Remove clip"
                style={{
                  fontSize: 10,
                  lineHeight: 1,
                  padding: "0 2px",
                  color: "rgba(231,228,220,0.4)",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ pointerEvents: "none", padding: "0 1px" }}>
              <ClipWave
                peaks={clip.peaks}
                from={clip.in / clip.full}
                to={clip.out / clip.full}
                color={clip.color}
                width={Math.max(24, clipLength(clip) * pps - 4)}
                height={LANE_H - HEAD_H - 3}
              />
            </div>
          </div>
        ))}

        <div
          ref={headRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 1,
            background: "#e7e4dc",
            boxShadow: `0 0 6px ${accent}`,
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
      </div>
    </div>
  );
}
