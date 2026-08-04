import { useCallback, useEffect, useRef, useState } from "react";
import { computePeaks, encodeMp3, encodeWav } from "../audio/encode";
import { masterGainFromKnob } from "../audio/dsp";

export type Take = {
  id: string;
  blob: Blob;
  peaks: Float32Array;
  duration: number;
  presetIdx: number | null;
  createdAt: number;
};

export const MAX_REC_MS = 180000;
export const WARN_REC_MS = 10000;
const MAX_TAKES = 12;

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useRecorder({
  ctxRef,
  destRef,
  ensureAudio,
  presetIdx,
  masterVolume,
}: {
  ctxRef: React.RefObject<AudioContext | null>;
  destRef: React.RefObject<MediaStreamAudioDestinationNode | null>;
  ensureAudio: () => Promise<void>;
  presetIdx: number | null;
  masterVolume: number;
}) {
  const [takes, setTakes] = useState<Take[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimeoutRef = useRef<number | null>(null);
  const recStartRef = useRef(0);
  const recordingRef = useRef(false);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playGainRef = useRef<GainNode | null>(null);
  const playStartRef = useRef(0);
  const playOffsetRef = useRef(0);
  const cacheRef = useRef<{ id: string; buffer: AudioBuffer } | null>(null);

  const presetIdxRef = useRef(presetIdx);
  const masterVolumeRef = useRef(masterVolume);
  useEffect(() => {
    presetIdxRef.current = presetIdx;
  }, [presetIdx]);
  useEffect(() => {
    masterVolumeRef.current = masterVolume;
    const ctx = ctxRef.current;
    if (playGainRef.current && ctx)
      playGainRef.current.gain.setTargetAtTime(
        masterGainFromKnob(masterVolume),
        ctx.currentTime,
        0.05,
      );
  }, [masterVolume, ctxRef]);

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? null;
  const activeDuration = activeTake?.duration ?? 0;

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
    const ctx = ctxRef.current;
    if (ctx && sourceRef.current) {
      const at = ctx.currentTime - playStartRef.current;
      playOffsetRef.current = Math.max(0, at);
    }
    stopSource();
    setPlayingId(null);
  }, [ctxRef, stopSource]);

  const decodeTake = useCallback(
    async (take: Take): Promise<AudioBuffer | null> => {
      if (cacheRef.current?.id === take.id) return cacheRef.current.buffer;
      const ctx = ctxRef.current;
      if (!ctx) return null;
      try {
        const buffer = await ctx.decodeAudioData(await take.blob.arrayBuffer());
        cacheRef.current = { id: take.id, buffer };
        return buffer;
      } catch {
        setError("could not read that take");
        return null;
      }
    },
    [ctxRef],
  );

  const startPlayback = useCallback(
    async (take: Take, offset: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();
      const buffer = await decodeTake(take);
      if (!buffer) return;

      stopSource();
      if (!playGainRef.current) {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        playGainRef.current = gain;
      }
      playGainRef.current.gain.value = masterGainFromKnob(masterVolumeRef.current);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(playGainRef.current);
      src.onended = () => {
        if (sourceRef.current !== src) return;
        sourceRef.current = null;
        playOffsetRef.current = 0;
        setPlayingId(null);
      };
      const from = offset >= buffer.duration - 0.02 ? 0 : offset;
      src.start(0, from);
      sourceRef.current = src;
      playStartRef.current = ctx.currentTime - from;
      playOffsetRef.current = from;
      setPlayingId(take.id);
    },
    [ctxRef, decodeTake, stopSource],
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

  const seek = useCallback(
    async (seconds: number) => {
      if (!activeTake) return;
      const at = Math.max(0, Math.min(activeTake.duration, seconds));
      playOffsetRef.current = at;
      if (playingId === activeTake.id) await startPlayback(activeTake, at);
    },
    [activeTake, playingId, startPlayback],
  );

  const getPlayPosition = useCallback(() => {
    const ctx = ctxRef.current;
    if (sourceRef.current && ctx) {
      return Math.min(activeDuration, Math.max(0, ctx.currentTime - playStartRef.current));
    }
    return playOffsetRef.current;
  }, [ctxRef, activeDuration]);

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
      if (cacheRef.current?.id === id) cacheRef.current = null;
      if (playingId === id) {
        stopSource();
        setPlayingId(null);
      }
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
    recordingRef.current = false;
    setIsRecording(false);
  }, []);

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

    stopSource();
    setPlayingId(null);
    playOffsetRef.current = 0;

    const mime = pickMime();
    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      setIsProcessing(true);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      try {
        const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        const take: Take = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          blob,
          peaks: computePeaks(buffer),
          duration: buffer.duration,
          presetIdx: presetIdxRef.current,
          createdAt: Date.now(),
        };
        cacheRef.current = { id: take.id, buffer };
        setTakes((prev) => [take, ...prev].slice(0, MAX_TAKES));
        setActiveTakeId(take.id);
        setError(null);
      } catch {
        setError("could not process the recording, try again");
      } finally {
        setIsProcessing(false);
      }
    };
    rec.start();
    recorderRef.current = rec;
    recStartRef.current = performance.now();
    recordingRef.current = true;
    setIsRecording(true);
    recTimeoutRef.current = window.setTimeout(stopRecording, MAX_REC_MS);
  }, [ensureAudio, ctxRef, destRef, stopRecording, stopSource]);

  const downloadTake = useCallback(
    async (id?: string) => {
      const take = takes.find((t) => t.id === (id ?? activeTakeId));
      if (!take) return;
      const buffer = await decodeTake(take);
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
    },
    [takes, activeTakeId, decodeTake],
  );

  useEffect(() => {
    return () => {
      if (recTimeoutRef.current) clearTimeout(recTimeoutRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
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
    takes,
    activeTake,
    activeTakeId,
    isRecording,
    isProcessing,
    playingId,
    error,
    toggleRecording,
    togglePlay,
    seek,
    selectTake,
    deleteTake,
    downloadTake,
    getPlayPosition,
    getRecordElapsed,
  };
}
