import { useEffect, useRef, useState } from "react";
import type { useArrangement } from "../hooks/useArrangement";
import { clipLength } from "../hooks/useArrangement";
import { LANES, LANE_H, LANE_GAP, RULER_H } from "../lib/timeline";
import { clock } from "../lib/format";

const MIN_SECONDS = 20;
const EDGE = 9;
const HEAD_H = 15;
const SNAP_PX = 8;

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
      c.globalAlpha = 0.34 + 0.52 * Math.min(1, p * scale);
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
  snap = true,
  selected,
  onSelect,
}: {
  arrangement: ReturnType<typeof useArrangement>;
  accent: string;
  pps: number;
  snap?: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [laneH, setLaneH] = useState(LANE_H);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const room = el.clientHeight - RULER_H - (LANES - 1) * LANE_GAP - 14;
      setLaneH(Math.max(LANE_H, Math.min(124, Math.floor(room / LANES))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { clips, length, move, trim, remove, seek, getPosition } = arrangement;

  const wrapRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    mode: "move" | "in" | "out";
    dx: number;
    dy: number;
  } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [guide, setGuide] = useState<number | null>(null);
  const [dropLane, setDropLane] = useState<number | null>(null);

  const seconds = Math.max(MIN_SECONDS, Math.ceil(length) + 4);
  const width = seconds * pps;
  const height = RULER_H + LANES * laneH + (LANES - 1) * LANE_GAP;
  const label = pps >= 55 ? 1 : pps >= 28 ? 2 : 5;
  const ticks = pps >= 24 ? 1 : 5;

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

  const laneTop = (lane: number) => RULER_H + lane * (laneH + LANE_GAP);

  const snapTargets = (exclude: string): number[] => {
    const list = [0, getPosition()];
    for (const clip of clips) {
      if (clip.id === exclude) continue;
      list.push(clip.at, clip.at + clipLength(clip));
    }
    if (pps >= 24) for (let i = 0; i <= seconds; i++) list.push(i);
    return list;
  };

  const snapTo = (value: number, targets: number[], on: boolean) => {
    if (!on) return { at: value, mark: null as number | null };
    let mark: number | null = null;
    let near = SNAP_PX / pps;
    for (const target of targets) {
      const gap = Math.abs(target - value);
      if (gap <= near) {
        near = gap;
        mark = target;
      }
    }
    return { at: mark ?? value, mark };
  };

  const onClipDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    const clip = clips.find((c) => c.id === id);
    const wrap = wrapRef.current;
    if (!clip || !wrap) return;
    onSelect(id);
    const rect = wrap.getBoundingClientRect();
    const local = e.clientX - rect.left - clip.at * pps;
    const span = clipLength(clip) * pps;
    const mode = local <= EDGE ? "in" : local >= span - EDGE ? "out" : "move";
    dragRef.current = { id, mode, dx: local, dy: e.clientY - rect.top - laneTop(clip.lane) };
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
        const span = clipLength(clip) * pps;
        e.currentTarget.style.cursor = local <= EDGE || local >= span - EDGE ? "ew-resize" : "grab";
      }
      return;
    }

    const clip = clips.find((c) => c.id === drag.id);
    if (!clip) return;
    const on = snap !== e.altKey;
    const targets = snapTargets(drag.id);
    const x = (e.clientX - rect.left) / pps;

    if (drag.mode === "in") {
      const edge = snapTo(x, targets, on);
      setGuide(edge.mark);
      trim(drag.id, "in", clip.in + (edge.at - clip.at));
      return;
    }
    if (drag.mode === "out") {
      const edge = snapTo(x, targets, on);
      setGuide(edge.mark);
      trim(drag.id, "out", clip.in + Math.max(0, edge.at - clip.at));
      return;
    }

    const raw = (e.clientX - rect.left - drag.dx) / pps;
    const span = clipLength(clip);
    const head = snapTo(raw, targets, on);
    const tail = snapTo(raw + span, targets, on);
    const byTail =
      tail.mark !== null &&
      (head.mark === null || Math.abs(tail.at - raw - span) < Math.abs(head.at - raw));
    const at = byTail ? tail.at - span : head.at;
    setGuide(byTail ? tail.mark : head.mark);

    const top = e.clientY - rect.top - drag.dy;
    const lane = Math.max(0, Math.min(LANES - 1, Math.round((top - RULER_H) / (laneH + LANE_GAP))));
    setDropLane(lane);
    move(drag.id, lane, Math.max(0, at));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(null);
    setGuide(null);
    setDropLane(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const scrub = (clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    seek(Math.max(0, (clientX - rect.left) / pps));
  };

  return (
    <div
      ref={boxRef}
      className="overflow-x-auto overflow-y-hidden"
      style={{
        height: "100%",
        borderRadius: 10,
        border: "1px solid rgba(231,228,220,0.08)",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div ref={wrapRef} style={{ position: "relative", width, height, minWidth: "100%" }}>
        <div
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubRef.current = true;
            scrub(e.clientX);
          }}
          onPointerMove={(e) => scrubRef.current && scrub(e.clientX)}
          onPointerUp={(e) => {
            scrubRef.current = false;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          }}
          onPointerCancel={() => {
            scrubRef.current = false;
          }}
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            height: RULER_H,
            borderBottom: "1px solid rgba(231,228,220,0.07)",
            cursor: "ew-resize",
            touchAction: "none",
          }}
        >
          {Array.from({ length: Math.floor(seconds / ticks) + 1 }, (_, i) => {
            const at = i * ticks;
            const strong = at % label === 0;
            return (
              <div
                key={at}
                style={{
                  position: "absolute",
                  left: at * pps,
                  top: strong ? 0 : RULER_H - 5,
                  bottom: 0,
                  width: 1,
                  background: strong ? "rgba(231,228,220,0.18)" : "rgba(231,228,220,0.07)",
                }}
              >
                {strong && (
                  <span
                    className="font-[var(--font-mono)]"
                    style={{
                      position: "absolute",
                      left: 3,
                      top: 3,
                      fontSize: 8,
                      fontVariantNumeric: "tabular-nums",
                      color: "rgba(231,228,220,0.4)",
                    }}
                  >
                    {clock(at)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {Array.from({ length: LANES }, (_, lane) => (
          <div
            key={lane}
            onPointerDown={() => onSelect(null)}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: laneTop(lane),
              height: laneH,
              borderRadius: 7,
              background:
                dropLane === lane
                  ? `${accent}0f`
                  : lane % 2 === 0
                    ? "rgba(255,255,255,0.016)"
                    : "transparent",
              border: `1px solid ${dropLane === lane ? accent + "3d" : "rgba(231,228,220,0.05)"}`,
            }}
          />
        ))}

        {clips.map((clip) => {
          const on = selected === clip.id;
          const lit = on || hover === clip.id || dragging === clip.id;
          const span = clipLength(clip);
          const wide = Math.max(30, span * pps);
          return (
            <div
              key={clip.id}
              data-clip={clip.id}
              onPointerDown={(e) => onClipDown(e, clip.id)}
              onPointerMove={onClipMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerEnter={() => setHover(clip.id)}
              onPointerLeave={() => setHover((id) => (id === clip.id ? null : id))}
              title={`${clip.name} · ${clock(span)} · drag to move, drag the edges to trim`}
              style={{
                position: "absolute",
                left: clip.at * pps,
                top: laneTop(clip.lane),
                width: wide,
                height: laneH,
                borderRadius: 6,
                overflow: "hidden",
                border: `1px solid ${on ? clip.color : lit ? clip.color + "88" : clip.color + "4d"}`,
                background: `linear-gradient(180deg, ${clip.color}${on ? "30" : "1f"}, rgba(0,0,0,0.4))`,
                boxShadow: on
                  ? `0 0 0 1px ${clip.color}55, 0 8px 22px rgba(0,0,0,0.55)`
                  : dragging === clip.id
                    ? "0 8px 22px rgba(0,0,0,0.55)"
                    : "none",
                opacity: clip.muted ? 0.42 : 1,
                cursor: dragging === clip.id ? "grabbing" : "grab",
                touchAction: "none",
                zIndex: dragging === clip.id ? 3 : on ? 2 : 1,
              }}
            >
              <div
                className="flex items-center"
                style={{ height: HEAD_H, padding: "0 3px 0 6px", gap: 5 }}
              >
                <span
                  className="font-[var(--font-mono)] truncate"
                  style={{
                    fontSize: 8.5,
                    letterSpacing: "0.06em",
                    color: clip.color,
                    opacity: on ? 1 : 0.85,
                  }}
                >
                  {clip.name}
                </span>
                <span
                  className="font-[var(--font-mono)] shrink-0"
                  style={{
                    fontSize: 8,
                    fontVariantNumeric: "tabular-nums",
                    color: "rgba(231,228,220,0.4)",
                  }}
                >
                  {clock(span)}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => remove(clip.id)}
                  aria-label="Remove clip"
                  title="Remove clip"
                  className="shrink-0"
                  style={{
                    fontSize: 11,
                    lineHeight: 1,
                    padding: "0 3px",
                    color: lit ? "rgba(231,228,220,0.7)" : "rgba(231,228,220,0.3)",
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
                  width={Math.max(28, wide - 4)}
                  height={laneH - HEAD_H - 4}
                />
              </div>
              {lit && (
                <>
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: HEAD_H,
                      bottom: 0,
                      width: EDGE,
                      pointerEvents: "none",
                      background: `linear-gradient(90deg, ${clip.color}66, transparent)`,
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 0,
                      top: HEAD_H,
                      bottom: 0,
                      width: EDGE,
                      pointerEvents: "none",
                      background: `linear-gradient(270deg, ${clip.color}66, transparent)`,
                    }}
                  />
                </>
              )}
            </div>
          );
        })}

        {guide !== null && (
          <div
            style={{
              position: "absolute",
              left: guide * pps,
              top: RULER_H,
              bottom: 0,
              width: 1,
              background: accent,
              opacity: 0.7,
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        )}

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
            zIndex: 5,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: -4,
              top: 0,
              width: 9,
              height: 7,
              background: accent,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
