import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import GhostMark from "./GhostMark";
import LoadingWave from "./LoadingWave";

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
      <div className="flex flex-col items-center" style={{ gap: 18 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <GhostMark
            variant="solid"
            size={34}
            color="#e7e4dc"
            ledColor={armed ? LED : "#20242a"}
            glow={armed}
            className={armed ? "" : "animate-loading-pulse"}
          />
          <div className="flex flex-col" style={{ gap: 6 }}>
            <span
              style={{
                fontFamily: "'Saira', sans-serif",
                fontWeight: 800,
                fontSize: 25,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                color: "#e7e4dc",
              }}
            >
              GHOST<span style={{ color: ACCENT }}>FX</span>
            </span>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(231,228,220,0.32)" }}
            >
              Studio MK.II
            </span>
          </div>
        </div>

        <LoadingWave color={ACCENT} progress={progress} armed={armed} />

        <span
          className="font-[var(--font-mono)] uppercase"
          style={{
            fontSize: 8.5,
            letterSpacing: "0.28em",
            color: armed ? ACCENT : "rgba(231,228,220,0.34)",
            transition: "color 400ms ease",
          }}
        >
          {armed ? "Ready" : stage}
        </span>
      </div>
    </div>
  );
}
