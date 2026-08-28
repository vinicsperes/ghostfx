import { useCallback, useEffect, useRef, useState } from "react";
import { computePeaks } from "../audio/encode";
import { masterGainFromKnob } from "../audio/dsp";
import type { Backing } from "../audio/render";

export type LoopSlot = {
  id: string;
  name: string;
  color: string;
  buffer: AudioBuffer;
  peaks: Float32Array;
  duration: number;
};

export function useLoop({
  ctxRef,
  ensureAudio,
  masterVolume,
}: {
  ctxRef: React.RefObject<AudioContext | null>;
  ensureAudio: () => Promise<void>;
  masterVolume: number;
}) {
  const [slot, setSlot] = useState<LoopSlot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevelState] = useState(1);

  const slotRef = useRef<LoopSlot | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const levelRef = useRef(1);
  const masterRef = useRef(masterVolume);

  const monitorGain = useCallback(
    () => levelRef.current * masterGainFromKnob(masterRef.current),
    [],
  );

  useEffect(() => {
    masterRef.current = masterVolume;
    const ctx = ctxRef.current;
    if (gainRef.current && ctx)
      gainRef.current.gain.setTargetAtTime(monitorGain(), ctx.currentTime, 0.05);
  }, [masterVolume, ctxRef, monitorGain]);

  const setLevel = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(1, next));
      levelRef.current = clamped;
      setLevelState(clamped);
      const ctx = ctxRef.current;
      if (gainRef.current && ctx)
        gainRef.current.gain.setTargetAtTime(monitorGain(), ctx.currentTime, 0.02);
    },
    [ctxRef, monitorGain],
  );

  const getPosition = useCallback((): number => {
    const current = slotRef.current;
    if (!current || current.duration <= 0) return 0;
    const ctx = ctxRef.current;
    if (!sourceRef.current || !ctx) return offsetRef.current;
    const into = offsetRef.current + (ctx.currentTime - startedAtRef.current);
    return into % current.duration;
  }, [ctxRef]);

  const snapshot = useCallback((): Backing | null => {
    const current = slotRef.current;
    if (!current || !sourceRef.current) return null;
    const ctx = ctxRef.current;
    const latency = ctx ? ctx.baseLatency + (ctx.outputLatency || 0) : 0;
    return {
      buffer: current.buffer,
      name: current.name,
      level: levelRef.current,
      loop: true,
      start: 0,
      end: current.duration,
      offset: getPosition() - latency,
    };
  }, [ctxRef, getPosition]);

  const stopSource = useCallback(() => {
    const src = sourceRef.current;
    if (!src) return;
    sourceRef.current = null;
    src.onended = null;
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const pause = useCallback(() => {
    if (sourceRef.current) offsetRef.current = getPosition();
    stopSource();
    setIsPlaying(false);
  }, [getPosition, stopSource]);

  const play = useCallback(
    async (from?: number) => {
      const current = slotRef.current;
      if (!current) return;
      await ensureAudio();
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();

      if (!gainRef.current) {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gainRef.current = gain;
      }
      gainRef.current.gain.value = monitorGain();

      stopSource();
      const at = Math.max(0, Math.min(current.duration, from ?? offsetRef.current));
      const src = ctx.createBufferSource();
      src.buffer = current.buffer;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = current.duration;
      src.connect(gainRef.current);
      src.start(0, at);
      sourceRef.current = src;
      startedAtRef.current = ctx.currentTime;
      offsetRef.current = at;
      setIsPlaying(true);
    },
    [ctxRef, ensureAudio, stopSource, monitorGain],
  );

  const pin = useCallback(
    async (take: { id: string; name: string; color: string; buffer: AudioBuffer }) => {
      const next: LoopSlot = {
        ...take,
        peaks: computePeaks(take.buffer),
        duration: take.buffer.duration,
      };
      slotRef.current = next;
      setSlot(next);
      offsetRef.current = 0;
      await play(0);
    },
    [play],
  );

  const unpin = useCallback(() => {
    stopSource();
    setIsPlaying(false);
    slotRef.current = null;
    offsetRef.current = 0;
    setSlot(null);
  }, [stopSource]);

  const toggle = useCallback(() => {
    if (sourceRef.current) pause();
    else void play();
  }, [pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      const current = slotRef.current;
      if (!current) return;
      const at = Math.max(0, Math.min(current.duration, seconds));
      if (sourceRef.current) void play(at);
      else offsetRef.current = at;
    },
    [play],
  );

  useEffect(() => {
    return () => {
      const src = sourceRef.current;
      if (!src) return;
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  return {
    slot,
    isPlaying,
    level,
    setLevel,
    pin,
    unpin,
    play,
    pause,
    toggle,
    seek,
    getPosition,
    snapshot,
  };
}
