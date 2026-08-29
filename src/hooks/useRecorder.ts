import { useCallback, useEffect, useRef, useState } from "react";
import { computePeaks, encodeMp3, encodeWav } from "../audio/encode";
import { createLimiterCurve, masterGainFromKnob } from "../audio/dsp";
import {
  applyChainParams,
  buildChain,
  reverbBuffers,
  type ChainNodes,
  type SignalParams,
} from "../audio/chain";
import { renderTake, sliceBuffer, startBacking, type Backing } from "../audio/render";
import { CLEAN_RIG, RIGS, rigAt, rigMeta, type RigKnobs } from "../data/presets";

export type Take = {
  id: string;
  seq: number;
  blob: Blob;
  dryBlob: Blob | null;
  peaks: Float32Array;
  duration: number;
  presetIdx: number | null;
  params: SignalParams;
  backing: Backing | null;
  createdAt: number;
};

export const MAX_REC_MS = 180000;
export const WARN_REC_MS = 10000;
const MAX_TAKES = 12;
const MIN_TAKE_S = 0.4;

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

const SIGNAL_KEYS = ["drive", "echo", "tone", "reverb", "mod"] as const;

export function signalOf(knobs: RigKnobs): SignalParams {
  return {
    drive: knobs.drive,
    echo: knobs.echo,
    tone: knobs.tone,
    reverb: knobs.reverb,
    mod: knobs.mod,
  };
}

const IDLE_PARAMS = signalOf(RIGS[0].knobs);
const MIN_REGION_S = 0.2;

export type Region = { start: number; end: number };

