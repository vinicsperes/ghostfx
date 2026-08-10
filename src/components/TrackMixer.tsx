import { useCallback, useRef } from "react";
import type { useArrangement } from "../hooks/useArrangement";
import { clipLength } from "../hooks/useArrangement";
import { clock } from "../lib/format";
import { PanelLabel } from "./PanelLabel";

function MiniFader({
  value,
  color,
  disabled,
  onChange,
}: {
  value: number;
  color: string;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFrom = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
    },
    [onChange],
  );

  const pct = Math.round(value * 100);

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Clip level"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="relative flex items-center flex-1 min-w-0"
      style={{ height: 18, cursor: disabled ? "not-allowed" : "pointer", touchAction: "none" }}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        draggingRef.current = true;
        setFrom(e.clientX);
      }}
      onPointerMove={(e) => draggingRef.current && setFrom(e.clientX)}
      onPointerUp={(e) => {
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.02;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(1, value + step));
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(0, value - step));
      }}
    >
      <div
        className="absolute left-0 right-0"
        style={{ height: 3, borderRadius: 2, background: "rgba(231,228,220,0.1)" }}
      />
      <div
        className="absolute left-0"
        style={{
          height: 3,
          width: `${pct}%`,
          borderRadius: 2,
          background: disabled ? "rgba(231,228,220,0.18)" : color,
        }}
      />
      <div
        className="absolute"
        style={{
          left: `${pct}%`,
          width: 9,
          height: 13,
          borderRadius: 2,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg,#2b2f34,#12151a)",
          border: `1px solid ${disabled ? "rgba(231,228,220,0.16)" : color + "88"}`,
        }}
      />
    </div>
  );
}

export function TrackMixer({
  arrangement,
  accent,
}: {
  arrangement: ReturnType<typeof useArrangement>;
  accent: string;
}) {
  const { clips, master, setMaster, setClipLevel, toggleMute } = arrangement;

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex items-baseline" style={{ gap: 8 }}>
        <PanelLabel>Mix</PanelLabel>
        <span
          className="font-[var(--font-mono)] truncate"
          style={{ fontSize: 8.5, color: "rgba(231,228,220,0.32)" }}
        >
          how loud each clip sits
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: 2 }}>
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="flex items-center"
            style={{
              gap: 7,
              padding: "4px 6px",
              borderRadius: 6,
              background: clip.muted ? "transparent" : "rgba(255,255,255,0.02)",
              opacity: clip.muted ? 0.5 : 1,
            }}
            title={`${clip.name} · ${clock(clipLength(clip))}`}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                flexShrink: 0,
                background: clip.muted ? "rgba(231,228,220,0.25)" : clip.color,
              }}
            />
            <span
              className="font-[var(--font-mono)] truncate shrink-0"
              style={{
                width: 58,
                fontSize: 9,
                letterSpacing: "0.04em",
                color: "rgba(231,228,220,0.7)",
              }}
            >
              {clip.name}
            </span>
            <MiniFader
              value={clip.level}
              color={clip.color}
              disabled={clip.muted}
              onChange={(v) => setClipLevel(clip.id, v)}
            />
            <span
              className="font-[var(--font-mono)] shrink-0"
              style={{
                width: 20,
                textAlign: "right",
                fontSize: 9,
                fontVariantNumeric: "tabular-nums",
                color: "rgba(231,228,220,0.55)",
              }}
            >
              {Math.round(clip.level * 100)}
            </span>
            <button
              onClick={() => toggleMute(clip.id)}
              aria-pressed={clip.muted}
              title={clip.muted ? "Unmute this clip" : "Mute this clip"}
              className="font-[var(--font-mono)] shrink-0"
              style={{
                width: 17,
                padding: "1px 0",
                borderRadius: 4,
                border: `1px solid ${clip.muted ? "#f5a33e77" : "rgba(231,228,220,0.12)"}`,
                background: clip.muted ? "#f5a33e18" : "transparent",
                fontSize: 7.5,
                color: clip.muted ? "#f5a33e" : "rgba(231,228,220,0.4)",
                cursor: "pointer",
              }}
            >
              M
            </button>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "rgba(231,228,220,0.08)" }} />

      <div className="flex items-center" style={{ gap: 7, padding: "0 6px" }}>
        <span
          className="font-[var(--font-mono)] shrink-0"
          style={{
            width: 71,
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "rgba(231,228,220,0.85)",
          }}
        >
          ALL
        </span>
        <MiniFader value={master} color={accent} disabled={false} onChange={setMaster} />
        <span
          className="font-[var(--font-mono)] shrink-0"
          style={{
            width: 20,
            textAlign: "right",
            fontSize: 9,
            fontVariantNumeric: "tabular-nums",
            color: accent,
          }}
        >
          {Math.round(master * 100)}
        </span>
        <span style={{ width: 17 }} />
      </div>
    </div>
  );
}
