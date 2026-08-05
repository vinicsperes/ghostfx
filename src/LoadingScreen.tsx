import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import GhostMark from "./GhostMark";

const ACCENT = "#20f040";
const LED = "#41ff77";
const MIN_BOOT_MS = 1100;

const STAGES = ["Waking the chain", "Voicing the rig", "Warming the tubes"];

export default function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const { progress } = useProgress();
  const [visible, setVisible] = useState(true);
  const [finished, setFinished] = useState(false);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), MIN_BOOT_MS);
    return () => clearTimeout(t);
  }, []);

  const armed = progress === 100 && bootDone;

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => {
      setFinished(true);
      setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 800);
    }, 650);
    return () => clearTimeout(timer);
  }, [armed, onComplete]);

  if (!visible) return null;

  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length))];

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-opacity duration-700 ${
        finished ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        padding: 20,
        background:
          "radial-gradient(ellipse 70% 60% at 50% 46%, #0b0f0d 0%, #06080a 55%, #030406 100%)",
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: "100%",
          maxWidth: 340,
          gap: 20,
          padding: "22px 24px 20px",
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(18,20,24,0.52) 0%, rgba(8,10,13,0.62) 100%)",
          backdropFilter: "blur(22px) saturate(150%)",
          WebkitBackdropFilter: "blur(22px) saturate(150%)",
          border: `1px solid ${armed ? ACCENT + "45" : "rgba(231,228,220,0.12)"}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
          transition: "border-color 500ms ease",
        }}
      >
        <div className="flex items-center" style={{ gap: 11 }}>
          <GhostMark
            variant="solid"
            size={30}
            color="#e7e4dc"
            ledColor={armed ? LED : "#20242a"}
            glow={armed}
            className={armed ? "" : "animate-loading-pulse"}
          />
          <div className="flex flex-col" style={{ gap: 5 }}>
            <span
              style={{
                fontFamily: "'Saira', sans-serif",
                fontWeight: 800,
                fontSize: 22,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                color: "#e7e4dc",
              }}
            >
              GHOST<span style={{ color: ACCENT }}>FX</span>
            </span>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(231,228,220,0.34)" }}
            >
              Signal Processor MK.I
            </span>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 9 }}>
          <div
            style={{
              position: "relative",
              height: 2,
              borderRadius: 2,
              background: "rgba(231,228,220,0.09)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${armed ? 100 : progress}%`,
                background: ACCENT,
                boxShadow: `0 0 10px ${ACCENT}88`,
                transition: "width 320ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: armed ? ACCENT : "rgba(231,228,220,0.45)",
                transition: "color 400ms ease",
              }}
            >
              {armed ? "Ready" : stage}
            </span>
            <span
              className="font-[var(--font-mono)]"
              style={{
                fontSize: 9,
                fontVariantNumeric: "tabular-nums",
                color: "rgba(231,228,220,0.34)",
              }}
            >
              {Math.round(armed ? 100 : progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
