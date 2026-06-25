import { WHITE_LAYOUT, BLACK_LAYOUT } from "../data/keyboard";
import { NOTE_KEYS } from "../hooks/useSynth";

export function KeyboardDisplay({
  activeKeys, accent, playNote, stopNote, labelMode = "key",
}: {
  activeKeys: Set<string>;
  accent: string;
  playNote: (key: string, freq: number) => void;
  stopNote: (key: string) => void;
  labelMode?: "key" | "note";
}) {
  const KW = 22, KH = 54, BW = 13, BH = 33;
  const whites = WHITE_LAYOUT;
  const blacks = BLACK_LAYOUT.filter(b => b.after < whites.length - 1);
  const total = whites.length * KW;

  const press = (e: React.PointerEvent, key: string) => { e.preventDefault(); const n = NOTE_KEYS[key]; if (n) playNote(key, n.freq); };

  return (
    <div style={{ borderRadius: 5, overflow: "hidden", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", padding: "8px 6px 12px", touchAction: "none" }}>
      <svg width="100%" viewBox={`0 0 ${total} ${KH + 16}`} style={{ display: "block", touchAction: "none" }}>
        {whites.map(({ key, note }, i) => {
          const on = activeKeys.has(key);
          return (
            <g key={key} style={{ cursor: "pointer" }}
              onPointerDown={(e) => press(e, key)}
              onPointerUp={() => stopNote(key)}
              onPointerCancel={() => stopNote(key)}
              onPointerLeave={() => stopNote(key)}
            >
              <rect x={i * KW + 0.5} y={0.5} width={KW - 1} height={KH} rx={2}
                fill={on ? accent : "rgba(228,228,240,0.92)"}
                stroke={on ? accent : "rgba(0,0,0,0.25)"} strokeWidth={0.5}
              />
              {labelMode === "note" ? (
                <text x={i * KW + KW / 2} y={KH - 8} textAnchor="middle"
                  fontSize={8} fontFamily="monospace" fontWeight="bold"
                  fill={on ? "#080808" : "rgba(70,70,90,0.95)"}
                >{note}</text>
              ) : (
                <>
                  <text x={i * KW + KW / 2} y={KH - 7} textAnchor="middle"
                    fontSize={7} fontFamily="monospace" fontWeight="bold"
                    fill={on ? "#080808" : "rgba(80,80,100,0.9)"}
                  >{key.toUpperCase()}</text>
                  <text x={i * KW + KW / 2} y={KH + 12} textAnchor="middle"
                    fontSize={7} fontFamily="monospace"
                    fill={on ? accent : "rgba(168,168,188,0.35)"}
                  >{note}</text>
                </>
              )}
            </g>
          );
        })}
        {blacks.map(({ key, after, note }) => {
          const on = activeKeys.has(key);
          const x = (after + 1) * KW - BW / 2;
          return (
            <g key={key} style={{ cursor: "pointer" }}
              onPointerDown={(e) => press(e, key)}
              onPointerUp={() => stopNote(key)}
              onPointerCancel={() => stopNote(key)}
              onPointerLeave={() => stopNote(key)}
            >
              <rect x={x} y={0.5} width={BW} height={BH} rx={2}
                fill={on ? accent : "#080810"}
                stroke={on ? accent : "rgba(255,255,255,0.1)"} strokeWidth={0.5}
              />
              <text x={x + BW / 2} y={BH - 5} textAnchor="middle"
                fontSize={labelMode === "note" ? 5 : 6} fontFamily="monospace"
                fill={on ? "#080808" : "rgba(255,255,255,0.5)"}
              >{labelMode === "note" ? note : key.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
