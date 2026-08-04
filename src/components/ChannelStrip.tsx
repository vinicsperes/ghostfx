import { useCallback, useEffect, useRef } from "react";

const TRAVEL = 150;
const FINE_TRAVEL = 620;

export function ChannelStrip({
  label,
  value,
  accent,
  onChange,
  highlight = false,
  height = 86,
}: {
  label: string;
  value: number;
  accent: string;
  onChange: (v: number) => void;
  highlight?: boolean;
  height?: number;
}) {
  const dragRef = useRef<{ lastY: number; value: number } | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const ratio = e.shiftKey ? FINE_TRAVEL : TRAVEL;
      d.value = Math.max(0, Math.min(1, d.value + (d.lastY - e.clientY) / ratio));
      d.lastY = e.clientY;
      onChangeRef.current(d.value);
    };
    const up = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const start = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { lastY: e.clientY, value };
      document.body.style.cursor = "grabbing";
    },
    [value],
  );

  const pct = Math.round(value * 100);
  const capBottom = value * (height - 16);

  return (
    <div className="flex flex-col items-center" style={{ gap: 6, width: 34 }}>
      <span
        className="font-[var(--font-mono)]"
        style={{
          fontSize: 9.5,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: highlight && value < 0.02 ? "#f5a33e" : accent,
        }}
      >
        {pct}
      </span>

      <div
        onPointerDown={start}
        onDoubleClick={() => onChangeRef.current(highlight ? 0.5 : 0.5)}
        role="slider"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.01 : 0.05;
          if (e.key === "ArrowUp") onChangeRef.current(Math.min(1, value + step));
          if (e.key === "ArrowDown") onChangeRef.current(Math.max(0, value - step));
        }}
        style={{
          position: "relative",
          width: 26,
          height,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 3,
            marginLeft: -1.5,
            borderRadius: 2,
            background: "rgba(231,228,220,0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: 3,
            marginLeft: -1.5,
            height: capBottom + 8,
            borderRadius: 2,
            background: accent,
            boxShadow: `0 0 8px ${accent}66`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: capBottom,
            height: 16,
            borderRadius: 3,
            background: "linear-gradient(180deg,#2b2f33,#15181a)",
            border: "1px solid rgba(231,228,220,0.16)",
            boxShadow: `0 2px 5px rgba(0,0,0,0.6), 0 0 10px ${accent}22`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 3,
              right: 3,
              top: "50%",
              height: 1,
              marginTop: -0.5,
              background: accent,
              opacity: 0.8,
            }}
          />
        </div>
      </div>

      <span
        className="font-[var(--font-mono)]"
        style={{
          fontSize: 7.5,
          letterSpacing: "0.1em",
          color: "rgba(231,228,220,0.42)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
