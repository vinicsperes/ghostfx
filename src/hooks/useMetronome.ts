import { useCallback, useRef, useState, useEffect } from "react";

export function useMetronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const scheduleNote = (time: number) => {
    if (!ctxRef.current) return;
    const osc = ctxRef.current.createOscillator();
    const envelope = ctxRef.current.createGain();

    osc.frequency.value = 1000;
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(envelope);
    envelope.connect(ctxRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);
  };

  const scheduler = useCallback(() => {
    if (!ctxRef.current) return;
    while (nextNoteTimeRef.current < ctxRef.current.currentTime + 0.1) {
      scheduleNote(nextNoteTimeRef.current);
      nextNoteTimeRef.current += 60.0 / bpm;
    }
    timerRef.current = window.setTimeout(scheduler, 25);
  }, [bpm]);

  const toggle = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      nextNoteTimeRef.current = ctxRef.current.currentTime;
      scheduler();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { bpm, setBpm, isPlaying, toggle };
}
