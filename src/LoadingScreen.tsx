import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import GhostMark from "./GhostMark";

export default function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const { progress } = useProgress();
  const [visible, setVisible] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        setFinished(true);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 800);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[300] bg-[#080808] transition-opacity duration-700 flex flex-col items-center justify-center gap-8 ${
        finished ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 blur-3xl bg-[#20f040]/10 rounded-full animate-loading-pulse" />
        <GhostMark
          variant="solid"
          size={72}
          color="rgba(231,228,220,0.6)"
          ledColor="#41ff77"
          className="relative animate-loading-pulse"
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="h-[2px] w-48 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#20f040] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between w-48 font-[var(--font-pixel)] text-[8px] tracking-widest text-white/40">
          <span>INITIALIZING</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="absolute inset-0 scanline opacity-20" />
    </div>
  );
}
