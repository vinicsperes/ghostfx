import { useEffect, useRef, useState } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import type { useTrack } from "../hooks/useTrack";
import type { useLoop } from "../hooks/useLoop";
import type { useMetronome } from "../hooks/useMetronome";
import { PALETTE, rigMeta } from "../data/presets";
import { LIMITER_THRESHOLD } from "../audio/dsp";
import { clock } from "../lib/format";
import { Fader } from "./Fader";
import { Popover } from "./Popover";
import { SourceMenu } from "./SourceMenu";
import { TakeSignal } from "./TakeSignal";
import { TakeScope } from "./TakeScope";
import { LoopLane } from "./LoopLane";
import { TrackScope } from "./TrackScope";
import { TempoChip } from "./TempoChip";

const REC = "#f53e3e";

export type Source = "take" | "track";

export function InputMeter({
  getLevelRef,
  accent,
  height,
}: {
  getLevelRef: { current: (() => number) | null };
  accent: string;
  height: number;
}) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    let hot = false;
    const tick = () => {
      const level = getLevelRef.current?.() ?? 0;
      smooth = Math.max(level, smooth * 0.86);
      const fill = fillRef.current;
      if (fill) {
        fill.style.height = `${Math.min(100, smooth * 100)}%`;
        const over = smooth >= LIMITER_THRESHOLD;
        if (over !== hot) {
          hot = over;
          fill.style.background = over ? REC : accent;
          fill.style.boxShadow = `0 0 6px ${over ? REC : accent}`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevelRef, accent]);

  return (
    <div
      title="Your guitar, live. This is what REC captures. Red means the recording limiter is holding it back."
      className="shrink-0"
      style={{
        position: "relative",
        width: 5,
        height,
        borderRadius: 3,
        overflow: "hidden",
        background: "rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        ref={fillRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "0%",
          background: accent,
          boxShadow: `0 0 6px ${accent}`,
        }}
      />
    </div>
  );
}

