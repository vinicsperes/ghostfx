import { useCallback, useEffect, useRef, useState } from "react";
import { createDistortionCurve, mapDrivePreGain, mapDelayTime, mapFeedback, mapChorusDepth, mapChorusFb, mapChorusMix, createLimiterCurve } from "../audio/dsp";

export type EffectsState = "idle" | "bypass" | "active";

type EffectsApi = {
  state: EffectsState;
  ready: boolean;
  error: string | null;
  micBlocked: boolean;
  toggle: () => Promise<void>;
  getLevel: () => number;
  getWaveform: () => Float32Array;
  isRecording: boolean;
  hasRecording: boolean;
  recordedDuration: number;
  toggleRecording: () => Promise<void>;
  downloadRecording: () => void;
  getRecordedPeaks: () => Float32Array | null;
  feedbackBlocked: boolean;
  resumeFromFeedback: () => void;
};

const MAX_REC_MS = 30000; // 30s cap so nobody hogs memory / abuses

// max-abs peaks per bucket — drives the recorded-clip waveform
function computePeaks(buf: AudioBuffer, buckets = 360): Float32Array {
  const ch = buf.getChannelData(0);
  const block = Math.max(1, Math.floor(ch.length / buckets));
  const peaks = new Float32Array(buckets);
  for (let b = 0; b < buckets; b++) {
    let max = 0;
    const start = b * block;
    for (let i = 0; i < block && start + i < ch.length; i++) {
      const a = Math.abs(ch[start + i]);
      if (a > max) max = a;
    }
    peaks[b] = max;
  }
  return peaks;
}

// 16-bit PCM WAV from an AudioBuffer (universal, no dependency)
function encodeWav(buf: AudioBuffer): Blob {
  const numCh = Math.min(buf.numberOfChannels, 2);
  const sr = buf.sampleRate;
  const len = buf.length;
  const blockAlign = numCh * 2;
  const dataSize = len * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(out);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF"); dv.setUint32(4, 36 + dataSize, true); str(8, "WAVE");
  str(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * blockAlign, true); dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, dataSize, true);
  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}

