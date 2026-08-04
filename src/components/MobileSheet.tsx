import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const TAP_SLOP = 7;
const SNAP_RATIO = 0.35;
const FLICK_SPEED = 0.45;
const SPRING = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";

export function MobileSheet<K extends string>({
  tabs,
  active,
  onSelect,
  expanded,
  onExpandedChange,
  accent,
  leading,
  trailing,
  children,
}: {
  tabs: readonly { key: K; label: string }[];
  active: K;
  onSelect: (key: K) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  accent: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);
  const dragRef = useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    speed: number;
    moved: boolean;
    from: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const restingY = expanded ? 0 : contentH;

  const applyY = useCallback((y: number, animated: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animated ? SPRING : "none";
    el.style.transform = `translateY(${y}px)`;
  }, []);

  useEffect(() => {
    if (dragRef.current) return;
    applyY(restingY, true);
  }, [restingY, applyY]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (contentH <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: performance.now(),
      speed: 0,
      moved: false,
      from: restingY,
    };
    applyY(restingY, false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.speed = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = now;
    if (Math.abs(e.clientY - d.startY) > TAP_SLOP) d.moved = true;
    const next = Math.max(0, Math.min(contentH, d.from + (e.clientY - d.startY)));
    applyY(next, false);
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (!d.moved) {
      onExpandedChange(!expanded);
      return;
    }
    const at = Math.max(0, Math.min(contentH, d.from + (d.lastY - d.startY)));
    const flick = Math.abs(d.speed) > FLICK_SPEED;
    const next = flick ? d.speed < 0 : at < contentH * SNAP_RATIO;
    if (next === expanded) applyY(next ? 0 : contentH, true);
    onExpandedChange(next);
  };

  return (
    <div
      ref={sheetRef}
      className="pointer-events-auto"
      style={{
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderTop: "1px solid rgba(231,228,220,0.16)",
        background: "linear-gradient(180deg,#0a0e0c,#070a09)",
        boxShadow: "0 -10px 30px rgba(0,0,0,0.5), 0 2px 0 #070a09",
        marginBottom: -1,
        transform: `translateY(${restingY}px)`,
        willChange: "transform",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="button"
        tabIndex={0}
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onExpandedChange(!expanded);
          }
        }}
        className="w-full flex items-center"
        style={{ height: 42, padding: "0 12px", touchAction: "none", cursor: "grab" }}
      >
        <div
          className="flex items-center shrink-0"
          style={{ width: 64 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {leading}
        </div>
        <div className="flex-1 flex items-center justify-center">
          {expanded ? (
            <span
              style={{
                width: 46,
                height: 5,
                borderRadius: 3,
                background: "rgba(231,228,220,0.3)",
              }}
            />
          ) : (
            <svg
              className="animate-bounce"
              width="17"
              height="9"
              viewBox="0 0 17 9"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 6.6 8.5 2.2 15 6.6"
                stroke={accent}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <div
          className="flex items-center justify-end shrink-0"
          style={{ width: 64 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {trailing}
        </div>
      </div>

      <div
        className="flex px-3"
        style={{ gap: 4, borderBottom: "1px solid rgba(231,228,220,0.08)" }}
      >
        {tabs.map(({ key, label }) => {
          const on = active === key;
          return (
            <button
              key={key}
              onClick={() => {
                onSelect(key);
                onExpandedChange(true);
              }}
              aria-pressed={on}
              className="flex-1 flex items-center justify-center font-[var(--font-mono)] relative"
              style={{
                padding: "13px 0",
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                borderRadius: "7px 7px 0 0",
                background: on ? `${accent}0f` : "transparent",
                color: on ? accent : "rgba(231,228,220,0.46)",
                transition: "color 200ms, background 200ms",
              }}
            >
              {label}
              {on && (
                <span
                  style={{
                    position: "absolute",
                    left: "20%",
                    right: "20%",
                    bottom: -1,
                    height: 2,
                    background: accent,
                    boxShadow: `0 0 8px ${accent}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        ref={contentRef}
        aria-hidden={!expanded}
        style={{
          padding: "16px 16px max(18px,env(safe-area-inset-bottom,16px))",
          maxHeight: "46vh",
          overflowY: "auto",
          pointerEvents: expanded ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
