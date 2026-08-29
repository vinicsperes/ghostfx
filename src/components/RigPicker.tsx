import { useRef, useState } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import { CLEAN_RIG, RIGS, rigMeta } from "../data/presets";
import { Popover } from "./Popover";

const RIG_CHOICES = [CLEAN_RIG, ...RIGS.map((_, i) => i)];

export function RigOptions({
  value,
  recorded,
  canReamp,
  onSelect,
}: {
  value: number;
  recorded: number;
  canReamp: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 2, padding: 4 }}>
      {RIG_CHOICES.map((i) => {
        const { color, name } = rigMeta(i);
        const on = i === value;
        const locked = !canReamp && !on;
        return (
          <button
            key={name}
            onClick={() => onSelect(i)}
            disabled={locked}
            title={
              i === CLEAN_RIG
                ? "Hear the guitar dry, the way the pedal never touched it"
                : `Hear this take through ${name}`
            }
            className="font-[var(--font-mono)] flex items-center"
            style={{
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${on ? color + "4d" : "transparent"}`,
              background: on ? `${color}12` : "transparent",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: on ? color : "rgba(231,228,220,0.62)",
              opacity: locked ? 0.35 : 1,
              cursor: locked ? "default" : "pointer",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                background: color,
                boxShadow: on ? `0 0 6px ${color}` : "none",
              }}
            />
            {name}
            <div style={{ flex: 1 }} />
            {i === recorded && (
              <span style={{ fontSize: 7.5, opacity: 0.5, letterSpacing: "0.1em" }}>REC</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TakeRigChip({
  recorder,
  height = 26,
}: {
  recorder: ReturnType<typeof useRecorder>;
  height?: number;
}) {
  const { activeTake, activeRig, isRecording, setRig } = recorder;
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);

  if (!activeTake) return null;

  const { color, name } = rigMeta(activeRig);
  const recorded = activeTake.presetIdx ?? 0;
  const canReamp = !!activeTake.dryBlob && !isRecording;

  return (
    <>
      <button
        ref={anchor}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
        disabled={!canReamp}
        aria-expanded={open}
        title={
          canReamp ? "Hear this take through another rig" : "This take has no dry signal to re-amp"
        }
        className="font-[var(--font-mono)] flex items-center shrink-0"
        style={{
          gap: 7,
          height,
          padding: "0 8px",
          borderRadius: 6,
          border: `1px solid ${open ? color + "66" : "rgba(231,228,220,0.12)"}`,
          background: open ? `${color}14` : "rgba(255,255,255,0.02)",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          color: "rgba(231,228,220,0.78)",
          opacity: canReamp ? 1 : 0.5,
          cursor: canReamp ? "pointer" : "not-allowed",
        }}
      >
        <span style={{ fontSize: 8, letterSpacing: "0.16em", color: "rgba(231,228,220,0.4)" }}>
          THROUGH
        </span>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        {name}
        <span style={{ fontSize: 8, opacity: 0.55 }}>▾</span>
      </button>

      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={190}>
        <RigOptions
          value={activeRig}
          recorded={recorded}
          canReamp={canReamp}
          onSelect={(i) => {
            void setRig(i);
            setOpen(false);
          }}
        />
      </Popover>
    </>
  );
}
