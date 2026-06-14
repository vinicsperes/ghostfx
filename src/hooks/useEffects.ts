import { useCallback, useEffect, useRef, useState } from "react";
import { createDistortionCurve, mapDrivePreGain, mapDelayTime, mapFeedback } from "../audio/dsp";

export type EffectsState = "idle" | "bypass" | "active";

type EffectsApi = {
  state: EffectsState;
  ready: boolean;
  error: string | null;
  micBlocked: boolean;
  toggle: () => Promise<void>;
  getLevel: () => number;
  getWaveform: () => Float32Array;
};

export function useEffects({
  drive,
  echo,
  tone,
  reverb,
  masterVolume = 0.8,
}: {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  masterVolume?: number;
}): EffectsApi {
  const [state, setState] = useState<EffectsState>("idle");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const guardIntervalRef = useRef<number | null>(null);

  const nodesRef = useRef<{
    preGain: GainNode | null;
    drive: WaveShaperNode | null;
    toneFilter: BiquadFilterNode | null;
    delay: DelayNode | null;
    lfoGain: GainNode | null;
    feedback: GainNode | null;
    wet: GainNode | null;
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
    reverbWet: null,
    bypass: null,
    effects: null,
    masterGain: null,
  });

  const init = useCallback(async () => {
    if (ctxRef.current) return;

    try {
      const ctx = new AudioContext({ latencyHint: "balanced" });
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

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1.5;
      limiter.knee.value = 3;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.1;

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

      masterGain.connect(limiter);
      limiter.connect(analyser);
      analyser.connect(ctx.destination);

      nodesRef.current = {
        preGain,
        drive: driveNode,
        toneFilter,
        delay: delayNode,
        lfoGain,
        feedback: feedbackGain,
        wet: wetGain,
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
  }, [drive, echo, tone, reverb]);

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
    const { masterGain } = nodesRef.current;
    if (masterGain && ctxRef.current && state !== "idle")
      masterGain.gain.setTargetAtTime(masterVolume, ctxRef.current.currentTime, 0.05);
  }, [masterVolume, state]);

  useEffect(() => {
    if (state !== "active") {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
      return;
    }

    const checkFeedback = () => {
      const analyser = analyserRef.current;
      if (!analyser || !ctxRef.current) return;
      const buffer = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buffer);
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > peak) peak = abs;
      }
      if (peak > 0.98) {
        const { masterGain } = nodesRef.current;
        if (masterGain && ctxRef.current) {
          masterGain.gain.cancelScheduledValues(ctxRef.current.currentTime);
          masterGain.gain.value = 0;
          setState("bypass");
          setError("FEEDBACK PROTECTION: Audio muted. Please use headphones.");
        }
      }
    };

    guardIntervalRef.current = window.setInterval(checkFeedback, 100);
    return () => { if (guardIntervalRef.current) clearInterval(guardIntervalRef.current); };
  }, [state]);

  const toggle = useCallback(async () => {
    if (!ctxRef.current) await init();
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const t = ctx.currentTime;
    const { bypass, effects, masterGain } = nodesRef.current;

    if (state === "idle" || state === "bypass") {
      setError(null);
      masterGain?.gain.setTargetAtTime(0.8, t, 0.1);
      bypass?.gain.setTargetAtTime(0, t, 0.02);
      effects?.gain.setTargetAtTime(1, t, 0.02);
      setState("active");
    } else {
      bypass?.gain.setTargetAtTime(1, t, 0.02);
      effects?.gain.setTargetAtTime(0, t, 0.02);
      setState("bypass");
    }
  }, [state, init]);

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

  return { state, ready, error, micBlocked, toggle, getLevel, getWaveform };
}