// MP3 via lamejs — lazy-imported so it only loads on first download
async function encodeMp3(buf: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const ch = buf.getChannelData(0); // mono (the signal is mono-summed)
  const enc = new Mp3Encoder(1, buf.sampleRate, 128);
  const pcm = new Int16Array(ch.length);
  for (let i = 0; i < ch.length; i++) {
    const s = Math.max(-1, Math.min(1, ch[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const parts: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const mp3 = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (mp3.length > 0) parts.push(mp3);
  }
  const tail = enc.flush();
  if (tail.length > 0) parts.push(tail);
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}

export function useEffects({
  drive,
  echo,
  tone,
  reverb,
  chorus,
  masterVolume = 0.8,
}: {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  chorus: number;
  masterVolume?: number;
}): EffectsApi {
  const [state, setState] = useState<EffectsState>("idle");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [feedbackBlocked, setFeedbackBlocked] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const guardIntervalRef = useRef<number | null>(null);
  // when true, output is force-muted + mic track disabled until the user resumes;
  // the volume effect below must respect it (otherwise it instantly un-mutes)
  const feedbackLatchRef = useRef(false);
  const guardBufRef = useRef<Float32Array | null>(null);

  // recording (taps the post-limiter signal — the final processed sound)
  const recordDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBufferRef = useRef<AudioBuffer | null>(null);
  const recordedPeaksRef = useRef<Float32Array | null>(null);
  const recTimeoutRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const nodesRef = useRef<{
    preGain: GainNode | null;
    drive: WaveShaperNode | null;
    toneFilter: BiquadFilterNode | null;
    delay: DelayNode | null;
    lfoGain: GainNode | null;
    feedback: GainNode | null;
    wet: GainNode | null;
    chorusDelay: DelayNode | null;
    chorusDepth: GainNode | null;
    chorusFb: GainNode | null;
    chorusWet: GainNode | null;
    reverbWet: GainNode | null;
    bypass: GainNode | null;
    effects: GainNode | null;
    masterGain: GainNode | null;
  }>({
    preGain: null,
    drive: null,
    toneFilter: null,
    delay: null,
    lfoGain: null,
    feedback: null,
    wet: null,
    chorusDelay: null,
    chorusDepth: null,
    chorusFb: null,
    chorusWet: null,
    reverbWet: null,
    bypass: null,
    effects: null,
    masterGain: null,
  });

  const init = useCallback(async () => {
    if (ctxRef.current) return;

    try {
      // "interactive" = smallest output buffer the device allows → lowest
      // monitoring latency (this is a live guitar FX). A dedicated interface
      // handles the small buffer without glitching.
      const ctx = new AudioContext({ latencyHint: "interactive" });
      ctxRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      streamRef.current = stream;

      const src = ctx.createMediaStreamSource(stream);

      const monoSum = ctx.createGain();
      monoSum.channelCount = 1;
      monoSum.channelCountMode = "explicit";

      const preFilter = ctx.createBiquadFilter();
      preFilter.type = "highpass";
      preFilter.frequency.value = 140;

      const midEmphasis = ctx.createBiquadFilter();
      midEmphasis.type = "peaking";
      midEmphasis.frequency.value = 700;
      midEmphasis.Q.value = 0.8;
      midEmphasis.gain.value = 4;

      const preGain = ctx.createGain();
      preGain.gain.value = mapDrivePreGain(drive);

      const driveNode = ctx.createWaveShaper();
      driveNode.curve = createDistortionCurve(drive);
      driveNode.oversample = "2x";

      const toneFilter = ctx.createBiquadFilter();
      toneFilter.type = "lowpass";
      toneFilter.frequency.value = 500 * Math.pow(16, tone);

      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.value = mapDelayTime(echo);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.85;
      lfoGain.gain.value = 0.002 * echo;
      lfo.connect(lfoGain);
      lfoGain.connect(delayNode.delayTime);
      lfo.start();

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.value = mapFeedback(echo);

      const wetGain = ctx.createGain();
      wetGain.gain.value = echo * 0.5;

      // flanger (Electric Mistress / "Heart-Shaped Box" voiced): short modulated
      // delay with damped feedback for the resonant sweep, mixed wet
      const chorusDelay = ctx.createDelay(0.05);
      chorusDelay.delayTime.value = 0.0025;
      const chorusLfo = ctx.createOscillator();
      chorusLfo.type = "sine";
      chorusLfo.frequency.value = 0.4;
      const chorusDepth = ctx.createGain();
      chorusDepth.gain.value = mapChorusDepth(chorus);
      chorusLfo.connect(chorusDepth);
      chorusDepth.connect(chorusDelay.delayTime);
      chorusLfo.start();
      // low-pass the loop so the resonance sweeps instead of whistling
      const chorusDamp = ctx.createBiquadFilter();
      chorusDamp.type = "lowpass";
      chorusDamp.frequency.value = 2800;
      const chorusFb = ctx.createGain();
      chorusFb.gain.value = mapChorusFb(chorus);
      const chorusWet = ctx.createGain();
      chorusWet.gain.value = mapChorusMix(chorus);

      const reverbDamping = ctx.createBiquadFilter();
      reverbDamping.type = "lowpass";
      reverbDamping.frequency.value = 3200;

      const reverbDelay1 = ctx.createDelay(0.1);
      reverbDelay1.delayTime.value = 0.0233;
      const reverbFB1 = ctx.createGain();
      reverbFB1.gain.value = 0.72;

      const reverbDelay2 = ctx.createDelay(0.1);
      reverbDelay2.delayTime.value = 0.0371;
      const reverbFB2 = ctx.createGain();
      reverbFB2.gain.value = 0.68;

      const reverbDelay3 = ctx.createDelay(0.1);
      reverbDelay3.delayTime.value = 0.0531;
      const reverbFB3 = ctx.createGain();
      reverbFB3.gain.value = 0.64;

      const reverbWet = ctx.createGain();
      reverbWet.gain.value = reverb * 0.5;

      // zero-latency soft-clip limiter (a WaveShaper) — replaces a
      // DynamicsCompressor whose ~6ms lookahead was pure round-trip latency.
      // oversample "none" so it adds no latency of its own.
      const limiter = ctx.createWaveShaper();
      limiter.curve = createLimiterCurve();
      limiter.oversample = "none";

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const bypassGain = ctx.createGain();
      const effectsGain = ctx.createGain();
      bypassGain.gain.value = 1;
      effectsGain.gain.value = 0;

      src.connect(monoSum);
      monoSum.connect(bypassGain);
      monoSum.connect(preFilter);
      preFilter.connect(midEmphasis);
      midEmphasis.connect(preGain);
      preGain.connect(driveNode);
      driveNode.connect(toneFilter);

      toneFilter.connect(effectsGain);

      toneFilter.connect(delayNode);
      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      feedbackGain.connect(wetGain);
      wetGain.connect(effectsGain);

      toneFilter.connect(chorusDelay);
      chorusDelay.connect(chorusDamp);
      chorusDamp.connect(chorusFb);
      chorusFb.connect(chorusDelay);
      chorusDamp.connect(chorusWet);
      chorusWet.connect(effectsGain);

      toneFilter.connect(reverbDamping);

      reverbDamping.connect(reverbDelay1);
      reverbDelay1.connect(reverbFB1);
      reverbFB1.connect(reverbDelay1);
      reverbDelay1.connect(reverbWet);

      reverbDamping.connect(reverbDelay2);
      reverbDelay2.connect(reverbFB2);
      reverbFB2.connect(reverbDelay2);
      reverbDelay2.connect(reverbWet);

      reverbDamping.connect(reverbDelay3);
      reverbDelay3.connect(reverbFB3);
      reverbFB3.connect(reverbDelay3);
      reverbDelay3.connect(reverbWet);

      reverbWet.connect(effectsGain);

      bypassGain.connect(masterGain);
      effectsGain.connect(masterGain);

      // analyser taps PRE-limiter so the feedback guard sees the true (unlimited)
      // peak — the soft limiter caps output below the guard's 0.98 threshold.
      masterGain.connect(analyser);
      masterGain.connect(limiter);
      limiter.connect(ctx.destination);

      // parallel tap for the recorder (post-limiter = the final sound)
      const recordDest = ctx.createMediaStreamDestination();
      limiter.connect(recordDest);
      recordDestRef.current = recordDest;

      nodesRef.current = {
        preGain,
        drive: driveNode,
        toneFilter,
        delay: delayNode,
        lfoGain,
        feedback: feedbackGain,
        wet: wetGain,
        chorusDelay,
        chorusDepth,
        chorusFb,
        chorusWet,
        reverbWet,
        bypass: bypassGain,
        effects: effectsGain,
        masterGain,
      };

      setReady(true);
      setMicBlocked(false);
      setError(null);
      setState("bypass");
      masterGain.gain.setTargetAtTime(0.8, ctx.currentTime, 0.5);

    } catch (e) {
      try { await ctxRef.current?.close(); } catch { }
      ctxRef.current = null;

      const name = e instanceof DOMException ? e.name : "";
      const permissionDenied =
        name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError";

      if (permissionDenied) {
        setMicBlocked(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : "could not access microphone");
      }
    }
  }, [drive, echo, tone, reverb, chorus]);

  useEffect(() => {
    const { drive: driveNode, preGain } = nodesRef.current;
    if (driveNode) driveNode.curve = createDistortionCurve(drive);
    if (preGain && ctxRef.current)
      preGain.gain.setTargetAtTime(mapDrivePreGain(drive), ctxRef.current.currentTime, 0.05);
  }, [drive]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { delay, lfoGain, feedback, wet } = nodesRef.current;
    const t = ctx.currentTime;
    delay?.delayTime.setTargetAtTime(mapDelayTime(echo), t, 0.05);
    lfoGain?.gain.setTargetAtTime(0.003 * echo, t, 0.05);
    feedback?.gain.setTargetAtTime(mapFeedback(echo), t, 0.05);
    wet?.gain.setTargetAtTime(echo * 0.5, t, 0.05);
  }, [echo]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { toneFilter } = nodesRef.current;
    toneFilter?.frequency.setTargetAtTime(500 * Math.pow(16, tone), ctx.currentTime, 0.05);
  }, [tone]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { reverbWet } = nodesRef.current;
    reverbWet?.gain.setTargetAtTime(reverb * 0.5, ctx.currentTime, 0.05);
  }, [reverb]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { chorusDepth, chorusFb, chorusWet } = nodesRef.current;
    const t = ctx.currentTime;
    chorusDepth?.gain.setTargetAtTime(mapChorusDepth(chorus), t, 0.05);
    chorusFb?.gain.setTargetAtTime(mapChorusFb(chorus), t, 0.05);
    chorusWet?.gain.setTargetAtTime(mapChorusMix(chorus), t, 0.05);
  }, [chorus]);

  useEffect(() => {
    if (feedbackLatchRef.current) return; // stay muted while feedback-protected
    const { masterGain } = nodesRef.current;
    if (masterGain && ctxRef.current && state !== "idle")
      masterGain.gain.setTargetAtTime(masterVolume, ctxRef.current.currentTime, 0.05);
  }, [masterVolume, state]);

  // Feedback guard. Output is live in BOTH "active" and "bypass" (bypass still
  // routes the mic out), so watch both. Trip on *sustained* loudness — a single
  // loud note decays, acoustic feedback holds/grows — to avoid muting real
  // playing. On trip: latch muted + disable the mic track (kills the loop at the
  // source) + raise the educational modal; the user resumes deliberately.
  useEffect(() => {
    if (state !== "active" && state !== "bypass") {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
      return;
    }
    let over = 0;
    const RMS_TRIP = 0.5;   // sustained RMS above this = runaway (above a hot,
                            // wet preset's normal peaks; the limiter guards ears)
    const TRIP_CHECKS = 6;  // × 100ms = 0.6s held before muting

    const checkFeedback = () => {
      const analyser = analyserRef.current;
      const ctx = ctxRef.current;
      if (!analyser || !ctx || feedbackLatchRef.current) return;
      const buf = (guardBufRef.current ??= new Float32Array(analyser.fftSize));
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      over = rms > RMS_TRIP ? over + 1 : 0;
      if (over < TRIP_CHECKS) return;

      feedbackLatchRef.current = true;
      // belt + suspenders: mute output, cut the mic at the source, AND suspend the
      // whole audio thread (stops tails/loops too — nothing can leak through).
      const { masterGain } = nodesRef.current;
      masterGain?.gain.cancelScheduledValues(ctx.currentTime);
      masterGain?.gain.setValueAtTime(0, ctx.currentTime);
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
      ctx.suspend();
      setState("bypass");
      setFeedbackBlocked(true);
      setError(null);
    };

    guardIntervalRef.current = window.setInterval(checkFeedback, 100);
    return () => { if (guardIntervalRef.current) clearInterval(guardIntervalRef.current); };
  }, [state]);

  const resumeFromFeedback = useCallback(() => {
    const ctx = ctxRef.current;
    feedbackLatchRef.current = false;
    setFeedbackBlocked(false);
    setError(null);
    const off = () => {
      const { masterGain, bypass, effects } = nodesRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      masterGain?.gain.cancelScheduledValues(now);
      masterGain?.gain.setValueAtTime(0, now);
      bypass?.gain.setValueAtTime(1, now);
      effects?.gain.setValueAtTime(0, now);
    };
    if (ctx && ctx.state === "suspended") ctx.resume().then(off);
    else off();
    setState("idle");
  }, []);

  const toggle = useCallback(async () => {
    // if we're muted by the feedback guard, a stomp just safely re-arms
    if (feedbackLatchRef.current) { resumeFromFeedback(); return; }
    if (!ctxRef.current) await init();
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const t = ctx.currentTime;
    const { bypass, effects, masterGain } = nodesRef.current;

    if (state === "idle" || state === "bypass") {
      setError(null);
      streamRef.current?.getAudioTracks().forEach((tr) => { tr.enabled = true; });
      masterGain?.gain.setTargetAtTime(0.8, t, 0.1);
      bypass?.gain.setTargetAtTime(0, t, 0.02);
      effects?.gain.setTargetAtTime(1, t, 0.02);
      setState("active");
    } else {
      bypass?.gain.setTargetAtTime(1, t, 0.02);
      effects?.gain.setTargetAtTime(0, t, 0.02);
      setState("bypass");
    }
  }, [state, init, resumeFromFeedback]);

  useEffect(() => {
    return () => {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    };
  }, []);

  // buffers de leitura reutilizados — chamados a cada frame, alocar aqui vira lixo de GC
  const scratchRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const emptyRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const getWaveform = useCallback((): Float32Array => {
    const analyser = analyserRef.current;
    if (!analyser) return (emptyRef.current ??= new Float32Array(128));
    const buf = (scratchRef.current ??= new Float32Array(analyser.fftSize));
    analyser.getFloatTimeDomainData(buf);
    return buf;
  }, []);

  const getLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const buf = (scratchRef.current ??= new Float32Array(analyser.fftSize));
    analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const abs = Math.abs(buf[i]);
      if (abs > peak) peak = abs;
    }
    return Math.min(1, peak * 1.5);
  }, []);

  const stopRecording = useCallback(() => {
    if (recTimeoutRef.current) { clearTimeout(recTimeoutRef.current); recTimeoutRef.current = null; }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) { stopRecording(); return; }

    if (!ctxRef.current) await init();
    const ctx = ctxRef.current;
    const dest = recordDestRef.current;
    if (!ctx || !dest) return;
    if (ctx.state === "suspended") await ctx.resume();

    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    const mime =
      typeof MediaRecorder !== "undefined"
        ? candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
        : "";

    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      try {
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
        recordedBufferRef.current = buf;
        recordedPeaksRef.current = computePeaks(buf);
        setRecordedDuration(buf.duration);
        setHasRecording(true);
      } catch { /* decode failed — keep previous take */ }
    };
    rec.start();
    recorderRef.current = rec;
    setIsRecording(true);
    recTimeoutRef.current = window.setTimeout(stopRecording, MAX_REC_MS);
  }, [isRecording, init, stopRecording]);

  const downloadRecording = useCallback(async () => {
    const buf = recordedBufferRef.current;
    if (!buf) return;
    let blob: Blob, ext: string;
    try { blob = await encodeMp3(buf); ext = "mp3"; }
    catch { blob = encodeWav(buf); ext = "wav"; } // fallback if the encoder fails
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghostfx-take.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const getRecordedPeaks = useCallback(() => recordedPeaksRef.current, []);

  useEffect(() => {
    return () => {
      if (recTimeoutRef.current) clearTimeout(recTimeoutRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, []);

  return {
    state, ready, error, micBlocked, toggle, getLevel, getWaveform,
    isRecording, hasRecording, recordedDuration, toggleRecording, downloadRecording, getRecordedPeaks,
    feedbackBlocked, resumeFromFeedback,
  };
}
