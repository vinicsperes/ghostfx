import type { useArrangement } from "../hooks/useArrangement";
import { clipLength } from "../hooks/useArrangement";
import { clock } from "../lib/format";
import { Fader } from "./Fader";

export function TrackMixer({
  arrangement,
  accent,
}: {
  arrangement: ReturnType<typeof useArrangement>;
  accent: string;
}) {
  const { clips, master, setMaster, setClipLevel, toggleMute } = arrangement;

  if (!clips.length) {
    return (
      <span
        className="font-[var(--font-mono)]"
        style={{ fontSize: 9, color: "rgba(231,228,220,0.32)", lineHeight: 1.6 }}
      >
        drop clips into the track and they show up here, one fader each
      </span>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {clips.map((clip) => (
          <div key={clip.id} className="flex flex-col" style={{ gap: 1 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  flexShrink: 0,
                  background: clip.muted ? "rgba(231,228,220,0.2)" : clip.color,
                }}
              />
              <span
                className="font-[var(--font-mono)] flex-1 min-w-0 truncate"
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.06em",
                  color: clip.muted ? "rgba(231,228,220,0.3)" : "rgba(231,228,220,0.72)",
                }}
              >
                {clip.name}
              </span>
              <span
                className="font-[var(--font-mono)] shrink-0"
                style={{
                  fontSize: 8.5,
                  fontVariantNumeric: "tabular-nums",
                  color: "rgba(231,228,220,0.32)",
                }}
              >
                {clock(clipLength(clip))}
              </span>
              <button
                onClick={() => toggleMute(clip.id)}
                aria-pressed={clip.muted}
                title={clip.muted ? "Unmute" : "Mute"}
                className="font-[var(--font-mono)] shrink-0"
                style={{
                  width: 18,
                  padding: "1px 0",
                  borderRadius: 4,
                  border: `1px solid ${clip.muted ? "#f5a33e77" : "rgba(231,228,220,0.12)"}`,
                  background: clip.muted ? "#f5a33e18" : "transparent",
                  fontSize: 8,
                  color: clip.muted ? "#f5a33e" : "rgba(231,228,220,0.45)",
                  cursor: "pointer",
                }}
              >
                M
              </button>
            </div>
            <Fader
              label=""
              value={clip.level}
              accent={clip.muted ? "rgba(231,228,220,0.25)" : clip.color}
              onChange={(v) => setClipLevel(clip.id, v)}
            />
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "rgba(231,228,220,0.08)" }} />

      <Fader label="TRACK" value={master} accent={accent} onChange={setMaster} highlight />
    </div>
  );
}
