import { useEffect, useState } from "react";
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
import { SourceMenu } from "./SourceMenu";
import { InputMeter } from "./Deck";
import { Timeline } from "./Timeline";
import { RigChip } from "./RigChip";
import { TempoChip } from "./TempoChip";
import { TrackMixer } from "./TrackMixer";
import { TunerChip } from "./TunerChip";
import { TakeSignal } from "./TakeSignal";
import { WaveEditor } from "./WaveEditor";

function Action({
  label,
  onClick,
  accent,
  disabled = false,
  strong = false,
  primary = false,
  icon,
  title,
}: {
  label: string;
  onClick: () => void;
  accent: string;
  disabled?: boolean;
  strong?: boolean;
  primary?: boolean;
  icon?: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="font-[var(--font-mono)] shrink-0 flex items-center transition-all active:scale-95"
      style={{
        gap: 7,
        padding: primary ? "8px 15px" : "7px 12px",
        borderRadius: 7,
        border: `1px solid ${primary ? accent : strong ? accent + "66" : "rgba(231,228,220,0.12)"}`,
        background: primary
          ? disabled
            ? `${accent}22`
            : accent
          : strong
            ? `${accent}14`
            : "rgba(255,255,255,0.02)",
        fontSize: primary ? 10.5 : 10,
        fontWeight: primary ? 700 : 400,
        letterSpacing: "0.12em",
        color: disabled
          ? primary
            ? "rgba(6,8,10,0.45)"
            : "rgba(231,228,220,0.3)"
          : primary
            ? "#06080a"
            : strong
              ? accent
              : "rgba(231,228,220,0.7)",
        boxShadow: primary && !disabled ? `0 0 18px ${accent}44` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export type StudioTool = "tune" | "mix";

function Panel({
  label,
  left,
  right,
  grow = false,
  children,
}: {
  label: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col min-h-0 min-w-0${grow ? " lg:flex-1" : ""}`}
      style={{
        borderRadius: 12,
        border: "1px solid rgba(231,228,220,0.09)",
        background: "rgba(9,11,14,0.92)",
        overflow: "hidden",
      }}
    >
      <header
        className="flex items-center shrink-0"
        style={{
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid rgba(231,228,220,0.07)",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <PanelLabel>{label}</PanelLabel>
        {left}
        <div style={{ flex: 1 }} />
        {right}
      </header>
      <div
        className="flex flex-col min-h-0"
        style={{ flex: grow ? 1 : undefined, padding: 12, gap: 10 }}
      >
        {children}
      </div>
    </section>
  );
}

function IconAction({
  onClick,
  disabled,
  busy,
  title,
  label,
  color,
}: {
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  title: string;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={busy ? "Mixing down..." : title}
      aria-label={label}
      className="flex items-center justify-center shrink-0 transition-all active:scale-90"
      style={{
        width: 38,
        height: 34,
        borderRadius: 7,
        border: `1px solid ${disabled ? "rgba(231,228,220,0.1)" : color + "55"}`,
        background: disabled ? "rgba(255,255,255,0.02)" : `${color}14`,
        color: disabled ? "rgba(231,228,220,0.25)" : color,
        cursor: disabled ? "not-allowed" : busy ? "wait" : "pointer",
      }}
    >
      {busy ? (
        <span
          className="animate-pulse font-[var(--font-mono)]"
          style={{ fontSize: 8.5, letterSpacing: "0.06em" }}
        >
          MIX
        </span>
      ) : (
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2v9M9 11l-3.4-3.4M9 11l3.4-3.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 14.8h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-1 items-center justify-center font-[var(--font-mono)]"
      style={{
        minHeight: 64,
        borderRadius: 8,
        border: "1px dashed rgba(231,228,220,0.12)",
        fontSize: 9.5,
        letterSpacing: "0.1em",
        color: "rgba(231,228,220,0.3)",
        textAlign: "center",
        padding: "0 12px",
      }}
    >
      {children}
    </div>
  );
}

function Transport({
  playing,
  disabled,
  accent,
  onToStart,
  onToggle,
  size = 34,
}: {
  playing: boolean;
  disabled: boolean;
  accent: string;
  onToStart: () => void;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <div
      className="flex items-center shrink-0"
      style={{
        borderRadius: 8,
        border: "1px solid rgba(231,228,220,0.1)",
        background: "rgba(10,10,16,0.9)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToStart}
        disabled={disabled}
        title="Back to the start"
        aria-label="Back to the start"
        className="flex items-center justify-center transition-all active:scale-90"
        style={{
          width: size + 6,
          height: size,
          color: disabled ? "rgba(255,255,255,0.22)" : "rgba(231,228,220,0.7)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2.4" y="2.6" width="2.2" height="10.8" rx="1" />
          <path d="M13.6 3.3v9.4a.7.7 0 0 1-1.08.59l-7-4.7a.7.7 0 0 1 0-1.18l7-4.7a.7.7 0 0 1 1.08.59Z" />
        </svg>
      </button>
      <div style={{ width: 1, alignSelf: "stretch", background: "rgba(231,228,220,0.08)" }} />
      <button
        onClick={onToggle}
        disabled={disabled}
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause" : "Play"}
        className="flex items-center justify-center transition-all active:scale-90"
        style={{
          width: size + 10,
          height: size,
          color: disabled ? "rgba(255,255,255,0.22)" : accent,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2.5" width="3.6" height="11" rx="1" />
            <rect x="9.4" y="2.5" width="3.6" height="11" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline shrink-0" style={{ gap: 5 }}>
      <span
        className="font-[var(--font-mono)] uppercase"
        style={{ fontSize: 8, letterSpacing: "0.16em", color: "rgba(231,228,220,0.32)" }}
      >
        {label}
      </span>
      <span
        className="font-[var(--font-mono)]"
        style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "rgba(231,228,220,0.8)" }}
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
  onPresetSelect,
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
  onPresetSelect: (idx: number) => void;
  getLevelRef: { current: (() => number) | null };
  onRecord: () => void;
  source: Source;
  onSourceChange: (next: Source) => void;
  accent: string;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [pps, setPps] = useState(40);

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

  const hasClips = arrangement.clips.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col overflow-x-hidden"
      style={{
        zIndex: 300,
        background:
          "linear-gradient(180deg, rgba(3,4,8,0.9) 0%, rgba(3,4,8,0.93) 45%, rgba(3,4,8,0.96) 100%)",
        backdropFilter: "blur(5px) saturate(0.7)",
      }}
    >
      <header
        className="flex items-center flex-wrap shrink-0"
        style={{
          padding: "10px max(14px,1.6vw)",
          borderBottom: "1px solid rgba(231,228,220,0.08)",
          gap: 10,
        }}
      >
        <span
          className="font-[var(--font-mono)] shrink-0"
          style={{ fontSize: 12, letterSpacing: "0.24em", color: accent }}
        >
          STUDIO
        </span>

        <div style={{ flex: 1 }} />

        <div
          className="flex items-center flex-wrap"
          style={{
            gap: 8,
            padding: "5px 10px 5px 8px",
            borderRadius: 8,
            border: "1px solid rgba(231,228,220,0.09)",
            background: "rgba(10,12,16,0.9)",
          }}
          title="The pedal is still live behind the studio"
        >
          <RigChip presetIdx={presetIdx} onSelect={onPresetSelect} height={26} />
          <InputMeter getLevelRef={getLevelRef} accent={accent} height={16} />
          <div style={{ width: 1, height: 18, background: "rgba(231,228,220,0.09)" }} />
          <TempoChip
            metronome={metronome}
            countInEnabled={countInEnabled}
            onToggleCountIn={onToggleCountIn}
            accent={accent}
            height={26}
          />
          <TunerChip
            reading={tuning}
            open={tool === "tune"}
            onOpenChange={(next) => onToolChange(next ? "tune" : "mix")}
            accent={accent}
            height={26}
          />
          <button
            onClick={onRecord}
            title={recorder.isRecording ? "Stop (Space)" : "Record your guitar (Space)"}
            aria-label={recorder.isRecording ? "Stop recording" : "Record your guitar"}
            className="flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{
              width: 34,
              height: 26,
              borderRadius: 6,
              background: "rgba(4,4,8,0.9)",
              border: `1px solid ${recorder.isRecording ? "#f53e3e" : "rgba(231,228,220,0.12)"}`,
              cursor: "pointer",
            }}
          >
            <span
              className={recorder.isRecording ? "animate-pulse" : ""}
              style={{
                width: 10,
                height: 10,
                borderRadius: recorder.isRecording ? 2 : "50%",
                background: "#f53e3e",
                boxShadow: "0 0 6px #f53e3e",
              }}
            />
          </button>
        </div>

        <Action label="CLOSE" onClick={onClose} accent={accent} title="Close the studio (Esc)" />
      </header>

      <div
        className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden"
        style={{
          padding: "12px max(14px,1.6vw) max(14px,env(safe-area-inset-bottom,14px))",
          gap: 12,
        }}
      >
        <div className="shrink-0 flex flex-col min-h-0" style={{ width: "100%", maxWidth: 300 }}>
          <Panel label="Library" grow>
            <div className="overflow-y-auto" style={{ margin: -4, padding: 4 }}>
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
                editable
              />
            </div>
          </Panel>
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ gap: 12 }}>
          <Panel
            label="Track"
            grow
            left={
              <Transport
                playing={arrangement.isPlaying}
                disabled={!hasClips}
                accent={accent}
                onToStart={() => arrangement.seek(0)}
                onToggle={arrangement.toggle}
                size={26}
              />
            }
            right={
              <div className="flex items-center" style={{ gap: 10 }}>
                <Readout label="length" value={clock(arrangement.length)} />
                <Readout label="clips" value={String(arrangement.clips.length)} />
                {hasClips && (
                  <>
                    <Action
                      label="−"
                      onClick={() => setPps((v) => Math.max(18, v - 10))}
                      accent={accent}
                      title="Zoom out"
                    />
                    <Action
                      label="+"
                      onClick={() => setPps((v) => Math.min(110, v + 10))}
                      accent={accent}
                      title="Zoom in"
                    />
                  </>
                )}
                <Action
                  label="CLEAR"
                  onClick={arrangement.clear}
                  accent={accent}
                  disabled={!hasClips}
                />
                <Action
                  label={arrangement.isExporting ? "MIXING..." : "DOWNLOAD"}
                  onClick={() => void arrangement.download()}
                  accent={accent}
                  strong
                  disabled={!hasClips || arrangement.isExporting}
                  title="Mix every clip down to one MP3"
                />
              </div>
            }
          >
            {hasClips ? (
              <div className="flex flex-col xl:flex-row min-w-0" style={{ gap: 12 }}>
                <div
                  className="shrink-0 overflow-y-auto w-full xl:w-[252px]"
                  style={{
                    maxWidth: 272,
                    maxHeight: 210,
                    padding: "8px 8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(231,228,220,0.08)",
                    background: "rgba(255,255,255,0.015)",
                  }}
                >
                  <TrackMixer arrangement={arrangement} accent={accent} />
                </div>
                <div className="flex-1 min-w-0">
                  <Timeline arrangement={arrangement} accent={accent} pps={pps} />
                </div>
              </div>
            ) : (
              <Empty>PICK SOMETHING BELOW AND SEND IT UP HERE</Empty>
            )}
          </Panel>

          <Panel
            label={title}
            right={
              duration > 0 ? (
                <div className="flex items-center" style={{ gap: 12 }}>
                  <Readout label="in" value={clock(region.start)} />
                  <Readout label="out" value={clock(region.end)} />
                  <Readout label="keeps" value={clock(span)} />
                </div>
              ) : undefined
            }
          >
            <div
              className="flex flex-col md:flex-row min-h-0 min-w-0"
              style={{ gap: 12, minHeight: 168 }}
            >
              <div
                className="flex-1 flex flex-col min-w-0 min-h-0"
                style={{ position: "relative" }}
              >
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
                      zIndex: 1,
                    }}
                  >
                    RECORD A TAKE OR DROP AN AUDIO FILE
                  </span>
                )}
                <WaveEditor
                  lanes={lanes}
                  duration={duration}
                  region={region}
                  color={color}
                  accent={accent}
                  fill
                  getPosition={position}
                  onSeek={onSeek}
                  onRegion={duration > 0 ? onRegion : undefined}
                />
              </div>

              {!onTrack && activeTake && (
                <div className="overflow-x-auto">
                  <TakeSignal recorder={recorder} height={82} />
                </div>
              )}
            </div>

            <div
              className="flex items-center flex-wrap shrink-0"
              style={{
                gap: 10,
                paddingTop: 10,
                borderTop: "1px solid rgba(231,228,220,0.07)",
              }}
            >
              <Transport
                playing={playing}
                disabled={duration <= 0}
                accent={accent}
                onToStart={toStart}
                onToggle={onToggle}
                size={36}
              />
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
                <div style={{ width: 150 }}>
                  <Fader
                    label="LEVEL"
                    value={track.level}
                    accent={accent}
                    onChange={track.setLevel}
                  />
                </div>
              )}

              <div style={{ flex: 1 }} />

              <Action
                label={sending ? "BOUNCING..." : "SEND TO TRACK"}
                onClick={() => void sendToTrack()}
                accent={accent}
                primary
                disabled={sending || duration <= 0}
                title="Bounce this, trimmed and re-amped, up into the track"
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 13V3.6M8 3.6 4.2 7.4M8 3.6l3.8 3.8"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
              {!onTrack && (
                <IconAction
                  onClick={() => void downloadTake()}
                  disabled={!activeTake}
                  busy={busy}
                  label="Download this take"
                  color={PALETTE.cream}
                  title={
                    activeTake?.backing
                      ? "Download this take as MP3, backing mixed in"
                      : "Download this take as MP3"
                  }
                />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>,
    document.body,
  );
}
