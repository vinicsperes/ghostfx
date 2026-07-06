import { useEffect, useRef, useState } from "react";
import Pedal3D from "./Pedal3D";
import { PALETTE, PRESET_META } from "./data/presets";

const GREEN = PRESET_META[0].color;
const palette = { ...PALETTE, accent: GREEN, pedal: PRESET_META[0].chassis };

export default function Studio() {
  const [explode, setExplode] = useState(0);
  const [circuitOnly, setCircuitOnly] = useState(false);
  const targetRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetRef.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    let raf = 0;
    const tick = () => {
      setExplode((e) => {
        const t = targetRef.current;
        const next = e + (t - e) * 0.14;
        return Math.abs(t - next) < 0.0015 ? t : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div style={{ background: "#ffffff" }}>
      <div style={{ height: "200vh" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div style={{ width: "min(100vw, 177.78vh)", aspectRatio: "16 / 9", position: "relative" }}>
            <Pedal3D
              studio
              hideTag
              split={!circuitOnly}
              view={[-2.8, 3.4, 5.2]}
              circuitOnly={circuitOnly}
              explode={circuitOnly ? 0 : explode}
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
        </div>
      </div>

      <button
        onClick={() => setCircuitOnly((v) => !v)}
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "9px 18px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.12)",
          background: circuitOnly ? "#111" : "rgba(255,255,255,0.9)",
          color: circuitOnly ? "#fff" : "#111",
          cursor: "pointer",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
        }}
      >
        {circuitOnly ? "◂ VOLTAR" : "CIRCUITO"}
      </button>

      {!circuitOnly && (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "rgba(0,0,0,0.4)",
            opacity: explode > 0.9 ? 0 : 1,
            transition: "opacity 300ms",
            pointerEvents: "none",
          }}
        >
          ROLE PARA ABRIR
          <span style={{ fontSize: 14 }}>↓</span>
        </div>
      )}
    </div>
  );
}
