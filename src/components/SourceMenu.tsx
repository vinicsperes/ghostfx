import { useRef, useState } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import type { useTrack } from "../hooks/useTrack";
import { MAX_TRACK_S } from "../hooks/useTrack";
import { CLEAN_RIG, PALETTE, RIGS, rigMeta } from "../data/presets";
import { clock, stamp } from "../lib/format";
import { MiniWave } from "./MiniWave";
import { PanelLabel } from "./PanelLabel";

function RowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center flex-1 min-w-0"
      style={{ gap: 8, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

function Row({
  active,
  accent,
  onRemove,
  removeLabel,
  children,
}: {
  active: boolean;
  accent: string;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 8,
        padding: "5px 4px 5px 7px",
        borderRadius: 6,
        border: `1px solid ${active ? accent + "3d" : "transparent"}`,
        background: active ? `${accent}0d` : "transparent",
      }}
    >
      {children}
      <button
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="shrink-0"
        style={{
          fontSize: 13,
          lineHeight: 1,
          padding: "0 4px",
          color: "rgba(231,228,220,0.3)",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}

function Name({
  value,
  editable,
  color,
  width,
  onCommit,
}: {
  value: string;
  editable: boolean;
  color: string;
  width?: number;
  onCommit: (next: string) => void;
}) {
  if (!editable) {
    return (
      <span
        className="font-[var(--font-mono)] truncate"
        style={{
          width,
          flex: width ? undefined : 1,
          minWidth: 0,
          textAlign: "left",
          fontSize: 9.5,
          letterSpacing: "0.06em",
          color,
        }}
      >
        {value}
      </span>
    );
  }
  return (
    <input
      defaultValue={value}
      key={value}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          (e.target as HTMLInputElement).value = value;
          (e.target as HTMLInputElement).blur();
        }
        e.stopPropagation();
      }}
      title="Rename"
      className="font-[var(--font-mono)] min-w-0"
      style={{
        width: width ?? 96,
        flex: width ? undefined : 1,
        padding: "2px 4px",
        borderRadius: 4,
        border: "1px solid transparent",
        background: "transparent",
        fontSize: 9.5,
        letterSpacing: "0.06em",
        color,
        outline: "none",
      }}
      onFocus={(e) => {
        e.target.style.border = `1px solid ${color}55`;
        e.target.style.background = "rgba(255,255,255,0.03)";
      }}
      onBlurCapture={(e) => {
        e.target.style.border = "1px solid transparent";
        e.target.style.background = "transparent";
      }}
    />
  );
}

function Meta({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <span
      className="font-[var(--font-mono)] shrink-0"
      style={{
        width,
        fontSize: 9,
        fontVariantNumeric: "tabular-nums",
        color: "rgba(231,228,220,0.4)",
        textAlign: "right",
      }}
    >
      {children}
    </span>
  );
}

const RIG_CHOICES = [CLEAN_RIG, ...RIGS.map((_, i) => i)];

