import { useRef, useState } from "react";
import type { useArrangement } from "../hooks/useArrangement";
import { LANES, LANE_GAP, RULER_H } from "../lib/timeline";

export const HEADS_W = 158;

function Knob({
  value,
  accent,
  onChange,
}: {
  value: number;
  accent: string;
  onChange: (next: number) => void;
}) {
  const dragRef = useRef<{ y: number; from: number } | null>(null);
  const angle = value * 132;
  const centred = Math.abs(value) < 0.02;

  return (
    <div
      role="slider"
      aria-label="Pan"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={-100}
      aria-valuemax={100}
      tabIndex={0}
      title={`Pan ${centred ? "center" : value < 0 ? `${Math.round(-value * 100)}% left` : `${Math.round(value * 100)}% right`}, double click to center`}
      onDoubleClick={() => onChange(0)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { y: e.clientY, from: value };
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        onChange(Math.max(-1, Math.min(1, drag.from + (drag.y - e.clientY) / 90)));
      }}
      onPointerUp={(e) => {
        dragRef.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(1, value + 0.1));
        if (e.key === "ArrowLeft") onChange(Math.max(-1, value - 0.1));
      }}
      style={{
        position: "relative",
        width: 17,
        height: 17,
        flexShrink: 0,
        borderRadius: "50%",
        border: `1px solid ${centred ? "rgba(231,228,220,0.18)" : accent + "77"}`,
        background: "radial-gradient(circle at 50% 32%, #23262c, #0d0f13)",
        cursor: "ns-resize",
        touchAction: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "50%",
          top: 2,
          width: 1.5,
          height: 6,
          borderRadius: 1,
          background: centred ? "rgba(231,228,220,0.5)" : accent,
          transformOrigin: "50% 6.5px",
          transform: `translateX(-50%) rotate(${angle}deg)`,
        }}
      />
    </div>
  );
}

function Slider({
  value,
  color,
  onChange,
}: {
  value: number;
  color: string;
  onChange: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

  const from = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Lane level"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="relative flex items-center flex-1 min-w-0"
      style={{ height: 15, cursor: "pointer", touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragRef.current = true;
        from(e.clientX);
      }}
      onPointerMove={(e) => dragRef.current && from(e.clientX)}
      onPointerUp={(e) => {
        dragRef.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(1, value + 0.05));
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - 0.05));
      }}
    >
      <div
        className="absolute left-0 right-0"
        style={{ height: 3, borderRadius: 2, background: "rgba(231,228,220,0.1)" }}
      />
      <div
        className="absolute left-0"
        style={{ height: 3, width: `${value * 100}%`, borderRadius: 2, background: color }}
      />
      <div
        className="absolute"
        style={{
          left: `${value * 100}%`,
          width: 8,
          height: 12,
          borderRadius: 2,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg,#2b2f34,#12151a)",
          border: `1px solid ${color}88`,
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  on,
  color,
  title,
  onClick,
}: {
  label: string;
  on: boolean;
  color: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className="font-[var(--font-mono)] shrink-0"
      style={{
        width: 16,
        padding: "1px 0",
        borderRadius: 4,
        border: `1px solid ${on ? color : "rgba(231,228,220,0.14)"}`,
        background: on ? `${color}22` : "transparent",
        fontSize: 7.5,
        letterSpacing: "0.04em",
        color: on ? color : "rgba(231,228,220,0.42)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function LaneHeads({
  arrangement,
  accent,
  laneH,
  selected,
  onSelect,
}: {
  arrangement: ReturnType<typeof useArrangement>;
  accent: string;
  laneH: number;
  selected: number | null;
  onSelect: (lane: number) => void;
}) {
  const { lanes, clips, setLaneLevel, setLanePan, toggleLaneMute, toggleLaneSolo, renameLane } =
    arrangement;
  const [editing, setEditing] = useState<number | null>(null);
  const soloed = lanes.some((lane) => lane.solo);

  return (
    <div
      className="shrink-0"
      style={{
        width: HEADS_W,
        borderRight: "1px solid rgba(231,228,220,0.09)",
        background: "rgba(255,255,255,0.014)",
      }}
    >
      <div
        style={{
          height: RULER_H,
          borderBottom: "1px solid rgba(231,228,220,0.07)",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
        }}
      >
        <span
          className="font-[var(--font-mono)] uppercase"
          style={{ fontSize: 8, letterSpacing: "0.24em", color: "rgba(231,228,220,0.3)" }}
        >
          Lanes
        </span>
      </div>

      {lanes.map((lane, i) => {
        const count = clips.filter((clip) => clip.lane === i).length;
        const dimmed = lane.muted || (soloed && !lane.solo);
        const tint = count ? (clips.find((clip) => clip.lane === i)?.color ?? accent) : accent;
        const on = selected === i;
        return (
          <div
            key={i}
            onPointerDown={() => onSelect(i)}
            className="flex flex-col justify-center"
            style={{
              height: laneH,
              marginBottom: i < LANES - 1 ? LANE_GAP : 0,
              padding: "0 8px",
              gap: 4,
              borderLeft: `2px solid ${on ? tint : "transparent"}`,
              background: on ? "rgba(255,255,255,0.03)" : "transparent",
              opacity: dimmed ? 0.45 : 1,
            }}
          >
            <div className="flex items-center" style={{ gap: 5 }}>
              {editing === i ? (
                <input
                  autoFocus
                  defaultValue={lane.name}
                  maxLength={14}
                  onBlur={(e) => {
                    renameLane(i, e.target.value);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      (e.target as HTMLInputElement).value = lane.name;
                      (e.target as HTMLInputElement).blur();
                    }
                    e.stopPropagation();
                  }}
                  className="font-[var(--font-mono)] flex-1 min-w-0"
                  style={{
                    padding: "1px 3px",
                    borderRadius: 3,
                    border: `1px solid ${tint}66`,
                    background: "rgba(0,0,0,0.5)",
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    color: "#e7e4dc",
                    outline: "none",
                  }}
                />
              ) : (
                <button
                  onDoubleClick={() => setEditing(i)}
                  title="Double click to rename"
                  className="font-[var(--font-mono)] truncate flex-1 min-w-0"
                  style={{
                    textAlign: "left",
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    color: count ? "rgba(231,228,220,0.82)" : "rgba(231,228,220,0.34)",
                    cursor: "text",
                  }}
                >
                  {lane.name}
                </button>
              )}
              <span
                className="font-[var(--font-mono)] shrink-0"
                style={{
                  fontSize: 8,
                  fontVariantNumeric: "tabular-nums",
                  color: "rgba(231,228,220,0.3)",
                }}
              >
                {count || ""}
              </span>
              <Toggle
                label="M"
                on={lane.muted}
                color="#f5a33e"
                title={lane.muted ? "Unmute this lane" : "Mute this lane"}
                onClick={() => toggleLaneMute(i)}
              />
              <Toggle
                label="S"
                on={lane.solo}
                color={accent}
                title={lane.solo ? "Stop soloing this lane" : "Solo this lane"}
                onClick={() => toggleLaneSolo(i)}
              />
            </div>

            <div className="flex items-center" style={{ gap: 6 }}>
              <Slider value={lane.level} color={tint} onChange={(v) => setLaneLevel(i, v)} />
              <Knob value={lane.pan} accent={tint} onChange={(v) => setLanePan(i, v)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
