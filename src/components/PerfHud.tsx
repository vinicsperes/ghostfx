import { useEffect, useRef, useState } from "react";
import { savings, watchFrames, type FrameStats } from "../lib/perf";

const IDLE: FrameStats = { fps: 0, p50: 0, p95: 0, jank: 0 };

export function PerfHud() {
  const [live, setLive] = useState<FrameStats>(IDLE);
  const [saving, setSaving] = useState(savings.on);
  const [run, setRun] = useState({ samples: 0, fps: 0, worst: 0, jank: 0 });
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    let logged = 0;
    return watchFrames((stats) => {
      setLive(stats);
      const prev = runRef.current;
      const next = {
        samples: prev.samples + 1,
        fps: (prev.fps * prev.samples + stats.fps) / (prev.samples + 1),
        worst: Math.max(prev.worst, stats.p95),
        jank: prev.jank + stats.jank,
      };
      setRun(next);
      if (next.samples - logged >= 5) {
        logged = next.samples;
        console.info(
          `[perf] savings ${savings.on ? "on" : "off"} · ${next.fps.toFixed(1)} fps avg · p95 now ${stats.p95.toFixed(1)}ms · worst ${next.worst.toFixed(1)}ms · ${next.jank} janks in ${next.samples}s`,
        );
      }
    });
  }, []);

  const reset = () => setRun({ samples: 0, fps: 0, worst: 0, jank: 0 });

  const Line = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-baseline" style={{ gap: 6 }}>
      <span style={{ width: 42, color: "rgba(231,228,220,0.4)" }}>{label}</span>
      <span style={{ color: "rgba(231,228,220,0.9)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed font-[var(--font-mono)]"
      style={{
        left: 10,
        bottom: 10,
        zIndex: 999,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid rgba(231,228,220,0.16)",
        background: "rgba(4,5,9,0.92)",
        fontSize: 9.5,
        letterSpacing: "0.06em",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Line label="FPS" value={`${live.fps}`} />
      <Line label="P95" value={`${live.p95.toFixed(1)}ms`} />
      <Line label="AVG" value={`${run.fps.toFixed(1)} fps / ${run.samples}s`} />
      <Line label="WORST" value={`${run.worst.toFixed(1)}ms`} />
      <Line label="JANK" value={`${run.jank}`} />
      <div className="flex" style={{ gap: 4, marginTop: 3 }}>
        <button
          onClick={() => {
            savings.on = !savings.on;
            setSaving(savings.on);
            reset();
          }}
          style={{
            flex: 1,
            padding: "3px 6px",
            borderRadius: 5,
            border: `1px solid ${saving ? "#20f04066" : "rgba(231,228,220,0.16)"}`,
            background: saving ? "#20f04014" : "transparent",
            fontSize: 8.5,
            letterSpacing: "0.1em",
            color: saving ? "#20f040" : "rgba(231,228,220,0.5)",
            cursor: "pointer",
          }}
        >
          {saving ? "SAVINGS ON" : "SAVINGS OFF"}
        </button>
        <button
          onClick={reset}
          style={{
            padding: "3px 6px",
            borderRadius: 5,
            border: "1px solid rgba(231,228,220,0.16)",
            background: "transparent",
            fontSize: 8.5,
            letterSpacing: "0.1em",
            color: "rgba(231,228,220,0.5)",
            cursor: "pointer",
          }}
        >
          RESET
        </button>
      </div>
    </div>
  );
}