export function SourceMenu({
  recorder,
  track,
  source,
  accent,
  onPickTake,
  onPickTrack,
  editable = false,
}: {
  recorder: ReturnType<typeof useRecorder>;
  track: ReturnType<typeof useTrack>;
  source: "take" | "track";
  accent: string;
  onPickTake: (id: string) => void;
  onPickTrack: () => void;
  editable?: boolean;
}) {
  const {
    takes,
    activeTake,
    activeRig,
    isRecording,
    playingId,
    deleteTake,
    setRig,
    rigOf,
    nameOf,
    renameTake,
    togglePlay,
  } = recorder;
  const { track: loaded, loading, error, load, rename: renameTrack, clear } = track;

  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const canReamp = !!activeTake?.dryBlob && !isRecording;

  const pick = (file: File | undefined) => {
    if (file) void load(file);
  };

  return (
    <div
      className="flex flex-col"
      style={{ gap: 12, padding: 4 }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files[0]);
      }}
    >
      {takes.length > 0 && (
        <div className="flex flex-col" style={{ gap: 6 }}>
          <PanelLabel>Hear it through</PanelLabel>
          <div className="flex flex-wrap" style={{ gap: 4 }}>
            {RIG_CHOICES.map((i) => {
              const { color, name } = rigMeta(i);
              const on = activeRig === i;
              const recorded = (activeTake?.presetIdx ?? 0) === i;
              return (
                <button
                  key={name}
                  onClick={() => void setRig(i)}
                  disabled={!canReamp && !on}
                  title={
                    recorded
                      ? "Recorded like this"
                      : i === CLEAN_RIG
                        ? "Hear the guitar dry, the way the pedal never touched it"
                        : `Re-amp through ${name}`
                  }
                  className="font-[var(--font-mono)] flex items-center"
                  style={{
                    gap: 5,
                    padding: "5px 7px",
                    borderRadius: 6,
                    border: `1px solid ${on ? color + "66" : "rgba(231,228,220,0.1)"}`,
                    background: on ? `${color}16` : "rgba(255,255,255,0.02)",
                    fontSize: 9.5,
                    color: on ? color : "rgba(231,228,220,0.6)",
                    opacity: canReamp || on ? 1 : 0.45,
                    cursor: canReamp || on ? "pointer" : "default",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: 2, background: color }} />
                  {name}
                  {recorded && <span style={{ fontSize: 7, opacity: 0.5 }}>REC</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 6 }}>
        <PanelLabel>Takes</PanelLabel>
        {takes.length === 0 ? (
          <span
            className="font-[var(--font-mono)]"
            style={{ fontSize: 9.5, color: "rgba(231,228,220,0.36)" }}
          >
            nothing recorded yet
          </span>
        ) : (
          <div
            className="flex flex-col"
            style={{
              gap: 2,
              maxHeight: editable ? undefined : 156,
              overflowY: editable ? undefined : "auto",
            }}
          >
            {takes.map((take) => {
              const on = source === "take" && take.id === activeTake?.id;
              const rig = rigOf(take.id, take.presetIdx ?? 0);
              const color = rigMeta(rig).color;
              const playing = playingId === take.id;
              return (
                <Row
                  key={take.id}
                  active={on}
                  accent={accent}
                  onRemove={() => deleteTake(take.id)}
                  removeLabel="Delete take"
                >
                  <button
                    onClick={() => void togglePlay(take.id)}
                    title={playing ? "Pause" : "Play this take"}
                    aria-label={playing ? "Pause" : "Play this take"}
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1px solid ${playing ? color + "77" : "rgba(231,228,220,0.12)"}`,
                      background: playing ? `${color}1a` : "transparent",
                      color: playing ? color : "rgba(231,228,220,0.5)",
                      cursor: "pointer",
                    }}
                  >
                    {playing ? (
                      <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="3" y="2.5" width="3.6" height="11" rx="1" />
                        <rect x="9.4" y="2.5" width="3.6" height="11" rx="1" />
                      </svg>
                    ) : (
                      <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
                      </svg>
                    )}
                  </button>
                  <Name
                    value={nameOf(take, rig)}
                    editable={editable}
                    color={on ? color : "rgba(231,228,220,0.55)"}
                    width={editable ? undefined : 58}
                    onCommit={(next) => renameTake(take.id, next)}
                  />
                  <RowButton onClick={() => onPickTake(take.id)}>
                    <span className="flex-1 min-w-0">
                      <MiniWave peaks={take.peaks} color={color} width={104} height={18} stretch />
                    </span>
                    {take.backing && (
                      <span
                        title="Recorded over a backing"
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: PALETTE.cream,
                        }}
                      />
                    )}
                    {editable && <Meta width={32}>{stamp(take.createdAt)}</Meta>}
                    <Meta width={28}>{clock(take.duration)}</Meta>
                  </RowButton>
                </Row>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col" style={{ gap: 6 }}>
        <PanelLabel>Track</PanelLabel>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {loaded ? (
          <Row
            active={source === "track"}
            accent={accent}
            onRemove={clear}
            removeLabel="Remove track"
          >
            <RowButton onClick={onPickTrack}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: PALETTE.cream,
                  boxShadow: source === "track" ? `0 0 6px ${PALETTE.cream}` : "none",
                }}
              />
              {editable ? (
                <Name
                  value={loaded.name}
                  editable
                  color={source === "track" ? "#e7e4dc" : "rgba(231,228,220,0.62)"}
                  onCommit={renameTrack}
                />
              ) : (
                <span
                  className="font-[var(--font-mono)] flex-1 min-w-0 truncate"
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    color: source === "track" ? "#e7e4dc" : "rgba(231,228,220,0.62)",
                  }}
                >
                  {loaded.name}
                </span>
              )}
              <Meta width={26}>{clock(loaded.duration)}</Meta>
            </RowButton>
          </Row>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="font-[var(--font-mono)] flex items-center justify-center"
            style={{
              gap: 8,
              padding: "8px 10px",
              borderRadius: 7,
              border: `1px dashed ${over ? accent + "77" : "rgba(231,228,220,0.16)"}`,
              background: over ? `${accent}0d` : "transparent",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              color: accent,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "READING..." : "LOAD A TRACK"}
          </button>
        )}
        <span
          className="font-[var(--font-mono)]"
          style={{ fontSize: 9, color: error ? "#ff8080" : "rgba(231,228,220,0.32)" }}
        >
          {error ??
            `drop an audio file here, up to ${MAX_TRACK_S / 60} min, it stays on your machine`}
        </span>
      </div>
    </div>
  );
}