function DownloadButton({
  accent,
  busy,
  disabled,
  label,
  title,
  onClick,
}: {
  accent: string;
  busy: boolean;
  disabled: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={busy ? "Mixing down..." : title}
      aria-label={label}
      className="flex items-center justify-center transition-all active:scale-90 shrink-0"
      style={{
        width: 34,
        height: 30,
        borderRadius: 6,
        border: `1px solid ${accent}30`,
        background: "rgba(10,10,16,0.9)",
        color: disabled ? "rgba(255,255,255,0.25)" : accent,
        cursor: disabled ? "not-allowed" : busy ? "wait" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {busy ? (
        <span className="animate-pulse" style={{ fontSize: 9, letterSpacing: "0.06em" }}>
          MIX
        </span>
      ) : (
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2v9M9 11l-3.4-3.4M9 11l3.4-3.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 14.8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export function Deck({
  recorder,
  track,
  loop,
  metronome,
  countInEnabled,
  onToggleCountIn,
  source,
  onSourceChange,
  onRecord,
  onOpenStudio,
  getLevelRef,
  accent,
  countingIn = false,
  height = 56,
}: {
  recorder: ReturnType<typeof useRecorder>;
  track: ReturnType<typeof useTrack>;
  loop: ReturnType<typeof useLoop>;
  metronome: ReturnType<typeof useMetronome>;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
  source: Source;
  onSourceChange: (next: Source) => void;
  onRecord: () => void;
  onOpenStudio: () => void;
  getLevelRef: { current: (() => number) | null };
  accent: string;
  countingIn?: boolean;
  height?: number;
}) {
  const {
    activeTake,
    activeRig,
    activeEdited,
    isRecording,
    isProcessing,
    isExporting,
    bounceTake,
    nameOf,
    downloadTake,
    selectTake,
  } = recorder;
  const { track: loaded, loop: trackLoop, region, level, load, setLoop, setLevel } = track;
  const [menu, setMenu] = useState(false);
  const [signal, setSignal] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [over, setOver] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const signalAnchor = useRef<HTMLButtonElement>(null);

  const onTrack = !isRecording && source === "track" && !!loaded;
  const canEditSignal = !!activeTake?.dryBlob;
  const pinned = !!activeTake && loop.slot?.id === activeTake.id;

  const toggleLoop = async () => {
    if (!activeTake || pinning) return;
    if (pinned) {
      loop.unpin();
      return;
    }
    setPinning(true);
    try {
      const buffer = await bounceTake(activeTake.id);
      if (buffer)
        await loop.pin({
          id: activeTake.id,
          name: nameOf(activeTake, activeRig),
          color: rigMeta(activeRig).color,
          buffer,
        });
    } finally {
      setPinning(false);
    }
  };

  return (
    <div
      className="flex flex-col w-full"
      style={{
        gap: 9,
        outline: over ? `1px dashed ${accent}66` : "none",
        outlineOffset: 8,
        borderRadius: 8,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) void load(file);
      }}
    >
      <div className="flex items-center gap-1.5 w-full lg:gap-3">
        <button
          onClick={onRecord}
          disabled={isProcessing || countingIn}
          title={isRecording ? "Stop (Space)" : "Record your guitar (Space)"}
          aria-label={isRecording ? "Stop recording" : "Record your guitar"}
          className="flex items-center justify-center transition-all active:scale-90 shrink-0"
          style={{
            width: 44,
            height,
            borderRadius: 6,
            background: "rgba(10,10,16,0.9)",
            border: `1px solid ${isRecording ? REC : accent + "30"}`,
            opacity: isProcessing || countingIn ? 0.5 : 1,
            cursor: isProcessing ? "wait" : "pointer",
          }}
        >
          <span
            className={isRecording || countingIn ? "animate-pulse" : ""}
            style={{
              width: 14,
              height: 14,
              borderRadius: isRecording ? 3 : "50%",
              background: REC,
              boxShadow: `0 0 7px ${REC}`,
            }}
          />
        </button>

        <TempoChip
          metronome={metronome}
          countInEnabled={countInEnabled}
          onToggleCountIn={onToggleCountIn}
          accent={accent}
          height={height}
        />

        <InputMeter getLevelRef={getLevelRef} accent={accent} height={height} />

        {onTrack ? (
          <TrackScope track={track} accent={accent} height={height} />
        ) : (
          <TakeScope
            recorder={recorder}
            accent={accent}
            height={height}
            getLevelRef={getLevelRef}
            countingIn={countingIn}
          />
        )}
      </div>

      <LoopLane loop={loop} />

      <div className="flex items-center" style={{ gap: 10 }}>
        <button
          ref={anchor}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            setSignal(false);
            setMenu((v) => !v);
          }}
          aria-expanded={menu}
          title="Takes, rig and backing track"
          className="font-[var(--font-mono)] flex items-center"
          style={{
            gap: 7,
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${menu ? accent + "55" : "rgba(231,228,220,0.1)"}`,
            background: menu ? `${accent}12` : "rgba(255,255,255,0.02)",
            fontSize: 10.5,
            color: "rgba(231,228,220,0.8)",
            cursor: "pointer",
            maxWidth: 230,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              flexShrink: 0,
              borderRadius: onTrack ? "50%" : 2,
              background: onTrack
                ? PALETTE.cream
                : activeTake
                  ? rigMeta(activeRig).color
                  : "rgba(231,228,220,0.25)",
            }}
          />
          <span className="truncate">
            {onTrack && loaded
              ? loaded.name
              : activeTake
                ? rigMeta(activeRig).name
                : "NO TAKES YET"}
          </span>
          {!onTrack && activeEdited && <span style={{ opacity: 0.5 }}>↺</span>}
          <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
        </button>

        <Popover anchorRef={anchor} open={menu} onClose={() => setMenu(false)} width={330}>
          <SourceMenu
            recorder={recorder}
            track={track}
            source={source}
            accent={accent}
            onPickTake={(id) => {
              selectTake(id);
              onSourceChange("take");
              setMenu(false);
            }}
            onPickTrack={() => {
              onSourceChange("track");
              setMenu(false);
            }}
          />
        </Popover>

        {!onTrack && activeTake && (
          <>
            <button
              ref={signalAnchor}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setMenu(false);
                setSignal((v) => !v);
              }}
              disabled={!canEditSignal}
              aria-expanded={signal}
              title={
                canEditSignal
                  ? "Move this take through the rig"
                  : "This take has no dry signal to work on"
              }
              className="font-[var(--font-mono)] flex items-center shrink-0"
              style={{
                gap: 7,
                padding: "6px 10px",
                borderRadius: 6,
                border: `1px solid ${signal ? accent + "55" : "rgba(231,228,220,0.1)"}`,
                background: signal ? `${accent}12` : "rgba(255,255,255,0.02)",
                fontSize: 10.5,
                color: signal ? accent : "rgba(231,228,220,0.62)",
                cursor: canEditSignal ? "pointer" : "not-allowed",
                opacity: canEditSignal ? 1 : 0.45,
              }}
            >
              SIGNAL
              {activeEdited && <span style={{ opacity: 0.55 }}>↺</span>}
            </button>

            <Popover
              anchorRef={signalAnchor}
              open={signal}
              onClose={() => setSignal(false)}
              width={300}
            >
              <TakeSignal recorder={recorder} />
            </Popover>
          </>
        )}

        {!onTrack && activeTake && (
          <button
            onClick={() => void toggleLoop()}
            aria-pressed={pinned}
            disabled={pinning}
            title={
              pinned
                ? "Take this one out of the loop"
                : "Keep this take looping while you record over it"
            }
            className="font-[var(--font-mono)] flex items-center shrink-0"
            style={{
              gap: 7,
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${pinned ? "rgba(231,228,220,0.26)" : "rgba(231,228,220,0.1)"}`,
              background: pinned ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
              fontSize: 10.5,
              color: pinned ? PALETTE.cream : "rgba(231,228,220,0.62)",
              cursor: pinning ? "wait" : "pointer",
            }}
          >
            ↻ {pinned ? "LOOPING" : "LOOP"}
          </button>
        )}

        {onTrack && (
          <button
            onClick={() => setLoop(!trackLoop)}
            aria-pressed={trackLoop}
            title={trackLoop ? "Play the whole track once" : "Repeat the selected section"}
            className="font-[var(--font-mono)] flex items-center shrink-0"
            style={{
              gap: 7,
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${trackLoop ? accent + "55" : "rgba(231,228,220,0.1)"}`,
              background: trackLoop ? `${accent}12` : "rgba(255,255,255,0.02)",
              fontSize: 10.5,
              color: trackLoop ? accent : "rgba(231,228,220,0.62)",
              cursor: "pointer",
            }}
          >
            ↻ REPEAT
            {trackLoop && (
              <span style={{ opacity: 0.55 }}>
                {clock(region.start)} - {clock(region.end)}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onOpenStudio}
          title="Open the studio: trim, arrange and mix"
          aria-label="Open the studio"
          className="font-[var(--font-mono)] flex items-center shrink-0 transition-all active:scale-95"
          style={{
            gap: 7,
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${accent}77`,
            background: `linear-gradient(180deg, ${accent}22, ${accent}0d)`,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: accent,
            boxShadow: `0 0 14px ${accent}22`,
            cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect
              x="1.6"
              y="2.4"
              width="12.8"
              height="11.2"
              rx="1.6"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path d="M1.6 6.1h12.8" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M4.4 8.6v2.6M7 8.1v3.6M9.6 9.2v1.4M12.2 8.4v2.8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          STUDIO
        </button>

        <div style={{ flex: 1 }} />

        {onTrack ? (
          <div style={{ width: 150 }}>
            <Fader label="LEVEL" value={level} accent={accent} onChange={setLevel} />
          </div>
        ) : (
          <DownloadButton
            accent={accent}
            busy={isExporting}
            disabled={!activeTake}
            label="Download MP3"
            title={
              !activeTake
                ? "Record something first"
                : activeTake.backing
                  ? "Download MP3, backing mixed in"
                  : "Download MP3"
            }
            onClick={() => void downloadTake()}
          />
        )}
      </div>
    </div>
  );
}