function sameParams(a: SignalParams, b: SignalParams): boolean {
  return SIGNAL_KEYS.every((key) => Math.abs(a[key] - b[key]) < 0.001);
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useRecorder({
  ctxRef,
  destRef,
  dryDestRef,
  ensureAudio,
  presetIdx,
  params,
  masterVolume,
  backingRef,
}: {
  ctxRef: React.RefObject<AudioContext | null>;
  destRef: React.RefObject<MediaStreamAudioDestinationNode | null>;
  dryDestRef: React.RefObject<MediaStreamAudioDestinationNode | null>;
  ensureAudio: () => Promise<void>;
  presetIdx: number | null;
  params: SignalParams;
  masterVolume: number;
  backingRef?: React.RefObject<(() => Backing | null) | null>;
}) {
  const [takes, setTakes] = useState<Take[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [looping, setLoopingState] = useState(false);
  const [rigByTake, setRigByTake] = useState<Record<string, number>>({});
  const [paramsByTake, setParamsByTake] = useState<Record<string, SignalParams>>({});
  const [regionByTake, setRegionByTake] = useState<Record<string, Region>>({});
  const [nameByTake, setNameByTake] = useState<Record<string, string>>({});
  const [backingOn, setBackingOn] = useState<Record<string, true>>({});
  const [error, setError] = useState<string | null>(null);

  const wetRef = useRef<Map<string, AudioBuffer>>(new Map());
  const dryRef = useRef<Map<string, AudioBuffer>>(new Map());

  const recorderRef = useRef<MediaRecorder | null>(null);
  const dryRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dryChunksRef = useRef<Blob[]>([]);
  const dryDoneRef = useRef<Promise<void> | null>(null);
  const recTimeoutRef = useRef<number | null>(null);
  const recStartRef = useRef(0);
  const recordingRef = useRef(false);
  const recBackingRef = useRef<Backing | null>(null);
  const seqRef = useRef(0);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const backingSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playGainRef = useRef<GainNode | null>(null);
  const chainRef = useRef<{
    rig: number;
    input: AudioNode;
    output: GainNode;
    limiter: WaveShaperNode;
    nodes: ChainNodes;
  } | null>(null);
  const irRef = useRef<AudioBuffer[] | null>(null);
  const playStartRef = useRef(0);
  const playOffsetRef = useRef(0);
  const loopingRef = useRef(false);
  const playRegionRef = useRef<Region>({ start: 0, end: 0 });
  const bounceRef = useRef<{ id: string; buffer: AudioBuffer } | null>(null);
  const bouncePendingRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const bounceTakeRef = useRef<((id?: string) => Promise<AudioBuffer | null>) | null>(null);

  const presetIdxRef = useRef(presetIdx);
  const liveParamsRef = useRef(params);
  const masterVolumeRef = useRef(masterVolume);
  useEffect(() => {
    presetIdxRef.current = presetIdx;
  }, [presetIdx]);
  useEffect(() => {
    liveParamsRef.current = params;
  }, [params]);
  useEffect(() => {
    masterVolumeRef.current = masterVolume;
    const ctx = ctxRef.current;
    if (playGainRef.current && ctx && sourceRef.current)
      playGainRef.current.gain.setTargetAtTime(
        masterGainFromKnob(masterVolume),
        ctx.currentTime,
        0.05,
      );
  }, [masterVolume, ctxRef]);

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? null;
  const activeRig = activeTake ? (rigByTake[activeTake.id] ?? activeTake.presetIdx ?? 0) : 0;
  const activeParams = activeTake
    ? (paramsByTake[activeTake.id] ?? activeTake.params)
    : IDLE_PARAMS;
  const activePeaks = activeTake?.peaks ?? null;
  const activeDuration = activeTake?.duration ?? 0;
  const activeBacking = !!activeTake?.backing;
  const activeBackingOn = activeBacking && !!backingOn[activeTake.id];
  const activeRegion: Region = activeTake
    ? (regionByTake[activeTake.id] ?? { start: 0, end: activeTake.duration })
    : { start: 0, end: 0 };
  const activeTrimmed =
    !!activeTake && activeRegion.end - activeRegion.start < activeTake.duration - 0.01;
  const activeEdited =
    !!activeTake &&
    (activeRig !== (activeTake.presetIdx ?? 0) || !sameParams(activeParams, activeTake.params));

  const stopSource = useCallback(() => {
    const ctx = ctxRef.current;
    const gain = playGainRef.current;
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    }
    const backing = backingSourceRef.current;
    if (backing) {
      backingSourceRef.current = null;
      try {
        backing.stop();
      } catch {
        /* already stopped */
      }
    }
    const src = sourceRef.current;
    if (!src) return;
    sourceRef.current = null;
    src.onended = null;
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
  }, [ctxRef]);

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && sourceRef.current) {
      const at = ctx.currentTime - playStartRef.current;
      playOffsetRef.current = Math.max(0, at);
    }
    stopSource();
    setPlayingId(null);
  }, [ctxRef, stopSource]);

  const decodeWet = useCallback(
    async (take: Take): Promise<AudioBuffer | null> => {
      const cached = wetRef.current.get(take.id);
      if (cached) return cached;
      const ctx = ctxRef.current;
      if (!ctx) return null;
      try {
        const buffer = await ctx.decodeAudioData(await take.blob.arrayBuffer());
        wetRef.current.set(take.id, buffer);
        return buffer;
      } catch {
        return null;
      }
    },
    [ctxRef],
  );

  const decodeDry = useCallback(
    async (take: Take): Promise<AudioBuffer | null> => {
      if (!take.dryBlob) return null;
      const cached = dryRef.current.get(take.id);
      if (cached) return cached;
      const ctx = ctxRef.current;
      if (!ctx) return null;
      try {
        const buffer = await ctx.decodeAudioData(await take.dryBlob.arrayBuffer());
        dryRef.current.set(take.id, buffer);
        return buffer;
      } catch {
        return null;
      }
    },
    [ctxRef],
  );

  const ensureGain = useCallback((ctx: AudioContext): GainNode => {
    if (!playGainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      playGainRef.current = gain;
    }
    return playGainRef.current;
  }, []);

  const ensureChain = useCallback(
    (ctx: AudioContext, rig: number, signal: SignalParams, fresh: boolean): AudioNode => {
      const gain = ensureGain(ctx);
      const existing = chainRef.current;
      if (existing && existing.rig === rig && !fresh) {
        applyChainParams(ctx, existing.nodes, { ...signal, presetIdx: rig }, 0.01);
        return existing.input;
      }
      if (existing) {
        existing.output.disconnect();
        existing.limiter.disconnect();
        try {
          existing.nodes.lfo.stop();
          existing.nodes.modLfo.stop();
        } catch {
          /* already stopped */
        }
      }
      const irs = (irRef.current ??= reverbBuffers(ctx));
      const built = buildChain(ctx, { ...signal, presetIdx: rig }, irs);
      const limiter = ctx.createWaveShaper();
      limiter.curve = createLimiterCurve();
      limiter.oversample = "none";
      built.output.connect(limiter);
      limiter.connect(gain);
      chainRef.current = {
        rig,
        input: built.input,
        output: built.output,
        limiter,
        nodes: built.nodes,
      };
      return built.input;
    },
    [ensureGain],
  );

  const startPlayback = useCallback(
    async (take: Take, offset: number, override?: { rig: number; params: SignalParams }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();

      const rig = override?.rig ?? rigByTake[take.id] ?? take.presetIdx ?? 0;
      const signal = override?.params ?? paramsByTake[take.id] ?? take.params;
      const region = regionByTake[take.id] ?? { start: 0, end: take.duration };
      const dry = await decodeDry(take);
      const buffer = dry ?? (await decodeWet(take));
      if (!buffer) {
        setError("could not read that take");
        return;
      }

      const fresh = !sourceRef.current;
      stopSource();
      const gain = ensureGain(ctx);
      const target = dry && rig !== CLEAN_RIG ? ensureChain(ctx, rig, signal, fresh) : gain;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(target);
      src.onended = () => {
        if (sourceRef.current !== src) return;
        sourceRef.current = null;
        playOffsetRef.current = region.start;
        setPlayingId(null);
      };

      const from = offset >= region.end - 0.02 || offset < region.start ? region.start : offset;
      const now = ctx.currentTime;
      const span = Math.max(0.05, region.end - region.start);
      const left = Math.max(0.05, region.end - from);
      const repeat = loopingRef.current;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(masterGainFromKnob(masterVolumeRef.current), now);
      if (repeat) {
        src.loop = true;
        src.loopStart = region.start;
        src.loopEnd = region.end;
      }
      src.start(0, from);
      if (!repeat) src.stop(now + left);
      sourceRef.current = src;
      playRegionRef.current = region;

      const backing = backingOn[take.id] ? take.backing : null;
      if (backing) {
        const { source } = startBacking(ctx, backing, ctx.destination, {
          at: from,
          stopAt: repeat ? undefined : now + left,
          loopSpan: repeat ? span : undefined,
        });
        backingSourceRef.current = source;
      }

      bounceRef.current = null;
      const pending = (bounceTakeRef.current?.(take.id) ?? Promise.resolve(null)).catch(() => null);
      bouncePendingRef.current = pending;
      void pending.then((buffer) => {
        if (buffer) bounceRef.current = { id: take.id, buffer };
      });

      playStartRef.current = now - from;
      playOffsetRef.current = from;
      setPlayingId(take.id);
    },
    [
      ctxRef,
      rigByTake,
      paramsByTake,
      regionByTake,
      backingOn,
      decodeDry,
      decodeWet,
      stopSource,
      ensureGain,
      ensureChain,
    ],
  );

  const togglePlay = useCallback(
    async (id?: string) => {
      const targetId = id ?? activeTakeId;
      if (!targetId) return;
      const take = takes.find((t) => t.id === targetId);
      if (!take) return;
      if (playingId === targetId) {
        pause();
        return;
      }
      if (targetId !== activeTakeId) {
        setActiveTakeId(targetId);
        playOffsetRef.current = 0;
      }
      await startPlayback(take, playingId ? 0 : playOffsetRef.current);
    },
    [activeTakeId, takes, playingId, pause, startPlayback],
  );

  const getPlayPosition = useCallback(() => {
    const ctx = ctxRef.current;
    if (sourceRef.current && ctx) {
      const at = Math.max(0, ctx.currentTime - playStartRef.current);
      if (!loopingRef.current) return Math.min(activeDuration, at);
      const { start, end } = playRegionRef.current;
      const span = end - start;
      if (span <= 0) return start;
      return start + ((((at - start) % span) + span) % span);
    }
    return playOffsetRef.current;
  }, [ctxRef, activeDuration]);

  const seek = useCallback(
    async (seconds: number) => {
      if (!activeTake) return;
      const at = Math.max(activeRegion.start, Math.min(activeRegion.end, seconds));
      playOffsetRef.current = at;
      if (playingId === activeTake.id) await startPlayback(activeTake, at);
    },
    [activeTake, activeRegion.start, activeRegion.end, playingId, startPlayback],
  );

  const renameTake = useCallback((id: string, name: string) => {
    const clean = name.trim().slice(0, 24);
    setNameByTake((prev) => {
      if (!clean) {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: clean };
    });
  }, []);

  const cutTake = useCallback(
    async (id?: string): Promise<string | null> => {
      const targetId = id ?? activeTakeId;
      const take = takes.find((t) => t.id === targetId);
      const ctx = ctxRef.current;
      if (!take || !ctx) return null;

      const region = regionByTake[take.id] ?? { start: 0, end: take.duration };
      const span = region.end - region.start;
      if (span < MIN_REGION_S || span >= take.duration - 0.02) return null;

      const wet = await decodeWet(take);
      if (!wet) {
        setError("could not read that take");
        return null;
      }
      const dry = await decodeDry(take);
      const wetSlice = sliceBuffer(ctx, wet, region.start, region.end);
      const drySlice = dry ? sliceBuffer(ctx, dry, region.start, region.end) : null;

      const rig = rigByTake[take.id] ?? take.presetIdx ?? 0;
      const name = nameByTake[take.id] ?? `${rigMeta(rig).name} ${take.seq}`;
      const cut: Take = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        seq: ++seqRef.current,
        blob: encodeWav(wetSlice),
        dryBlob: drySlice ? encodeWav(drySlice) : null,
        peaks: computePeaks(wetSlice),
        duration: wetSlice.duration,
        presetIdx: take.presetIdx,
        params: paramsByTake[take.id] ?? take.params,
        backing: take.backing
          ? { ...take.backing, offset: take.backing.offset + region.start }
          : null,
        createdAt: Date.now(),
      };

      wetRef.current.set(cut.id, wetSlice);
      if (drySlice) dryRef.current.set(cut.id, drySlice);
      setRigByTake((prev) => ({ ...prev, [cut.id]: rig }));
      setParamsByTake((prev) => ({ ...prev, [cut.id]: cut.params }));
      setNameByTake((prev) => ({
        ...prev,
        [cut.id]: name.endsWith(" CUT") || name.length > 20 ? name : `${name} CUT`,
      }));
      setTakes((prev) => {
        const next = [cut, ...prev].slice(0, MAX_TAKES);
        const kept = new Set(next.map((t) => t.id));
        for (const key of [...wetRef.current.keys()])
          if (!kept.has(key)) wetRef.current.delete(key);
        for (const key of [...dryRef.current.keys()])
          if (!kept.has(key)) dryRef.current.delete(key);
        return next;
      });

      stopSource();
      setPlayingId(null);
      playOffsetRef.current = 0;
      setActiveTakeId(cut.id);
      setError(null);
      return cut.id;
    },
    [
      activeTakeId,
      takes,
      ctxRef,
      regionByTake,
      rigByTake,
      paramsByTake,
      nameByTake,
      decodeWet,
      decodeDry,
      stopSource,
    ],
  );

  const toggleBacking = useCallback(() => {
    const take = takes.find((t) => t.id === activeTakeId);
    if (!take?.backing) return;
    setBackingOn((prev) => {
      if (prev[take.id]) {
        const { [take.id]: _dropped, ...rest } = prev;
        return rest;
      }
      return { ...prev, [take.id]: true };
    });
  }, [takes, activeTakeId]);

  const setLooping = useCallback(
    (next: boolean) => {
      loopingRef.current = next;
      setLoopingState(next);
      const take = takes.find((t) => t.id === playingId);
      if (take) void startPlayback(take, getPlayPosition());
    },
    [takes, playingId, startPlayback, getPlayPosition],
  );

  const snapshot = useCallback((): Backing | null => {
    const ctx = ctxRef.current;
    if (!ctx || !sourceRef.current || !playingId) return null;
    const take = takes.find((t) => t.id === playingId);
    if (!take) return null;
    const buffer =
      bounceRef.current?.id === take.id ? bounceRef.current.buffer : wetRef.current.get(take.id);
    if (!buffer) return null;
    const region = regionByTake[take.id] ?? { start: 0, end: take.duration };
    const trimmed = bounceRef.current?.id === take.id;
    const latency = ctx.baseLatency + (ctx.outputLatency || 0);
    const at = getPlayPosition();
    return {
      buffer,
      name: take.id,
      level: 1,
      loop: loopingRef.current,
      start: trimmed ? 0 : region.start,
      end: trimmed ? buffer.duration : region.end,
      offset: (trimmed ? at - region.start : at) - latency,
    };
  }, [ctxRef, playingId, takes, regionByTake, getPlayPosition]);

  const setTakeRegion = useCallback(
    (id: string, start: number, end: number) => {
      const take = takes.find((t) => t.id === id);
      if (!take) return;
      const lo = Math.max(0, Math.min(take.duration - MIN_REGION_S, start));
      const hi = Math.min(take.duration, Math.max(lo + MIN_REGION_S, end));
      setRegionByTake((prev) => ({ ...prev, [id]: { start: lo, end: hi } }));
      if (playOffsetRef.current < lo || playOffsetRef.current > hi) playOffsetRef.current = lo;
    },
    [takes],
  );

  const getRecordElapsed = useCallback(
    () => (recordingRef.current ? (performance.now() - recStartRef.current) / 1000 : 0),
    [],
  );

  const selectTake = useCallback(
    (id: string) => {
      if (id === activeTakeId) return;
      stopSource();
      setPlayingId(null);
      playOffsetRef.current = 0;
      setActiveTakeId(id);
    },
    [activeTakeId, stopSource],
  );

  const deleteTake = useCallback(
    (id: string) => {
      wetRef.current.delete(id);
      dryRef.current.delete(id);
      if (playingId === id) {
        stopSource();
        setPlayingId(null);
      }
      setRigByTake(({ [id]: _dropped, ...rest }) => rest);
      setParamsByTake(({ [id]: _dropped, ...rest }) => rest);
      setRegionByTake(({ [id]: _dropped, ...rest }) => rest);
      setNameByTake(({ [id]: _dropped, ...rest }) => rest);
      setBackingOn(({ [id]: _dropped, ...rest }) => rest);
      setTakes((prev) => {
        const next = prev.filter((t) => t.id !== id);
        setActiveTakeId((current) => (current === id ? (next[0]?.id ?? null) : current));
        return next;
      });
      playOffsetRef.current = 0;
    },
    [playingId, stopSource],
  );

  const stopRecording = useCallback(() => {
    if (recTimeoutRef.current) {
      clearTimeout(recTimeoutRef.current);
      recTimeoutRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    const dry = dryRecorderRef.current;
    if (dry && dry.state !== "inactive") dry.stop();
    recordingRef.current = false;
    setIsRecording(false);
    stopSource();
    setPlayingId(null);
  }, [stopSource]);

  const toggleRecording = useCallback(async () => {
    if (recordingRef.current) {
      stopRecording();
      return;
    }

    await ensureAudio();
    const ctx = ctxRef.current;
    const dest = destRef.current;
    if (!ctx || !dest) return;
    if (ctx.state === "suspended") await ctx.resume();

    const overdub = loopingRef.current && !!sourceRef.current && !!playingId;
    if (overdub) {
      await bouncePendingRef.current;
    } else {
      stopSource();
      setPlayingId(null);
      playOffsetRef.current = 0;
    }

    const mime = pickMime();
    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    dryChunksRef.current = [];
    const dryDest = dryDestRef.current;
    const dryRec = dryDest
      ? new MediaRecorder(dryDest.stream, mime ? { mimeType: mime } : undefined)
      : null;
    dryDoneRef.current = null;
    if (dryRec) {
      dryRec.ondataavailable = (e) => {
        if (e.data.size > 0) dryChunksRef.current.push(e.data);
      };
      dryDoneRef.current = new Promise<void>((resolve) => {
        dryRec.onstop = () => resolve();
      });
    }
    rec.onstop = async () => {
      setIsProcessing(true);
      await dryDoneRef.current;
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      try {
        const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        if (buffer.duration < MIN_TAKE_S) {
          setError("that one was too short to keep");
          return;
        }
        const dryBlob = dryChunksRef.current.length
          ? new Blob(dryChunksRef.current, { type: mime || "audio/webm" })
          : null;
        const take: Take = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          seq: ++seqRef.current,
          blob,
          dryBlob,
          peaks: computePeaks(buffer),
          duration: buffer.duration,
          presetIdx: presetIdxRef.current,
          params: { ...liveParamsRef.current },
          backing: recBackingRef.current,
          createdAt: Date.now(),
        };
        wetRef.current.set(take.id, buffer);
        setTakes((prev) => {
          const next = [take, ...prev].slice(0, MAX_TAKES);
          const kept = new Set(next.map((t) => t.id));
          for (const id of [...wetRef.current.keys()]) if (!kept.has(id)) wetRef.current.delete(id);
          for (const id of [...dryRef.current.keys()]) if (!kept.has(id)) dryRef.current.delete(id);
          return next;
        });
        setActiveTakeId(take.id);
        setError(null);
      } catch {
        setError("could not process the recording, try again");
      } finally {
        setIsProcessing(false);
      }
    };
    rec.start();
    dryRec?.start();
    recBackingRef.current = backingRef?.current?.() ?? null;
    recorderRef.current = rec;
    dryRecorderRef.current = dryRec;
    recStartRef.current = performance.now();
    recordingRef.current = true;
    setIsRecording(true);
    recTimeoutRef.current = window.setTimeout(stopRecording, MAX_REC_MS);
  }, [ensureAudio, ctxRef, destRef, dryDestRef, backingRef, playingId, stopRecording, stopSource]);

  const applyLive = useCallback(
    (rig: number, signal: SignalParams) => {
      const ctx = ctxRef.current;
      const chain = chainRef.current;
      if (ctx && chain && chain.rig === rig)
        applyChainParams(ctx, chain.nodes, { ...signal, presetIdx: rig }, 0.02);
    },
    [ctxRef],
  );

  const setRig = useCallback(
    async (target: number, id?: string) => {
      const take = takes.find((t) => t.id === (id ?? activeTakeId));
      if (!take) return;
      const recorded = take.presetIdx ?? 0;
      if (target !== recorded && !take.dryBlob) {
        setError("this take has no dry signal to re-amp");
        return;
      }
      const base =
        target === recorded || target === CLEAN_RIG ? take.params : signalOf(rigAt(target).knobs);
      setRigByTake((prev) => ({ ...prev, [take.id]: target }));
      setParamsByTake((prev) => ({ ...prev, [take.id]: base }));
      setError(null);
      if (playingId === take.id)
        await startPlayback(take, getPlayPosition(), { rig: target, params: base });
    },
    [takes, activeTakeId, playingId, startPlayback, getPlayPosition],
  );

  const setTakeParam = useCallback(
    (key: keyof SignalParams, value: number) => {
      const take = takes.find((t) => t.id === activeTakeId);
      if (!take) return;
      const rig = rigByTake[take.id] ?? take.presetIdx ?? 0;
      const current = paramsByTake[take.id] ?? take.params;
      const next = { ...current, [key]: Math.max(0, Math.min(1, value)) };
      setParamsByTake((prev) => ({ ...prev, [take.id]: next }));
      applyLive(rig, next);
    },
    [takes, activeTakeId, rigByTake, paramsByTake, applyLive],
  );

  const resetTakeParams = useCallback(() => {
    const take = takes.find((t) => t.id === activeTakeId);
    if (!take) return;
    const rig = rigByTake[take.id] ?? take.presetIdx ?? 0;
    const base =
      rig === (take.presetIdx ?? 0) || rig === CLEAN_RIG ? take.params : signalOf(rigAt(rig).knobs);
    setParamsByTake((prev) => ({ ...prev, [take.id]: base }));
    applyLive(rig, base);
  }, [takes, activeTakeId, rigByTake, applyLive]);

  const bounceTake = useCallback(
    async (id?: string): Promise<AudioBuffer | null> => {
      const take = takes.find((t) => t.id === (id ?? activeTakeId));
      const ctx = ctxRef.current;
      if (!take || !ctx) return null;
      const rig = rigByTake[take.id] ?? take.presetIdx ?? 0;
      const signal = paramsByTake[take.id] ?? take.params;
      const region = regionByTake[take.id] ?? { start: 0, end: take.duration };
      const whole = region.start <= 0.001 && region.end >= take.duration - 0.001;
      const untouched = rig === (take.presetIdx ?? 0) && sameParams(signal, take.params);

      const wet = untouched ? await decodeWet(take) : null;
      const dry = wet ? null : await decodeDry(take);
      if (!wet && !dry) {
        setError("could not read that take");
        return null;
      }
      const backing = backingOn[take.id] ? take.backing : null;
      if (wet && !backing && whole) return wet;
      return renderTake({
        rate: ctx.sampleRate,
        wet,
        dry,
        presetIdx: rig,
        params: signal,
        backing,
        region,
      });
    },
    [
      takes,
      activeTakeId,
      ctxRef,
      rigByTake,
      paramsByTake,
      regionByTake,
      backingOn,
      decodeWet,
      decodeDry,
    ],
  );

  useEffect(() => {
    bounceTakeRef.current = bounceTake;
  }, [bounceTake]);

  const downloadTake = useCallback(
    async (id?: string) => {
      const take = takes.find((t) => t.id === (id ?? activeTakeId));
      if (!take || isExporting) return;

      setIsExporting(true);
      try {
        const buffer = await bounceTake(take.id);
        if (!buffer) return;

        let blob: Blob;
        let ext: string;
        try {
          blob = await encodeMp3(buffer);
          ext = "mp3";
        } catch {
          blob = encodeWav(buffer);
          ext = "wav";
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ghostfx-take-${new Date(take.createdAt).toISOString().slice(11, 19).replace(/:/g, "")}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        setError("could not export that take");
      } finally {
        setIsExporting(false);
      }
    },
    [takes, activeTakeId, isExporting, bounceTake],
  );

  useEffect(() => {
    return () => {
      if (recTimeoutRef.current) clearTimeout(recTimeoutRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      for (const src of [sourceRef.current, backingSourceRef.current]) {
        if (!src) continue;
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
    takes,
    activeTake,
    activeTakeId,
    isRecording,
    isProcessing,
    isExporting,
    playingId,
    error,
    toggleRecording,
    togglePlay,
    pause,
    seek,
    selectTake,
    deleteTake,
    cutTake,
    downloadTake,
    bounceTake,
    getPlayPosition,
    getRecordElapsed,
    setRig,
    setTakeParam,
    setTakeRegion,
    setLooping,
    looping,
    snapshot,
    renameTake,
    resetTakeParams,
    rigOf: (id: string, fallback: number) => rigByTake[id] ?? fallback,
    activeRig,
    activeParams,
    activeEdited,
    activeBacking,
    activeBackingOn,
    toggleBacking,
    activePeaks,
    activeDuration,
    activeRegion,
    activeTrimmed,
    nameOf: (take: Take, rig: number) => nameByTake[take.id] ?? `${rigMeta(rig).name} ${take.seq}`,
    regionOf: (take: Take): Region => regionByTake[take.id] ?? { start: 0, end: take.duration },
  };
}
