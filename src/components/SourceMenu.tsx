import { useRef, useState } from "react";
import type { useRecorder } from "../hooks/useRecorder";
import type { useTrack } from "../hooks/useTrack";
import { MAX_TRACK_S } from "../hooks/useTrack";
import { PALETTE, rigMeta } from "../data/presets";
import { clock, stamp } from "../lib/format";
import { MiniWave } from "./MiniWave";
import { PanelLabel } from "./PanelLabel";
import { Popover } from "./Popover";
import { RigOptions } from "./RigPicker";

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
  menu,
  children,
}: {
  active: boolean;
  accent: string;
  menu: React.ReactNode;
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
      {menu}
    </div>
  );
}

function RowMenu({
  open,
  onOpenChange,
  name,
  onRename,
  onDelete,
  deleteLabel,
  rig,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  name: string;
  onRename: (next: string) => void;
  onDelete: () => void;
  deleteLabel: string;
  rig?: {
    value: number;
    recorded: number;
    canReamp: boolean;
    onSelect: (idx: number) => void;
  };
}) {
  const anchor = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchor}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label="More"
        title={rig ? "Rename, re-amp or delete" : "Rename or remove"}
        className="font-[var(--font-mono)] shrink-0"
        style={{
          width: 18,
          padding: "1px 0",
          borderRadius: 4,
          border: `1px solid ${open ? "rgba(231,228,220,0.22)" : "transparent"}`,
          background: open ? "rgba(255,255,255,0.05)" : "transparent",
          fontSize: 12,
          lineHeight: 1,
          color: open ? "rgba(231,228,220,0.8)" : "rgba(231,228,220,0.35)",
          cursor: "pointer",
        }}
      >
        ⋮
      </button>

      <Popover
        anchorRef={anchor}
        open={open}
        onClose={() => onOpenChange(false)}
        width={196}
        align="right"
      >
        <div className="flex flex-col" style={{ gap: 9, padding: 5 }}>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <PanelLabel>Rename</PanelLabel>
            <input
              key={name}
              defaultValue={name}
              autoFocus
              maxLength={24}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename((e.target as HTMLInputElement).value);
                  onOpenChange(false);
                }
                if (e.key === "Escape") {
                  (e.target as HTMLInputElement).value = name;
                  onOpenChange(false);
                }
                e.stopPropagation();
              }}
              onBlur={(e) => onRename(e.target.value)}
              className="font-[var(--font-mono)] min-w-0"
              style={{
                padding: "5px 7px",
                borderRadius: 5,
                border: "1px solid rgba(231,228,220,0.14)",
                background: "rgba(0,0,0,0.45)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "#e7e4dc",
                outline: "none",
              }}
            />
          </div>

          {rig && (
            <div className="flex flex-col" style={{ gap: 5 }}>
              <PanelLabel>Hear it through</PanelLabel>
              <RigOptions
                value={rig.value}
                recorded={rig.recorded}
                canReamp={rig.canReamp}
                onSelect={(idx) => {
                  rig.onSelect(idx);
                  onOpenChange(false);
                }}
              />
            </div>
          )}

          <button
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
            className="font-[var(--font-mono)]"
            style={{
              padding: "6px 8px",
              borderRadius: 5,
              border: "1px solid rgba(245,62,62,0.3)",
              background: "rgba(245,62,62,0.08)",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              color: "#f57070",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {deleteLabel}
          </button>
        </div>
      </Popover>
    </>
  );
}

function Name({ value, color, width }: { value: string; color: string; width: number }) {
  return (
    <span
      className="font-[var(--font-mono)] truncate shrink-0"
      style={{
        width,
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
  const [menuFor, setMenuFor] = useState<string | null>(null);

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
                  menu={
                    <RowMenu
                      open={menuFor === take.id}
                      onOpenChange={(next) => setMenuFor(next ? take.id : null)}
                      name={nameOf(take, rig)}
                      onRename={(next) => renameTake(take.id, next)}
                      onDelete={() => deleteTake(take.id)}
                      deleteLabel="DELETE TAKE"
                      rig={{
                        value: rig,
                        recorded: take.presetIdx ?? 0,
                        canReamp: !!take.dryBlob && !isRecording,
                        onSelect: (idx) => {
                          onPickTake(take.id);
                          void setRig(idx, take.id);
                        },
                      }}
                    />
                  }
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
                  <RowButton onClick={() => onPickTake(take.id)}>
                    <Name
                      value={nameOf(take, rig)}
                      color={on ? color : "rgba(231,228,220,0.62)"}
                      width={editable ? 76 : 58}
                    />
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
            menu={
              <RowMenu
                open={menuFor === "track"}
                onOpenChange={(next) => setMenuFor(next ? "track" : null)}
                name={loaded.name}
                onRename={renameTrack}
                onDelete={clear}
                deleteLabel="REMOVE TRACK"
              />
            }
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
