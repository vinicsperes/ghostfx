import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import GhostMark from "./GhostMark";
import LoadingWave from "./LoadingWave";
import { shifted } from "./data/accent";

const ACCENT = shifted("#20f040");
const LED = shifted("#41ff77");
const MIN_BOOT_MS = 1100;

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
    if (armed) {
      const timer = setTimeout(() => {
        setFinished(true);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 800);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [armed, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[300] bg-[#080808] transition-opacity duration-700 flex flex-col items-center justify-center ${
        finished ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="absolute inset-0 blur-3xl rounded-full animate-loading-pulse"
          style={{ background: `${ACCENT}1a` }}
        />
        <GhostMark
          variant="solid"
          size={96}
          color="rgba(231,228,220,0.85)"
          ledColor={armed ? LED : "#1a1d22"}
          glow={armed}
          className={`relative ${armed ? "" : "animate-loading-pulse"}`}
        />
      </div>

      <div className="flex flex-col items-center gap-2" style={{ marginTop: 26 }}>
        <span
          style={{
            fontFamily: "'Saira', sans-serif",
            fontWeight: 800,
            fontSize: 38,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: "#e7e4dc",
          }}
        >
          GHOST<span style={{ color: ACCENT }}>FX</span>
        </span>
        <span
          className="font-[var(--font-mono)] uppercase tracking-[0.35em]"
          style={{ fontSize: 9, color: "rgba(168,168,188,0.55)" }}
        >
          Signal Processor MK.I
        </span>
      </div>

      <div style={{ marginTop: 6 }}>
        <LoadingWave color={ACCENT} progress={progress} armed={armed} />
      </div>

      <span
        className="font-[var(--font-pixel)] tracking-widest"
        style={{ fontSize: 8, color: armed ? ACCENT : "rgba(255,255,255,0.4)", marginTop: 2 }}
      >
        {armed ? "READY" : `INITIALIZING ${Math.round(progress)}%`}
      </span>

      <div className="absolute inset-0 scanline opacity-20" />
    </div>
  );
}
