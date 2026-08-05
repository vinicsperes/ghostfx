import { useCallback, useEffect, useRef, useState } from "react";

const SCHEDULE_AHEAD = 0.12;
const TICK_MS = 25;
const BEATS_PER_BAR = 4;
const CLICK_LEVEL = 0.11;
const ACCENT_LEVEL = 0.17;
const CLICK_HZ = 620;
const ACCENT_HZ = 880;
const DROP = 0.72;
const TONE_HZ = 2200;
const DECAY = 0.055;

export const MIN_BPM = 40;
export const MAX_BPM = 240;

export function useMetronome({
  ctxRef,
  ensureAudio,
}: {
  ctxRef: React.RefObject<AudioContext | null>;
  ensureAudio: () => Promise<void>;
}) {
  const [bpm, setBpmState] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [countingIn, setCountingIn] = useState(false);
  const [level, setLevelState] = useState(0.7);
  const levelRef = useRef(0.7);

  const bpmRef = useRef(bpm);
  const runningRef = useRef(false);
  const countingInRef = useRef(false);
  const beatRef = useRef(0);
  const startTimeRef = useRef(0);
  const nextTimeRef = useRef(0);
  const countInStartRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const ensureGain = useCallback((ctx: AudioContext) => {
    if (!gainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = levelRef.current;
      gain.connect(ctx.destination);
      gainRef.current = gain;
    }
    return gainRef.current;
  }, []);

  const setLevel = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(1, next));
      levelRef.current = clamped;
      setLevelState(clamped);
      const ctx = ctxRef.current;
      if (gainRef.current && ctx)
        gainRef.current.gain.setTargetAtTime(clamped, ctx.currentTime, 0.02);
    },
    [ctxRef],
  );

  const click = useCallback(
    (ctx: AudioContext, time: number, accent: boolean) => {
      const out = ensureGain(ctx);
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const tone = ctx.createBiquadFilter();

      const hz = accent ? ACCENT_HZ : CLICK_HZ;
      osc.type = "sine";
      osc.frequency.setValueAtTime(hz, time);
      osc.frequency.exponentialRampToValueAtTime(hz * DROP, time + DECAY);

      tone.type = "lowpass";
      tone.frequency.value = TONE_HZ;
      tone.Q.value = 0.707;

      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(accent ? ACCENT_LEVEL : CLICK_LEVEL, time + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0005, time + DECAY);

      osc.connect(tone);
      tone.connect(env);
      env.connect(out);
      osc.start(time);
      osc.stop(time + DECAY + 0.01);
    },
    [ensureGain],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !runningRef.current) return;
    while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      click(ctx, nextTimeRef.current, beatRef.current % BEATS_PER_BAR === 0);
      beatRef.current += 1;
      nextTimeRef.current += 60 / bpmRef.current;
    }
    timerRef.current = window.setTimeout(schedule, TICK_MS);
  }, [ctxRef, click]);

  const stop = useCallback(() => {
    clearTimer();
    runningRef.current = false;
    setIsRunning(false);
  }, [clearTimer]);

  const start = useCallback(async () => {
    await ensureAudio();
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    ensureGain(ctx);
    clearTimer();
    beatRef.current = 0;
    startTimeRef.current = ctx.currentTime + 0.06;
    nextTimeRef.current = startTimeRef.current;
    runningRef.current = true;
    setIsRunning(true);
    schedule();
  }, [ensureAudio, ctxRef, ensureGain, clearTimer, schedule]);

  const toggle = useCallback(() => {
    if (runningRef.current) stop();
    else void start();
  }, [start, stop]);

  const setBpm = useCallback(
    (next: number) => {
      const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(next)));
      bpmRef.current = clamped;
      setBpmState(clamped);
      const ctx = ctxRef.current;
      if (runningRef.current && ctx) {
        clearTimer();
        beatRef.current = 0;
        startTimeRef.current = ctx.currentTime + 0.06;
        nextTimeRef.current = startTimeRef.current;
        schedule();
      }
    },
    [ctxRef, clearTimer, schedule],
  );

  const countIn = useCallback(
    async (beats = BEATS_PER_BAR) => {
      await ensureAudio();
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();
      ensureGain(ctx);
      stop();

      const spb = 60 / bpmRef.current;
      const from = ctx.currentTime + 0.08;
      for (let i = 0; i < beats; i++) click(ctx, from + i * spb, i === 0);
      countInStartRef.current = from;
      countingInRef.current = true;
      setCountingIn(true);

      const endsAt = from + beats * spb;
      beatRef.current = 0;
      startTimeRef.current = endsAt;
      nextTimeRef.current = endsAt;
      runningRef.current = true;
      setIsRunning(true);
      schedule();

      await new Promise<void>((resolve) => {
        window.setTimeout(
          () => {
            countingInRef.current = false;
            setCountingIn(false);
            resolve();
          },
          Math.max(0, (endsAt - ctx.currentTime) * 1000),
        );
      });
    },
    [ensureAudio, ctxRef, ensureGain, stop, click, schedule],
  );

  const getBeat = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return -1;
    const spb = 60 / bpmRef.current;
    if (countingInRef.current) {
      return Math.max(0, Math.floor((ctx.currentTime - countInStartRef.current) / spb));
    }
    if (!runningRef.current) return -1;
    return Math.max(0, Math.floor((ctx.currentTime - startTimeRef.current) / spb));
  }, [ctxRef]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    bpm,
    setBpm,
    level,
    setLevel,
    isRunning,
    countingIn,
    toggle,
    start,
    stop,
    countIn,
    getBeat,
    beatsPerBar: BEATS_PER_BAR,
  };
}
