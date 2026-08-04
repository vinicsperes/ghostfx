import { useEffect, useRef, useState } from "react";
import { detectPitch, noteFromFreq, type Note } from "../audio/pitch";

const POLL_MS = 70;
const HISTORY = 5;
const HOLD_MS = 900;

export type TunerReading = (Note & { freq: number }) | null;

export function useTuner({
  enabled,
  getMicWaveform,
  getSampleRate,
}: {
  enabled: boolean;
  getMicWaveform: () => Float32Array;
  getSampleRate: () => number;
}) {
  const [reading, setReading] = useState<TunerReading>(null);
  const historyRef = useRef<number[]>([]);
  const lastHitRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      historyRef.current = [];
      setReading(null);
      return;
    }
    const id = window.setInterval(() => {
      const rate = getSampleRate();
      if (!rate) return;
      const freq = detectPitch(getMicWaveform(), rate);

      if (freq === null) {
        if (performance.now() - lastHitRef.current > HOLD_MS) {
          historyRef.current = [];
          setReading((prev) => (prev === null ? prev : null));
        }
        return;
      }

      const history = historyRef.current;
      history.push(freq);
      if (history.length > HISTORY) history.shift();
      const sorted = [...history].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      lastHitRef.current = performance.now();

      const note = noteFromFreq(median);
      setReading((prev) =>
        prev && prev.midi === note.midi && prev.cents === note.cents
          ? prev
          : { ...note, freq: median },
      );
    }, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, getMicWaveform, getSampleRate]);

  return reading;
}
