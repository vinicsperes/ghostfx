import { useCallback, useEffect, useRef, useState } from "react";
import { computePeaks } from "../audio/encode";
import type { Backing } from "../audio/render";

export type Track = {
  name: string;
  buffer: AudioBuffer;
  peaks: Float32Array;
  duration: number;
};

export const MAX_TRACK_S = 180;
export const MAX_TRACK_MB = 40;

const MAX_TRACK_BYTES = MAX_TRACK_MB * 1024 * 1024;
const NAME_MAX = 32;
const MIN_LOOP_S = 0.25;

function shortName(name: string): string {
  const bare = name.replace(/\.[^./\\]+$/, "").trim() || "track";
  return bare.length > NAME_MAX ? `${bare.slice(0, NAME_MAX - 1)}…` : bare;
}

function probeDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  return new Promise<number>((resolve, reject) => {
    const el = new Audio();
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(el.duration);
    el.onerror = () => reject(new Error("unreadable"));
    el.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

async function decodeFile(file: File, rate: number): Promise<AudioBuffer> {
  const bytes = await file.arrayBuffer();
  return new OfflineAudioContext(1, 1, rate).decodeAudioData(bytes);
}

export function useTrack({
  ctxRef,
  ensureAudio,
}: {
  ctxRef: React.RefObject<AudioContext | null>;
  ensureAudio: () => Promise<void>;
}) {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoopState] = useState(true);
  const [region, setRegionState] = useState({ start: 0, end: 0 });
  const [level, setLevelState] = useState(0.7);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const loopRef = useRef(true);
  const regionRef = useRef({ start: 0, end: 0 });
  const levelRef = useRef(0.7);
  const trackRef = useRef<Track | null>(null);

  const getPosition = useCallback((): number => {
    const ctx = ctxRef.current;
    const current = trackRef.current;
    if (!current) return 0;
    if (!sourceRef.current || !ctx) return offsetRef.current;
    const elapsed = ctx.currentTime - startedAtRef.current;
    const from = offsetRef.current;
    if (!loopRef.current) return Math.min(current.duration, from + elapsed);
    const { start, end } = regionRef.current;
    const span = end - start;
    if (span <= 0) return from;
    const into = from - start + elapsed;
    return start + (into < 0 ? 0 : into % span);
  }, [ctxRef]);

  const snapshot = useCallback((): Backing | null => {
    const current = trackRef.current;
    if (!current || !sourceRef.current) return null;
    const ctx = ctxRef.current;
    const latency = ctx ? ctx.baseLatency + (ctx.outputLatency || 0) : 0;
    return {
      buffer: current.buffer,
      name: current.name,
      level: levelRef.current,
      loop: loopRef.current,
      start: regionRef.current.start,
      end: regionRef.current.end,
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
      const current = trackRef.current;
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
      gainRef.current.gain.value = levelRef.current;

      stopSource();
      const { start, end } = regionRef.current;
      let at = from ?? offsetRef.current;
      if (loopRef.current && (at < start || at >= end)) at = start;
      if (at >= current.duration - 0.02) at = loopRef.current ? start : 0;

      const src = ctx.createBufferSource();
      src.buffer = current.buffer;
      src.loop = loopRef.current;
      src.loopStart = start;
      src.loopEnd = end;
      src.connect(gainRef.current);
      src.onended = () => {
        if (sourceRef.current !== src) return;
        sourceRef.current = null;
        offsetRef.current = 0;
        setIsPlaying(false);
      };
      src.start(0, at);
      sourceRef.current = src;
      startedAtRef.current = ctx.currentTime;
      offsetRef.current = at;
      setIsPlaying(true);
    },
    [ctxRef, ensureAudio, stopSource],
  );

  const toggle = useCallback(() => {
    if (sourceRef.current) pause();
    else void play();
  }, [pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      const current = trackRef.current;
      if (!current) return;
      const at = Math.max(0, Math.min(current.duration, seconds));
      if (sourceRef.current) void play(at);
      else offsetRef.current = at;
    },
    [play],
  );

  const reanchor = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !sourceRef.current) return;
    offsetRef.current = getPosition();
    startedAtRef.current = ctx.currentTime;
  }, [ctxRef, getPosition]);

  const setLoop = useCallback(
    (next: boolean) => {
      reanchor();
      loopRef.current = next;
      setLoopState(next);
      if (sourceRef.current) sourceRef.current.loop = next;
    },
    [reanchor],
  );

  const setRegion = useCallback(
    (start: number, end: number) => {
      const current = trackRef.current;
      if (!current) return;
      const lo = Math.max(0, Math.min(current.duration - MIN_LOOP_S, start));
      const hi = Math.min(current.duration, Math.max(lo + MIN_LOOP_S, end));
      reanchor();
      regionRef.current = { start: lo, end: hi };
      setRegionState({ start: lo, end: hi });
      const src = sourceRef.current;
      if (src) {
        src.loopStart = lo;
        src.loopEnd = hi;
      }
    },
    [reanchor],
  );

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

  const bounce = useCallback(async (): Promise<AudioBuffer | null> => {
    const current = trackRef.current;
    const ctx = ctxRef.current;
    if (!current || !ctx) return null;
    const { start, end } = regionRef.current;
    const frames = Math.max(1, Math.round((end - start) * ctx.sampleRate));
    const offline = new OfflineAudioContext(
      Math.min(2, current.buffer.numberOfChannels),
      frames,
      ctx.sampleRate,
    );
    const src = offline.createBufferSource();
    src.buffer = current.buffer;
    src.connect(offline.destination);
    src.start(0, start);
    return offline.startRendering();
  }, [ctxRef]);

  const rename = useCallback((name: string) => {
    const clean = name.trim().slice(0, 32);
    if (!clean) return;
    setTrack((prev) => {
      if (!prev) return prev;
      const next = { ...prev, name: clean };
      trackRef.current = next;
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    stopSource();
    setIsPlaying(false);
    offsetRef.current = 0;
    trackRef.current = null;
    regionRef.current = { start: 0, end: 0 };
    setRegionState({ start: 0, end: 0 });
    setTrack(null);
    setError(null);
  }, [stopSource]);

  const load = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_TRACK_BYTES) {
        setError(`that file is over ${MAX_TRACK_MB} MB, trim it first`);
        return;
      }
      setLoading(true);
      try {
        const probed = await probeDuration(file).catch(() => 0);
        if (Number.isFinite(probed) && probed > MAX_TRACK_S + 1) {
          setError(`tracks go up to ${MAX_TRACK_S / 60} minutes`);
          return;
        }
        const buffer = await decodeFile(file, ctxRef.current?.sampleRate ?? 48000);
        if (buffer.duration > MAX_TRACK_S + 1) {
          setError(`tracks go up to ${MAX_TRACK_S / 60} minutes`);
          return;
        }
        stopSource();
        setIsPlaying(false);
        offsetRef.current = 0;
        const next: Track = {
          name: shortName(file.name),
          buffer,
          peaks: computePeaks(buffer),
          duration: buffer.duration,
        };
        trackRef.current = next;
        regionRef.current = { start: 0, end: buffer.duration };
        setRegionState({ start: 0, end: buffer.duration });
        setTrack(next);
      } catch {
        setError("could not read that audio file");
      } finally {
        setLoading(false);
      }
    },
    [ctxRef, stopSource],
  );

  useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  useEffect(() => {
    return () => {
      const src = sourceRef.current;
      if (src) {
        src.onended = null;
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      }
    };
  }, []);

  return {
    track,
    loading,
    error,
    isPlaying,
    loop,
    region,
    level,
    load,
    rename,
    bounce,
    clear,
    play,
    pause,
    toggle,
    seek,
    setLoop,
    setRegion,
    setLevel,
    getPosition,
    snapshot,
  };
}
