import { useState } from "react";
import Pedal3D from "./Pedal3D";
import { PALETTE, PRESET_META } from "./data/presets";

type StudioView = "whole" | "circuit" | "sandwich";

const VIEWS: { id: StudioView; label: string }[] = [
  { id: "whole", label: "INTEIRO" },
  { id: "circuit", label: "CIRCUITO" },
  { id: "sandwich", label: "SANDUÍCHE" },
];

const GREEN = PRESET_META[0].color;
const palette = { ...PALETTE, accent: GREEN, pedal: PRESET_META[0].chassis };

export default function Studio() {
  const [view, setView] = useState<StudioView>("whole");

  const circuitOnly = view === "circuit";
  const explode = view === "sandwich" ? 1 : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(100vw, 177.78vh)",
          aspectRatio: "16 / 9",
          position: "relative",
        }}
      >
        <Pedal3D
          studio
          hideTag
          view={[-2.8, 3.4, 5.2]}
          circuitOnly={circuitOnly}
          explode={explode}
          ledColor={GREEN}
          isPlaying
          onTap={() => {}}
          onStomp={() => {}}
          knobDrive={0.55}
          knobEcho={0.5}
          knobTone={0.6}
          knobReverb={0.5}
          knobMod={0.35}
          knobMaster={0.7}
          onKnobChange={() => {}}
          palette={palette}
          presetIdx={0}
        />
      </div>

      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
          padding: 5,
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {VIEWS.map((v) => {
          const on = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: "9px 16px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: on ? "#fff" : "#111",
                background: on ? "#111" : "transparent",
                transition: "all 160ms ease",
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "rgba(0,0,0,0.35)",
        }}
      >
        ARRASTE PARA GIRAR · 16:9 · FUNDO BRANCO
      </div>
    </div>
  );
}
