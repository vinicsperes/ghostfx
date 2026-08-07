import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { useRecorder } from "../hooks/useRecorder";
import type { useTrack } from "../hooks/useTrack";
import type { useArrangement } from "../hooks/useArrangement";
import type { useMetronome } from "../hooks/useMetronome";
import type { TunerReading } from "../hooks/useTuner";
import type { Source } from "./Deck";
import { PALETTE, PRESETS, PRESET_META } from "../data/presets";
import { clock } from "../lib/format";
import { Fader } from "./Fader";
import { PanelLabel } from "./PanelLabel";
import { SourceMenu, type DragSource } from "./SourceMenu";
import { InputMeter } from "./Deck";
import { Timeline } from "./Timeline";
import { slotAt } from "../lib/timeline";
import { TempoChip } from "./TempoChip";
import { TrackMixer } from "./TrackMixer";
import { TunerDisplay } from "./TunerDisplay";
import { TakeSignal } from "./TakeSignal";
import { WaveEditor } from "./WaveEditor";

function Action({
  label,
  onClick,
  accent,
  disabled = false,
  strong = false,
  title,
}: {
  label: string;
  onClick: () => void;
  accent: string;
  disabled?: boolean;
  strong?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="font-[var(--font-mono)] shrink-0"
      style={{
        padding: "7px 12px",
        borderRadius: 7,
        border: `1px solid ${strong ? accent + "66" : "rgba(231,228,220,0.12)"}`,
        background: strong ? `${accent}14` : "rgba(255,255,255,0.02)",
        fontSize: 10,
        letterSpacing: "0.12em",
        color: disabled ? "rgba(231,228,220,0.3)" : strong ? accent : "rgba(231,228,220,0.7)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

export type StudioTool = "tune" | "mix";

const TOOLS = [
  { id: "tune" as const, label: "TUNER" },
  { id: "mix" as const, label: "TRACK MIX" },
];

function SkipStart({
  onClick,
  accent,
  disabled,
  title,
  size = 38,
}: {
  onClick: () => void;
  accent: string;
  disabled: boolean;
  title: string;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex items-center justify-center transition-all active:scale-90 shrink-0"
      style={{
        width: size,
        height: size - 8,
        borderRadius: 7,
        background: "rgba(10,10,16,0.9)",
        border: `1px solid ${accent}30`,
        color: disabled ? "rgba(255,255,255,0.25)" : accent,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2.4" y="2.6" width="2.2" height="10.8" rx="1" />
        <path d="M13.6 3.3v9.4a.7.7 0 0 1-1.08.59l-7-4.7a.7.7 0 0 1 0-1.18l7-4.7a.7.7 0 0 1 1.08.59Z" />
      </svg>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 3 }}>
      <span
        className="font-[var(--font-mono)] uppercase"
        style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(231,228,220,0.35)" }}
      >
        {label}
      </span>
      <span
        className="font-[var(--font-mono)]"
        style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "#e7e4dc" }}
      >
        {value}
      </span>
    </div>
  );
}

export function StudioView({
  recorder,
  track,
  arrangement,
  metronome,
  tuning,
  countInEnabled,
  onToggleCountIn,
  tool,
  onToolChange,
  presetIdx,
  getLevelRef,
  onRecord,
  source,
  onSourceChange,
  accent,
  onClose,
}: {
  recorder: ReturnType<typeof useRecorder>;
  track: ReturnType<typeof useTrack>;
  arrangement: ReturnType<typeof useArrangement>;
  metronome: ReturnType<typeof useMetronome>;
  tuning: TunerReading;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  tool: StudioTool;
  onToolChange: (next: StudioTool) => void;
  presetIdx: number | null;
  getLevelRef: { current: (() => number) | null };
  onRecord: () => void;
  source: Source;
  onSourceChange: (next: Source) => void;
  accent: string;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [pps, setPps] = useState(40);

  const [showSignal, setShowSignal] = useState(true);
  const [drag, setDrag] = useState<{ source: DragSource; x: number; y: number } | null>(null);
  const dragRef = useRef<{
    source: DragSource;
    ox: number;
    oy: number;
    armed: boolean;
  } | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const {
    activeTake,
    activeRig,
    activePeaks,
    activeDuration,
    activeRegion,
    playingId,
    looping,
    setLooping,
    togglePlay,
    seek,
    setTakeRegion,
    getPlayPosition,
    downloadTake,
    bounceTake,
    isExporting,
    selectTake,
    nameOf,
  } = recorder;
  const { track: loaded, region: trackRegion, setRegion: setTrackRegion } = track;
  const onTrack = source === "track" && !!loaded;

  const title =
    onTrack && loaded
      ? loaded.name
      : activeTake
        ? `${nameOf(activeTake, activeRig)} · ${PRESETS[activeRig].name}`
        : "NOTHING SELECTED";

  const color = onTrack ? PALETTE.cream : PRESET_META[activeRig].color;
  const lanes = onTrack && loaded ? [loaded.peaks] : activePeaks ? [activePeaks] : [];
  const duration = onTrack && loaded ? loaded.duration : activeDuration;
  const region = onTrack ? trackRegion : activeRegion;
  const position = onTrack ? track.getPosition : getPlayPosition;
  const playing = onTrack ? track.isPlaying : playingId === activeTake?.id;
  const busy = isExporting;
  const repeating = onTrack ? track.loop : looping;
  const span = Math.max(0, region.end - region.start);
  const trimmed = duration > 0 && span < duration - 0.02;

  const onRegion = (start: number, end: number) => {
    if (onTrack) setTrackRegion(start, end);
    else if (activeTake) setTakeRegion(activeTake.id, start, end);
  };

  const onSeek = (at: number) => {
    if (onTrack) track.seek(at);
    else void seek(at);
  };

  const toStart = () => {
    if (onTrack) track.seek(region.start);
    else void seek(region.start);
  };

  const onToggle = () => {
    if (onTrack) track.toggle();
    else void togglePlay();
  };

  const onRepeat = () => {
    if (onTrack) track.setLoop(!track.loop);
    else setLooping(!looping);
  };

  const reset = () => onRegion(0, duration);

  const bounceOf = useCallback(
    async (source: DragSource): Promise<AudioBuffer | null> => {
      if (source.kind === "track") return track.bounce();
      return bounceTake(source.id);
    },
    [track, bounceTake],
  );

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      if (!current.armed && Math.hypot(e.clientX - current.ox, e.clientY - current.oy) > 6)
        current.armed = true;
      if (current.armed) setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };
    const onUp = async (e: PointerEvent) => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current?.armed) return;
      const zone = dropRef.current;
      if (!zone) return;
      const box = zone.getBoundingClientRect();
      const inside =
        e.clientX >= box.left &&
        e.clientX <= box.right &&
        e.clientY >= box.top &&
        e.clientY <= box.bottom;
      if (!inside) return;
      const content = contentRef.current;
      const slot =
        arrangement.clips.length && content
          ? slotAt(content.getBoundingClientRect(), e.clientX, e.clientY, pps)
          : { lane: 0, at: 0 };
      setSending(true);
      try {
        const buffer = await bounceOf(current.source);
        if (!buffer) return;
        arrangement.add({
          name: current.source.name,
          color: current.source.color,
          buffer,
          lane: slot.lane,
          at: slot.at,
        });
      } finally {
        setSending(false);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, arrangement, bounceOf, pps]);

  const startDrag = (source: DragSource, e: React.PointerEvent) => {
    dragRef.current = { source, ox: e.clientX, oy: e.clientY, armed: false };
    setDrag({ source, x: e.clientX, y: e.clientY });
  };

  const sendToTrack = async () => {
    if (sending || duration <= 0) return;
    setSending(true);
    try {
      const buffer = onTrack ? await track.bounce() : await bounceTake();
      if (!buffer) return;
      arrangement.add({
        name: onTrack && loaded ? loaded.name : activeTake ? nameOf(activeTake, activeRig) : "clip",
        color,
        buffer,
      });
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 300,
        background:
          "linear-gradient(180deg, rgba(3,4,8,0.9) 0%, rgba(3,4,8,0.93) 45%, rgba(3,4,8,0.96) 100%)",
        backdropFilter: "blur(5px) saturate(0.7)",
      }}
    >
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: "14px max(18px,2vw)",
          borderBottom: "1px solid rgba(231,228,220,0.08)",
          gap: 16,
        }}
      >
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <span
            className="font-[var(--font-mono)]"
            style={{ fontSize: 12, letterSpacing: "0.24em", color: accent }}
          >
            STUDIO
          </span>
          <span
            className="font-[var(--font-mono)] hidden sm:block"
            style={{ fontSize: 9.5, color: "rgba(231,228,220,0.4)" }}
          >
            pick something on the left, drag the edges to trim it, download what you keep
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div
            className="flex items-center"
            style={{
              gap: 9,
              padding: "5px 11px 5px 9px",
              borderRadius: 999,
              border: "1px solid rgba(231,228,220,0.08)",
              background: "rgba(9,11,14,0.7)",
            }}
            title="The pedal is still live behind the studio"
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: PRESET_META[presetIdx ?? 0].color,
                boxShadow: `0 0 6px ${PRESET_META[presetIdx ?? 0].color}`,
              }}
            />
            <span
              className="font-[var(--font-mono)]"
              style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "rgba(231,228,220,0.7)" }}
            >
              {PRESETS[presetIdx ?? 0].name}
            </span>
            <InputMeter getLevelRef={getLevelRef} accent={accent} height={16} />
          </div>

          <TempoChip
            metronome={metronome}
            countInEnabled={countInEnabled}
            onToggleCountIn={onToggleCountIn}
            accent={accent}
            height={32}
          />

          <button
            onClick={onRecord}
            title={recorder.isRecording ? "Stop (Space)" : "Record your guitar (Space)"}
            aria-label={recorder.isRecording ? "Stop recording" : "Record your guitar"}
            className="flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{
              width: 40,
              height: 32,
              borderRadius: 7,
              background: "rgba(10,10,16,0.9)",
              border: `1px solid ${recorder.isRecording ? "#f53e3e" : accent + "30"}`,
              cursor: "pointer",
            }}
          >
            <span
              className={recorder.isRecording ? "animate-pulse" : ""}
              style={{
                width: 12,
                height: 12,
                borderRadius: recorder.isRecording ? 3 : "50%",
                background: "#f53e3e",
                boxShadow: "0 0 7px #f53e3e",
              }}
            />
          </button>

          <Action label="CLOSE (ESC)" onClick={onClose} accent={accent} />
        </div>
      </div>

      <div
        className="flex-1 flex flex-col lg:flex-row min-h-0"
        style={{ padding: "14px max(18px,2vw) 18px", gap: 16 }}
      >
        <div
          className="shrink-0 overflow-y-auto"
          style={{
            width: "100%",
            maxWidth: 340,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(231,228,220,0.08)",
            background: "rgba(9,11,14,0.92)",
          }}
        >
          <SourceMenu
            recorder={recorder}
            track={track}
            source={source}
            accent={accent}
            onPickTake={(id) => {
              selectTake(id);
              onSourceChange("take");
            }}
            onPickTrack={() => onSourceChange("track")}
            onDragSource={startDrag}
            editable
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto" style={{ gap: 12 }}>
          <div className="flex items-center justify-between" style={{ gap: 12 }}>
            <div className="flex items-center min-w-0" style={{ gap: 9 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: onTrack ? "50%" : 2,
                  background: color,
                }}
              />
              <span
                className="font-[var(--font-mono)] truncate"
                style={{ fontSize: 12, letterSpacing: "0.1em", color: "#e7e4dc" }}
              >
                {title}
              </span>
            </div>
            {duration > 0 && (
              <div className="flex items-center" style={{ gap: 22 }}>
                <Stat label="in" value={clock(region.start)} />
                <Stat label="out" value={clock(region.end)} />
                <Stat label="keeps" value={clock(span)} />
              </div>
            )}
          </div>

          <div className="shrink-0" style={{ position: "relative" }}>
            {duration <= 0 && (
              <span
                className="font-[var(--font-mono)]"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: "rgba(231,228,220,0.28)",
                  pointerEvents: "none",
                }}
              >
                RECORD A TAKE, SET A LOOP, OR DROP AN AUDIO FILE
              </span>
            )}
            <WaveEditor
              lanes={lanes}
              duration={duration}
              region={region}
              color={color}
              accent={accent}
              height={Math.max(140, Math.min(260, 84 + lanes.length * 30))}
              getPosition={position}
              onSeek={onSeek}
              onRegion={duration > 0 ? onRegion : undefined}
            />
          </div>

          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <SkipStart
              onClick={toStart}
              accent={accent}
              disabled={duration <= 0}
              title="Back to the start of what you kept"
              size={46}
            />

            <button
              onClick={onToggle}
              disabled={duration <= 0}
              title={playing ? "Pause" : "Play"}
              aria-label={playing ? "Pause" : "Play"}
              className="flex items-center justify-center transition-all active:scale-90 shrink-0"
              style={{
                width: 46,
                height: 38,
                borderRadius: 8,
                background: "rgba(10,10,16,0.9)",
                border: `1px solid ${accent}40`,
                color: duration > 0 ? accent : "rgba(255,255,255,0.25)",
                cursor: duration > 0 ? "pointer" : "not-allowed",
              }}
            >
              {playing ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2.5" width="3.6" height="11" rx="1" />
                  <rect x="9.4" y="2.5" width="3.6" height="11" rx="1" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
                </svg>
              )}
            </button>

            <Action
              label="FULL"
              onClick={reset}
              accent={accent}
              disabled={!trimmed}
              title="Undo the trim, back to the whole thing"
            />

            <Action
              label={repeating ? "↻ REPEAT" : "↻ ONCE"}
              onClick={onRepeat}
              accent={accent}
              strong={repeating}
              disabled={duration <= 0}
              title="Keep it repeating in the background while you play over it"
            />

            {onTrack && (
              <div style={{ width: 190 }}>
                <Fader
                  label="LEVEL"
                  value={track.level}
                  accent={accent}
                  onChange={track.setLevel}
                />
              </div>
            )}

            <div style={{ flex: 1 }} />

            {!onTrack && activeTake && (
              <Action
                label={showSignal ? "SIGNAL ▾" : "SIGNAL ▸"}
                onClick={() => setShowSignal((v) => !v)}
                accent={accent}
                title="Show or hide the signal faders for this take"
              />
            )}

            <Action
              label={sending ? "BOUNCING..." : "SEND TO TRACK"}
              onClick={() => void sendToTrack()}
              accent={accent}
              disabled={sending || duration <= 0}
              title="Bounce this, trimmed and re-amped, into the track below"
            />

            {!onTrack && (
              <Action
                label={busy ? "MIXING..." : "DOWNLOAD MP3"}
                onClick={() => void downloadTake()}
                accent={accent}
                strong
                disabled={busy || !activeTake}
                title={
                  activeTake?.backing
                    ? "Export the take with its backing, trimmed"
                    : "Export the take, trimmed"
                }
              />
            )}
          </div>

          {!onTrack && activeTake && showSignal && (
            <div
              className="shrink-0"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(231,228,220,0.08)",
                background: "rgba(9,11,14,0.92)",
              }}
            >
              <TakeSignal recorder={recorder} />
            </div>
          )}
        </div>

        <div
          className="hidden lg:flex flex-col shrink-0 overflow-y-auto"
          style={{
            width: 300,
            padding: 10,
            gap: 10,
            borderRadius: 12,
            border: "1px solid rgba(231,228,220,0.08)",
            background: "rgba(9,11,14,0.92)",
          }}
        >
          <div className="flex" style={{ gap: 4 }}>
            {TOOLS.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onToolChange(entry.id)}
                className="font-[var(--font-mono)] flex-1"
                style={{
                  padding: "5px 0",
                  borderRadius: 6,
                  border: `1px solid ${tool === entry.id ? accent + "55" : "rgba(231,228,220,0.1)"}`,
                  background: tool === entry.id ? `${accent}12` : "rgba(255,255,255,0.02)",
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  color: tool === entry.id ? accent : "rgba(231,228,220,0.6)",
                  cursor: "pointer",
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {tool === "tune" && <TunerDisplay reading={tuning} accent={accent} size="sm" />}

          {tool === "mix" && <TrackMixer arrangement={arrangement} accent={accent} />}
        </div>
      </div>

      <div
        className="shrink-0 flex flex-col"
        style={{
          padding: "10px max(18px,2vw) max(12px,env(safe-area-inset-bottom,12px))",
          borderTop: "1px solid rgba(231,228,220,0.08)",
          gap: 8,
          maxHeight: "42vh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
          <PanelLabel>Track</PanelLabel>
          <SkipStart
            onClick={() => arrangement.seek(0)}
            accent={accent}
            disabled={!arrangement.clips.length}
            title="Back to the top of the track"
            size={34}
          />
          <button
            onClick={arrangement.toggle}
            disabled={!arrangement.clips.length}
            title={arrangement.isPlaying ? "Pause the track" : "Play the track"}
            aria-label={arrangement.isPlaying ? "Pause the track" : "Play the track"}
            className="flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{
              width: 34,
              height: 28,
              borderRadius: 6,
              background: "rgba(10,10,16,0.9)",
              border: `1px solid ${accent}40`,
              color: arrangement.clips.length ? accent : "rgba(255,255,255,0.25)",
              cursor: arrangement.clips.length ? "pointer" : "not-allowed",
            }}
          >
            {arrangement.isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2.5" width="3.6" height="11" rx="1" />
                <rect x="9.4" y="2.5" width="3.6" height="11" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
              </svg>
            )}
          </button>
          <Stat label="length" value={clock(arrangement.length)} />
          <Stat label="clips" value={String(arrangement.clips.length)} />
          <div className="flex items-center" style={{ gap: 4 }}>
            <Action label="−" onClick={() => setPps((v) => Math.max(18, v - 10))} accent={accent} />
            <Action
              label="+"
              onClick={() => setPps((v) => Math.min(110, v + 10))}
              accent={accent}
            />
          </div>
          <div style={{ flex: 1 }} />
          <span
            className="font-[var(--font-mono)] hidden sm:block"
            style={{ fontSize: 9, color: "rgba(231,228,220,0.34)" }}
          >
            drag the clips around, the ruler seeks
          </span>
          <Action
            label="CLEAR"
            onClick={arrangement.clear}
            accent={accent}
            disabled={!arrangement.clips.length}
          />
          <Action
            label={arrangement.isExporting ? "MIXING..." : "DOWNLOAD TRACK"}
            onClick={() => void arrangement.download()}
            accent={accent}
            strong
            disabled={!arrangement.clips.length || arrangement.isExporting}
            title="Mix every clip down to one MP3"
          />
        </div>
        <div
          ref={dropRef}
          style={{
            borderRadius: 10,
            outline: drag ? `1px dashed ${accent}77` : "none",
            outlineOffset: 3,
          }}
        >
          {arrangement.clips.length > 0 ? (
            <Timeline arrangement={arrangement} accent={accent} pps={pps} contentRef={contentRef} />
          ) : (
            <div
              className="flex items-center justify-center font-[var(--font-mono)]"
              style={{
                height: 54,
                borderRadius: 10,
                border: "1px dashed rgba(231,228,220,0.12)",
                fontSize: 9.5,
                letterSpacing: "0.1em",
                color: "rgba(231,228,220,0.32)",
              }}
            >
              {drag ? "DROP IT HERE" : "DRAG SOMETHING HERE, OR USE SEND TO TRACK"}
            </div>
          )}
        </div>
      </div>
      {drag && (
        <div
          className="font-[var(--font-mono)]"
          style={{
            position: "fixed",
            left: drag.x + 12,
            top: drag.y + 10,
            zIndex: 400,
            padding: "4px 9px",
            borderRadius: 6,
            border: `1px solid ${drag.source.color}66`,
            background: "rgba(9,11,14,0.95)",
            fontSize: 9.5,
            letterSpacing: "0.08em",
            color: drag.source.color,
            pointerEvents: "none",
          }}
        >
          {drag.source.name}
        </div>
      )}
    </div>,
    document.body,
  );
}
