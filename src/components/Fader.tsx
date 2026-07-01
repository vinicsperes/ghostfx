import { useCallback, useRef } from "react";

export function Fader({
  label,
  value,
  onChange,
  accent,
  highlight = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
  highlight?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastTapRef = useRef(0);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      onChange(t);
    },
    [onChange],
  );

  const pct = Math.round(value * 100);

  return (
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: "52px 1fr 30px", gap: 11, padding: "6px 0" }}
    >
      <span
        className="font-[var(--font-mono)] uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.13em",
          color: highlight ? "#e7e4dc" : "#9fc4ad",
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {label}
      </span>

      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        className="relative flex items-center"
        style={{ height: 24, cursor: "pointer", touchAction: "none" }}
        onPointerDown={(e) => {
          e.preventDefault();
          const now = performance.now();
          if (now - lastTapRef.current < 300) {
            onChange(0.5);
            lastTapRef.current = 0;
            return;
          }
          lastTapRef.current = now;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          draggingRef.current = true;
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) setFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.02;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(1, value + step));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(0, value - step));
          }
        }}
      >
        <div
          className="absolute left-0 right-0"
          style={{ height: 4, borderRadius: 2, background: "#161d18", overflow: "hidden" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, transparent 0 7px, rgba(0,0,0,.5) 7px 8px)",
            }}
          />
        </div>

        <div
          className="absolute left-0"
          style={{
            height: 4,
            width: `${pct}%`,
            borderRadius: 2,
            background: accent,
            boxShadow: `0 0 8px ${accent}80`,
          }}
        />

        <div
          className="absolute"
          style={{
            left: `${pct}%`,
            width: 14,
            height: 22,
            borderRadius: 3,
            transform: "translateX(-50%)",
            background: "linear-gradient(180deg,#2a352e,#11160f)",
            border: "1px solid rgba(231,228,220,.16)",
            boxShadow: "0 2px 5px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.12)",
          }}
        >
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: 8,
              height: 1.5,
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
        </div>
      </div>

      <span
        className="font-[var(--font-mono)]"
        style={{
          fontSize: 12,
          color: highlight ? accent : "#e7e4dc",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pct}
      </span>
    </div>
  );
}
