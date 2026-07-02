import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDistortionCurve,
  driveOversample,
  mapDrivePreGain,
  createLimiterCurve,
  createTapeCurve,
  createReverbIR,
} from "../audio/dsp";
import { CABS, DELAYS, DRIVES, MODS, REVERBS } from "../data/presets";

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

const MAX_REC_MS = 30000;

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

function encodeWav(buf: AudioBuffer): Blob {
  const numCh = Math.min(buf.numberOfChannels, 2);
  const sr = buf.sampleRate;
  const len = buf.length;
  const blockAlign = numCh * 2;
  const dataSize = len * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(out);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  dv.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE");
  str(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * blockAlign, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, 16, true);
  str(36, "data");
  dv.setUint32(40, dataSize, true);
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

async function encodeMp3(buf: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const ch = buf.getChannelData(0);
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
  mod,
  masterVolume = 0.8,
  presetIdx = 0,
}: {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  mod: number;
  masterVolume?: number;
  presetIdx?: number | null;
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
  const feedbackLatchRef = useRef(false);
  const guardBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const irBuffersRef = useRef<AudioBuffer[]>([]);
  const activeConvRef = useRef<"A" | "B">("A");
  const convUnloadRef = useRef<number | null>(null);

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
    preFilter: BiquadFilterNode | null;
    midEmphasis: BiquadFilterNode | null;
    preGain: GainNode | null;
    drive: WaveShaperNode | null;
    cabHP: BiquadFilterNode | null;
    cabBody: BiquadFilterNode | null;
    cabPres: BiquadFilterNode | null;
    cabLP: BiquadFilterNode | null;
    toneFilter: BiquadFilterNode | null;
    delay: DelayNode | null;
    lfoGain: GainNode | null;
    feedback: GainNode | null;
    delayLoopHP: BiquadFilterNode | null;
    delayLoopLP: BiquadFilterNode | null;
    delaySat: WaveShaperNode | null;
    wet: GainNode | null;
    modDelay: DelayNode | null;
    modLfo: OscillatorNode | null;
    modDepth: GainNode | null;
    modDamp: BiquadFilterNode | null;
    modFb: GainNode | null;
    modWet: GainNode | null;
    reverbPre: DelayNode | null;
    convolverA: ConvolverNode | null;
    convolverB: ConvolverNode | null;
    reverbWetA: GainNode | null;
    reverbWetB: GainNode | null;
    reverbWet: GainNode | null;
    bypass: GainNode | null;
    effects: GainNode | null;
    masterGain: GainNode | null;
  }>({
    preFilter: null,
    midEmphasis: null,
    preGain: null,
    drive: null,
    cabHP: null,
    cabBody: null,
    cabPres: null,
    cabLP: null,
    toneFilter: null,
    delay: null,
    lfoGain: null,
    feedback: null,
    delayLoopHP: null,
    delayLoopLP: null,
    delaySat: null,
    wet: null,
    modDelay: null,
    modLfo: null,
    modDepth: null,
    modDamp: null,
    modFb: null,
    modWet: null,
    reverbPre: null,
    convolverA: null,
    convolverB: null,
    reverbWetA: null,
    reverbWetB: null,
    reverbWet: null,
    bypass: null,
    effects: null,
    masterGain: null,
  });

  const init = useCallback(async () => {
    if (ctxRef.current) return;

    try {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      ctxRef.current = ctx;
      ctx.onstatechange = () => {
        if (ctx.state === "suspended" && !feedbackLatchRef.current) ctx.resume();
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((tr) => {
        tr.onended = () => setError("microphone track ended");
      });

      const src = ctx.createMediaStreamSource(stream);

      const monoSum = ctx.createGain();
      monoSum.channelCount = 1;
      monoSum.channelCountMode = "explicit";

      const dp = DRIVES[presetIdx ?? 0] ?? DRIVES[0];

      const preFilter = ctx.createBiquadFilter();
      preFilter.type = "highpass";
      preFilter.frequency.value = dp.preHp;

      const midEmphasis = ctx.createBiquadFilter();
      midEmphasis.type = "peaking";
      midEmphasis.frequency.value = dp.midHz;
      midEmphasis.Q.value = 0.7;
      midEmphasis.gain.value = dp.midGain;

      const preGain = ctx.createGain();
      preGain.gain.value = mapDrivePreGain(drive);

      const driveNode = ctx.createWaveShaper();
      driveNode.curve = createDistortionCurve(drive, dp.shape);
      driveNode.oversample = driveOversample(drive, dp.shape);

      const cab = CABS[presetIdx ?? 0] ?? CABS[0];
      const cabHP = ctx.createBiquadFilter();
      cabHP.type = "highpass";
      cabHP.frequency.value = cab.lowCut;
      cabHP.Q.value = 0.707;
      const cabBody = ctx.createBiquadFilter();
      cabBody.type = "peaking";
      cabBody.frequency.value = cab.bodyHz;
      cabBody.Q.value = 0.9;
      cabBody.gain.value = cab.bodyGain;
      const cabPres = ctx.createBiquadFilter();
      cabPres.type = "peaking";
      cabPres.frequency.value = cab.presHz;
      cabPres.Q.value = 1.0;
      cabPres.gain.value = cab.presGain;
      const cabLP = ctx.createBiquadFilter();
      cabLP.type = "lowpass";
      cabLP.frequency.value = cab.topCut;
      cabLP.Q.value = 0.9;

      const toneFilter = ctx.createBiquadFilter();
      toneFilter.type = "lowpass";
      toneFilter.frequency.value = 500 * Math.pow(16, tone);

      const dl = DELAYS[presetIdx ?? 0] ?? DELAYS[0];

      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.value = dl.timeMin + echo * (dl.timeMax - dl.timeMin);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.85;
      lfoGain.gain.value = 0.002 * echo;
      lfo.connect(lfoGain);
      lfoGain.connect(delayNode.delayTime);
      lfo.start();

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.value = dl.fbMin + echo * (dl.fbMax - dl.fbMin);

      const delayLoopHP = ctx.createBiquadFilter();
      delayLoopHP.type = "highpass";
      delayLoopHP.frequency.value = dl.loopHp;
      delayLoopHP.Q.value = 0.707;
      const delayLoopLP = ctx.createBiquadFilter();
      delayLoopLP.type = "lowpass";
      delayLoopLP.frequency.value = dl.loopLp;
      delayLoopLP.Q.value = 0.707;
      const delaySat = ctx.createWaveShaper();
      delaySat.curve = createTapeCurve(dl.sat);
      delaySat.oversample = "none";

      const wetGain = ctx.createGain();
      wetGain.gain.value = echo * 0.5;

      const mp = MODS[presetIdx ?? 0] ?? MODS[0];
      const modDelay = ctx.createDelay(0.05);
      modDelay.delayTime.value = mp.base;
      const modLfo = ctx.createOscillator();
      modLfo.type = "sine";
      modLfo.frequency.value = mp.rate;
      const modDepth = ctx.createGain();
      modDepth.gain.value = mp.depthMin + mod * (mp.depthMax - mp.depthMin);
      modLfo.connect(modDepth);
      modDepth.connect(modDelay.delayTime);
      modLfo.start();
      const modDamp = ctx.createBiquadFilter();
      modDamp.type = "lowpass";
      modDamp.frequency.value = mp.damp;
      const modFb = ctx.createGain();
      modFb.gain.value = mod * mp.fbMax;
      const modWet = ctx.createGain();
      modWet.gain.value = mod * mp.mixMax;

      const reverbIdx = presetIdx ?? 0;
      irBuffersRef.current = REVERBS.map((r) => {
        const [l, rr] = createReverbIR(ctx.sampleRate, r.decay, r.tone, r.width);
        const buf = ctx.createBuffer(2, l.length, ctx.sampleRate);
        buf.copyToChannel(l, 0);
        buf.copyToChannel(rr, 1);
        return buf;
      });

      const reverbPre = ctx.createDelay(0.2);
      reverbPre.delayTime.value = REVERBS[reverbIdx].predelay;

      const convolverA = ctx.createConvolver();
      convolverA.normalize = true;
      convolverA.buffer = irBuffersRef.current[reverbIdx];
      const convolverB = ctx.createConvolver();
      convolverB.normalize = true;

      const reverbWetA = ctx.createGain();
      reverbWetA.gain.value = 1;
      const reverbWetB = ctx.createGain();
      reverbWetB.gain.value = 0;

      const reverbWet = ctx.createGain();
      reverbWet.gain.value = reverb * 0.5;

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
      driveNode.connect(cabHP);
      cabHP.connect(cabBody);
      cabBody.connect(cabPres);
      cabPres.connect(cabLP);
      cabLP.connect(toneFilter);

      toneFilter.connect(effectsGain);

      toneFilter.connect(delayNode);
      delayNode.connect(delayLoopHP);
      delayLoopHP.connect(delayLoopLP);
      delayLoopLP.connect(delaySat);
      delaySat.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      delaySat.connect(wetGain);
      wetGain.connect(effectsGain);

      toneFilter.connect(modDelay);
      modDelay.connect(modDamp);
      modDamp.connect(modFb);
      modFb.connect(modDelay);
      modDamp.connect(modWet);
      modWet.connect(effectsGain);

      toneFilter.connect(reverbPre);
      reverbPre.connect(convolverA);
      reverbPre.connect(convolverB);
      convolverA.connect(reverbWetA);
      convolverB.connect(reverbWetB);
      reverbWetA.connect(reverbWet);
      reverbWetB.connect(reverbWet);
      reverbWet.connect(effectsGain);

      bypassGain.connect(masterGain);
      effectsGain.connect(masterGain);

      masterGain.connect(analyser);
      masterGain.connect(limiter);
      limiter.connect(ctx.destination);

      const recordDest = ctx.createMediaStreamDestination();
      limiter.connect(recordDest);
      recordDestRef.current = recordDest;

      nodesRef.current = {
        preFilter,
        midEmphasis,
        preGain,
        drive: driveNode,
        cabHP,
        cabBody,
        cabPres,
        cabLP,
        toneFilter,
        delay: delayNode,
        lfoGain,
        feedback: feedbackGain,
        delayLoopHP,
        delayLoopLP,
        delaySat,
        wet: wetGain,
        modDelay,
        modLfo,
        modDepth,
        modDamp,
        modFb,
        modWet,
        reverbPre,
        convolverA,
        convolverB,
        reverbWetA,
        reverbWetB,
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
      try {
        await ctxRef.current?.close();
      } catch {}
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
  }, [drive, echo, tone, reverb, mod, presetIdx]);

  useEffect(() => {
    const { drive: driveNode, preGain, preFilter, midEmphasis } = nodesRef.current;
    const dp = DRIVES[presetIdx ?? 0] ?? DRIVES[0];
    if (driveNode) {
      driveNode.curve = createDistortionCurve(drive, dp.shape);
      driveNode.oversample = driveOversample(drive, dp.shape);
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    preGain?.gain.setTargetAtTime(mapDrivePreGain(drive), t, 0.05);
    preFilter?.frequency.setTargetAtTime(dp.preHp, t, 0.05);
    midEmphasis?.frequency.setTargetAtTime(dp.midHz, t, 0.05);
    midEmphasis?.gain.setTargetAtTime(dp.midGain, t, 0.05);
  }, [drive, presetIdx]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { delay, lfoGain, feedback, delayLoopHP, delayLoopLP, delaySat, wet } = nodesRef.current;
    const dl = DELAYS[presetIdx ?? 0] ?? DELAYS[0];
    const t = ctx.currentTime;
    delay?.delayTime.setTargetAtTime(dl.timeMin + echo * (dl.timeMax - dl.timeMin), t, 0.05);
    lfoGain?.gain.setTargetAtTime(0.003 * echo, t, 0.05);
    feedback?.gain.setTargetAtTime(dl.fbMin + echo * (dl.fbMax - dl.fbMin), t, 0.05);
    delayLoopHP?.frequency.setTargetAtTime(dl.loopHp, t, 0.05);
    delayLoopLP?.frequency.setTargetAtTime(dl.loopLp, t, 0.05);
    if (delaySat) delaySat.curve = createTapeCurve(dl.sat);
    wet?.gain.setTargetAtTime(echo * 0.5, t, 0.05);
  }, [echo, presetIdx]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { toneFilter } = nodesRef.current;
    toneFilter?.frequency.setTargetAtTime(500 * Math.pow(16, tone), ctx.currentTime, 0.05);
  }, [tone]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { cabHP, cabBody, cabPres, cabLP } = nodesRef.current;
    const cab = CABS[presetIdx ?? 0] ?? CABS[0];
    const t = ctx.currentTime;
    cabHP?.frequency.setTargetAtTime(cab.lowCut, t, 0.05);
    cabBody?.frequency.setTargetAtTime(cab.bodyHz, t, 0.05);
    cabBody?.gain.setTargetAtTime(cab.bodyGain, t, 0.05);
    cabPres?.frequency.setTargetAtTime(cab.presHz, t, 0.05);
    cabPres?.gain.setTargetAtTime(cab.presGain, t, 0.05);
    cabLP?.frequency.setTargetAtTime(cab.topCut, t, 0.05);
  }, [presetIdx]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const idx = presetIdx ?? 0;
    const buf = irBuffersRef.current[idx];
    const { convolverA, convolverB, reverbWetA, reverbWetB, reverbPre } = nodesRef.current;
    if (!buf || !convolverA || !convolverB || !reverbWetA || !reverbWetB) return;
    const t = ctx.currentTime;
    reverbPre?.delayTime.setTargetAtTime(REVERBS[idx].predelay, t, 0.05);
    if (activeConvRef.current === "A") {
      convolverB.buffer = buf;
      reverbWetB.gain.setTargetAtTime(1, t, 0.06);
      reverbWetA.gain.setTargetAtTime(0, t, 0.06);
      activeConvRef.current = "B";
    } else {
      convolverA.buffer = buf;
      reverbWetA.gain.setTargetAtTime(1, t, 0.06);
      reverbWetB.gain.setTargetAtTime(0, t, 0.06);
      activeConvRef.current = "A";
    }
    convUnloadRef.current = window.setTimeout(() => {
      const inactive =
        activeConvRef.current === "A" ? nodesRef.current.convolverB : nodesRef.current.convolverA;
      if (inactive) inactive.buffer = null;
    }, 900);
    return () => {
      if (convUnloadRef.current) clearTimeout(convUnloadRef.current);
    };
  }, [presetIdx]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { reverbWet } = nodesRef.current;
    reverbWet?.gain.setTargetAtTime(reverb * 0.5, ctx.currentTime, 0.05);
  }, [reverb]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { modLfo, modDelay, modDepth, modDamp, modFb, modWet } = nodesRef.current;
    const mp = MODS[presetIdx ?? 0] ?? MODS[0];
    const t = ctx.currentTime;
    modLfo?.frequency.setTargetAtTime(mp.rate, t, 0.1);
    modDelay?.delayTime.setTargetAtTime(mp.base, t, 0.1);
    modDamp?.frequency.setTargetAtTime(mp.damp, t, 0.05);
    modDepth?.gain.setTargetAtTime(mp.depthMin + mod * (mp.depthMax - mp.depthMin), t, 0.05);
    modFb?.gain.setTargetAtTime(mod * mp.fbMax, t, 0.05);
    modWet?.gain.setTargetAtTime(mod * mp.mixMax, t, 0.05);
  }, [mod, presetIdx]);

  useEffect(() => {
    if (feedbackLatchRef.current) return;
    const { masterGain } = nodesRef.current;
    if (masterGain && ctxRef.current && state !== "idle")
      masterGain.gain.setTargetAtTime(masterVolume, ctxRef.current.currentTime, 0.05);
  }, [masterVolume, state]);

  useEffect(() => {
    if (state !== "active" && state !== "bypass") {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
      return;
    }
    let over = 0;
    const RMS_TRIP = 0.5;
    const TRIP_CHECKS = 6;

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
      const { masterGain } = nodesRef.current;
      masterGain?.gain.cancelScheduledValues(ctx.currentTime);
      masterGain?.gain.setValueAtTime(0, ctx.currentTime);
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      ctx.suspend();
      setState("bypass");
      setFeedbackBlocked(true);
      setError(null);
    };

    guardIntervalRef.current = window.setInterval(checkFeedback, 100);
    return () => {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
    };
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
    if (feedbackLatchRef.current) {
      resumeFromFeedback();
      return;
    }
    if (!ctxRef.current) await init();
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const t = ctx.currentTime;
    const { bypass, effects, masterGain } = nodesRef.current;

    if (state === "idle" || state === "bypass") {
      setError(null);
      streamRef.current?.getAudioTracks().forEach((tr) => {
        tr.enabled = true;
      });
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
    if (recTimeoutRef.current) {
      clearTimeout(recTimeoutRef.current);
      recTimeoutRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (!ctxRef.current) await init();
    const ctx = ctxRef.current;
    const dest = recordDestRef.current;
    if (!ctx || !dest) return;
    if (ctx.state === "suspended") await ctx.resume();

    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    const mime =
      typeof MediaRecorder !== "undefined"
        ? (candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "")
        : "";

    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      try {
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
        recordedBufferRef.current = buf;
        recordedPeaksRef.current = computePeaks(buf);
        setRecordedDuration(buf.duration);
        setHasRecording(true);
      } catch {}
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
    try {
      blob = await encodeMp3(buf);
      ext = "mp3";
    } catch {
      blob = encodeWav(buf);
      ext = "wav";
    }
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
    state,
    ready,
    error,
    micBlocked,
    toggle,
    getLevel,
    getWaveform,
    isRecording,
    hasRecording,
    recordedDuration,
    toggleRecording,
    downloadRecording,
    getRecordedPeaks,
    feedbackBlocked,
    resumeFromFeedback,
  };
}
