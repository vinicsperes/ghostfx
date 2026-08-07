import { useCallback, useEffect, useRef, useState } from "react";
import { computePeaks, encodeMp3, encodeWav } from "../audio/encode";
import { renderArrangement } from "../audio/render";
import { LANES } from "../lib/timeline";

export type Clip = {
  id: string;
  name: string;
  color: string;
  lane: number;
  at: number;
  in: number;
  out: number;
  full: number;
  level: number;
  muted: boolean;
  buffer: AudioBuffer;
  peaks: Float32Array;
};

const MIN_CLIP_S = 0.15;

export function clipLength(clip: Clip): number {
  return Math.max(0, clip.out - clip.in);
}

export const MAX_CLIPS = 24;

export function useArrangement({ ctxRef }: { ctxRef: React.RefObject<AudioContext | null> }) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [master, setMasterState] = useState(0.9);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clipsRef = useRef<Clip[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);
  const masterRef = useRef(0.9);
  const originRef = useRef(0);
  const phaseRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const length = clips.reduce((max, clip) => Math.max(max, clip.at + clipLength(clip)), 0);

  const stopSources = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    for (const src of sourcesRef.current) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = [];
  }, []);

  const getPosition = useCallback((): number => {
    const ctx = ctxRef.current;
    if (!ctx || !sourcesRef.current.length) return phaseRef.current;
    return Math.max(0, ctx.currentTime - originRef.current);
  }, [ctxRef]);

  const pause = useCallback(() => {
    phaseRef.current = getPosition();
    stopSources();
    setIsPlaying(false);
  }, [getPosition, stopSources]);

  const play = useCallback(async () => {
    const ctx = ctxRef.current;
    const list = clipsRef.current;
    if (!ctx || !list.length) return;
    if (ctx.state === "suspended") await ctx.resume();
    stopSources();

    if (!gainRef.current) {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gainRef.current = gain;
    }
    gainRef.current.gain.value = masterRef.current;

    const total = list.reduce((max, clip) => Math.max(max, clip.at + clipLength(clip)), 0);
    let phase = phaseRef.current;
    if (phase >= total - 0.02) phase = 0;
    const when = ctx.currentTime + 0.05;
    originRef.current = when - phase;

    for (const clip of list) {
      const span = clipLength(clip);
      if (clip.at + span <= phase) continue;
      if (clip.muted) continue;
      const src = ctx.createBufferSource();
      src.buffer = clip.buffer;
      const gain = ctx.createGain();
      gain.gain.value = clip.level;
      gain.connect(gainRef.current);
      src.connect(gain);
      const into = Math.max(0, phase - clip.at);
      src.start(when + Math.max(0, clip.at - phase), clip.in + into, span - into);
      sourcesRef.current.push(src);
    }

    phaseRef.current = phase;
    setIsPlaying(true);
    timerRef.current = window.setTimeout(
      () => {
        stopSources();
        phaseRef.current = 0;
        setIsPlaying(false);
      },
      (total - phase) * 1000 + 120,
    );
  }, [ctxRef, stopSources]);

  const toggle = useCallback(() => {
    if (sourcesRef.current.length) pause();
    else void play();
  }, [pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      phaseRef.current = Math.max(0, seconds);
      if (sourcesRef.current.length) void play();
    },
    [play],
  );

  const commit = useCallback((next: Clip[]) => {
    clipsRef.current = next;
    setClips(next);
  }, []);

  const add = useCallback(
    (clip: { name: string; color: string; buffer: AudioBuffer; lane?: number; at?: number }) => {
      const list = clipsRef.current;
      if (list.length >= MAX_CLIPS) {
        setError(`the track holds ${MAX_CLIPS} clips`);
        return;
      }
      const lane =
        clip.lane !== undefined ? Math.max(0, Math.min(LANES - 1, clip.lane)) : list.length % LANES;
      const at =
        clip.at !== undefined
          ? Math.max(0, Math.round(clip.at * 100) / 100)
          : list
              .filter((c) => c.lane === lane)
              .reduce((max, c) => Math.max(max, c.at + clipLength(c)), 0);
      const next: Clip = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: clip.name,
        color: clip.color,
        lane,
        at,
        in: 0,
        out: clip.buffer.duration,
        full: clip.buffer.duration,
        level: 0.9,
        muted: false,
        buffer: clip.buffer,
        peaks: computePeaks(clip.buffer, 220),
      };
      setError(null);
      commit([...list, next]);
    },
    [commit],
  );

  const move = useCallback(
    (id: string, lane: number, at: number) => {
      commit(
        clipsRef.current.map((clip) =>
          clip.id === id
            ? {
                ...clip,
                lane: Math.max(0, Math.min(LANES - 1, lane)),
                at: Math.max(0, Math.round(at * 100) / 100),
              }
            : clip,
        ),
      );
    },
    [commit],
  );

  const trim = useCallback(
    (id: string, edge: "in" | "out", seconds: number) => {
      commit(
        clipsRef.current.map((clip) => {
          if (clip.id !== id) return clip;
          if (edge === "out") {
            const out = Math.max(clip.in + MIN_CLIP_S, Math.min(clip.full, seconds));
            return { ...clip, out };
          }
          const next = Math.max(0, Math.min(clip.out - MIN_CLIP_S, seconds));
          return { ...clip, in: next, at: Math.max(0, clip.at + (next - clip.in)) };
        }),
      );
    },
    [commit],
  );

  const setClipLevel = useCallback(
    (id: string, level: number) => {
      commit(
        clipsRef.current.map((clip) =>
          clip.id === id ? { ...clip, level: Math.max(0, Math.min(1, level)) } : clip,
        ),
      );
    },
    [commit],
  );

  const toggleMute = useCallback(
    (id: string) => {
      commit(
        clipsRef.current.map((clip) => (clip.id === id ? { ...clip, muted: !clip.muted } : clip)),
      );
    },
    [commit],
  );

  const setMaster = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(1, next));
      masterRef.current = clamped;
      setMasterState(clamped);
      const ctx = ctxRef.current;
      if (gainRef.current && ctx)
        gainRef.current.gain.setTargetAtTime(clamped, ctx.currentTime, 0.02);
    },
    [ctxRef],
  );

  const remove = useCallback(
    (id: string) => {
      commit(clipsRef.current.filter((clip) => clip.id !== id));
    },
    [commit],
  );

  const clear = useCallback(() => {
    stopSources();
    phaseRef.current = 0;
    setIsPlaying(false);
    commit([]);
  }, [commit, stopSources]);

  const download = useCallback(async () => {
    const ctx = ctxRef.current;
    const list = clipsRef.current;
    if (!ctx || !list.length || isExporting) return;
    setIsExporting(true);
    try {
      const rendered = await renderArrangement(
        list
          .filter((clip) => !clip.muted)
          .map((clip) => ({
            buffer: clip.buffer,
            at: clip.at,
            from: clip.in,
            span: clipLength(clip),
            level: clip.level,
          })),
        ctx.sampleRate,
        masterRef.current,
      );
      let blob: Blob;
      let ext: string;
      try {
        blob = await encodeMp3(rendered);
        ext = "mp3";
      } catch {
        blob = encodeWav(rendered);
        ext = "wav";
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghostfx-track-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("could not export the track");
    } finally {
      setIsExporting(false);
    }
  }, [ctxRef, isExporting]);

  const teardown = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    for (const src of sourcesRef.current) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  return {
    clips,
    length,
    isPlaying,
    isExporting,
    error,
    master,
    setMaster,
    add,
    move,
    trim,
    setClipLevel,
    toggleMute,
    remove,
    clear,
    play,
    pause,
    toggle,
    seek,
    getPosition,
    download,
  };
}
