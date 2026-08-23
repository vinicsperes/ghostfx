import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDistortionCurve,
  createLimiterCurve,
  createTapeCurve,
  driveOversample,
  mapDrivePreGain,
  masterGainFromKnob,
} from "../audio/dsp";
import { CABS, CLEAN_RIG, DELAYS, DRIVES, MODS, REVERBS } from "../data/presets";
import {
  buildChain,
  chorusOf,
  mixNorm,
  reverbBuffers,
  tremoloDepth,
  type ChainNodes,
} from "../audio/chain";
import type { Backing } from "../audio/render";
import { useRecorder } from "./useRecorder";

export type EffectsState = "idle" | "bypass" | "active";

type EffectsApi = {
  state: EffectsState;
  ready: boolean;
  error: string | null;
  micBlocked: boolean;
  toggle: () => Promise<void>;
  setBypass: (on: boolean) => Promise<void>;
  ctxRef: React.RefObject<AudioContext | null>;
  tapRef: React.RefObject<AudioNode | null>;
  ensureAudio: () => Promise<void>;
  getLevel: () => number;
  getWaveform: () => Float32Array;
  getMicWaveform: () => Float32Array;
  getSampleRate: () => number;
  feedbackBlocked: boolean;
  guardActive: boolean;
  resumeFromFeedback: () => void;
  recorder: ReturnType<typeof useRecorder>;
};

export function useEffects({
  drive,
  echo,
  tone,
  reverb,
  mod,
  masterVolume = 0.8,
  presetIdx = 0,
  backingRef,
}: {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  mod: number;
  masterVolume?: number;
  presetIdx?: number | null;
  backingRef?: React.RefObject<(() => Backing | null) | null>;
}): EffectsApi {
  const [state, setState] = useState<EffectsState>("idle");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [feedbackBlocked, setFeedbackBlocked] = useState(false);
  const [guardActive, setGuardActive] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelAnalyserRef = useRef<AnalyserNode | null>(null);
  const guardAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const outAnalyserRef = useRef<AnalyserNode | null>(null);
  const micBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const outBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const guardIntervalRef = useRef<number | null>(null);
  const feedbackLatchRef = useRef(false);
  const guardBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const guardFreqRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const notchAtRef = useRef<number[]>([0, 0, 0, 0]);
  const armedOnceRef = useRef(false);

  const masterVolumeRef = useRef(masterVolume);
  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);

  const irBuffersRef = useRef<AudioBuffer[]>([]);
  const activeConvRef = useRef<"A" | "B">("A");
  const convUnloadRef = useRef<number | null>(null);

  const recordDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const dryDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const tapRef = useRef<AudioNode | null>(null);

  const nodesRef = useRef<
    Partial<ChainNodes> & {
      bypass: GainNode | null;
      masterGain: GainNode | null;
      guard: GainNode | null;
      notches: BiquadFilterNode[];
    }
  >({
    bypass: null,
    masterGain: null,
    guard: null,
    notches: [],
  });

  const init = useCallback(async () => {
    if (ctxRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("microphone needs a secure connection (https)");
      setMicBlocked(true);
      return;
    }

    try {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      ctxRef.current = ctx;
      ctx.onstatechange = () => {
        if (ctx.state === "suspended" && !feedbackLatchRef.current) ctx.resume().catch(() => {});
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
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

      const {
        input: chainIn,
        output: effectsGain,
        nodes: chain,
      } = buildChain(
        ctx,
        { drive, echo, tone, reverb, mod, presetIdx },
        (irBuffersRef.current = reverbBuffers(ctx)),
      );
      effectsGain.gain.value = 0;

      const limiter = ctx.createWaveShaper();
      limiter.curve = createLimiterCurve();
      limiter.oversample = "none";

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;

      const guardGain = ctx.createGain();
      guardGain.gain.value = 1;

      const notches = Array.from({ length: 4 }, () => {
        const n = ctx.createBiquadFilter();
        n.type = "peaking";
        n.frequency.value = 1000;
        n.Q.value = 30;
        n.gain.value = 0;
        return n;
      });

      const guardAnalyser = ctx.createAnalyser();
      guardAnalyser.fftSize = 4096;
      guardAnalyser.smoothingTimeConstant = 0.5;
      guardAnalyserRef.current = guardAnalyser;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const bypassGain = ctx.createGain();
      bypassGain.gain.value = 1;

      src.connect(monoSum);
      monoSum.connect(bypassGain);
      monoSum.connect(chainIn);

      const chainSum = ctx.createGain();
      bypassGain.connect(chainSum);
      effectsGain.connect(chainSum);

      chainSum.connect(notches[0]);
      notches[0].connect(notches[1]);
      notches[1].connect(notches[2]);
      notches[2].connect(notches[3]);
      notches[3].connect(guardGain);

      const recLimiter = ctx.createWaveShaper();
      recLimiter.curve = createLimiterCurve();
      recLimiter.oversample = "none";
      guardGain.connect(recLimiter);
      tapRef.current = recLimiter;

      const levelAnalyser = ctx.createAnalyser();
      levelAnalyser.fftSize = 256;
      recLimiter.connect(levelAnalyser);
      levelAnalyserRef.current = levelAnalyser;

      guardGain.connect(masterGain);
      masterGain.connect(analyser);
      masterGain.connect(guardAnalyser);
      masterGain.connect(limiter);
      limiter.connect(ctx.destination);

      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 4096;
      micAnalyser.smoothingTimeConstant = 0;
      monoSum.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;

      const outAnalyser = ctx.createAnalyser();
      outAnalyser.fftSize = 4096;
      outAnalyser.smoothingTimeConstant = 0;
      limiter.connect(outAnalyser);
      outAnalyserRef.current = outAnalyser;

      const recordDest = ctx.createMediaStreamDestination();
      recLimiter.connect(recordDest);
      recordDestRef.current = recordDest;

      const dryDest = ctx.createMediaStreamDestination();
      monoSum.connect(dryDest);
      dryDestRef.current = dryDest;

      nodesRef.current = {
        ...chain,
        bypass: bypassGain,
        masterGain,
        guard: guardGain,
        notches,
      };

      setReady(true);
      setMicBlocked(false);
      setError(null);
      setState("idle");
      streamRef.current?.getAudioTracks().forEach((tr) => {
        tr.enabled = false;
      });
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

  const liveParams = useMemo(
    () => ({ drive, echo, tone, reverb, mod }),
    [drive, echo, tone, reverb, mod],
  );

  const recorder = useRecorder({
    ctxRef,
    destRef: recordDestRef,
    dryDestRef,
    ensureAudio: init,
    presetIdx: state === "active" ? presetIdx : CLEAN_RIG,
    params: liveParams,
    masterVolume,
    backingRef,
  });

  useEffect(() => {
    const { drive: driveNode, driveTrim, preGain, preFilter, midEmphasis } = nodesRef.current;
    const dp = DRIVES[presetIdx ?? 0] ?? DRIVES[0];
    if (driveNode) {
      driveNode.curve = createDistortionCurve(drive, dp.shape);
      driveNode.oversample = driveOversample(drive, dp.shape);
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    preGain?.gain.setTargetAtTime(mapDrivePreGain(drive), t, 0.05);
    driveTrim?.gain.setTargetAtTime(dp.trim, t, 0.05);
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
    toneFilter?.frequency.setTargetAtTime(600 * Math.pow(20, tone), ctx.currentTime, 0.05);
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
    const { modLfo, modDelay, modDepth, modDamp, modFb, modWet, trem, tremDepth } =
      nodesRef.current;
    const mp = MODS[presetIdx ?? 0] ?? MODS[0];
    const ch = chorusOf(mp);
    const t = ctx.currentTime;
    modLfo?.frequency.setTargetAtTime(mp.rate, t, 0.1);
    modDelay?.delayTime.setTargetAtTime(ch.base, t, 0.1);
    modDamp?.frequency.setTargetAtTime(ch.damp, t, 0.05);
    modDepth?.gain.setTargetAtTime(ch.depthMin + mod * (ch.depthMax - ch.depthMin), t, 0.05);
    modFb?.gain.setTargetAtTime(mod * ch.fbMax, t, 0.05);
    modWet?.gain.setTargetAtTime(mod * ch.mixMax, t, 0.05);
    const throb = tremoloDepth(mp, mod);
    tremDepth?.gain.setTargetAtTime(throb, t, 0.08);
    trem?.gain.setTargetAtTime(1 - throb, t, 0.08);
  }, [mod, presetIdx]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { mix } = nodesRef.current;
    const mp = MODS[presetIdx ?? 0] ?? MODS[0];
    mix?.gain.setTargetAtTime(mixNorm({ echo, reverb, mod }, mp), ctx.currentTime, 0.05);
  }, [echo, reverb, mod, presetIdx]);

  useEffect(() => {
    if (feedbackLatchRef.current) return;
    const { masterGain } = nodesRef.current;
    if (masterGain && ctxRef.current && state !== "idle")
      masterGain.gain.setTargetAtTime(
        masterGainFromKnob(masterVolume),
        ctxRef.current.currentTime,
        0.05,
      );
  }, [masterVolume, state]);

  useEffect(() => {
    if (state !== "active" && state !== "bypass") {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
      return;
    }
    const PNPR_DB = 26;
    const PEAK_DB_MIN = -38;
    const RMS_GATE = 0.22;
    const IPMP_CHECKS = 6;
    const NOTCH_GAIN = -15;
    const NOTCH_SPACING = 5;
    const NOTCH_HOLD_MS = 30000;
    const CORR_TRIP = 0.65;
    const CORR_SUSTAIN_CHECKS = 12;
    const RMS_HIST_LEN = 8;
    const RMS_DECAY_TOL = 0.92;

    let lastBin = -1;
    let persist = 0;
    let sinceNotch = NOTCH_SPACING;
    let corrSmooth = 0;
    let corrHot = 0;
    const rmsHist: number[] = [];

    const rmsNow = () => {
      const analyser = analyserRef.current;
      if (!analyser) return 0;
      const time = (guardBufRef.current ??= new Float32Array(analyser.fftSize));
      analyser.getFloatTimeDomainData(time);
      let sum = 0;
      for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
      return Math.sqrt(sum / time.length);
    };

    const loopCorr = () => {
      const ma = micAnalyserRef.current;
      const oa = outAnalyserRef.current;
      const ctx = ctxRef.current;
      if (!ma || !oa || !ctx) return 0;
      const N = ma.fftSize;
      const m = (micBufRef.current ??= new Float32Array(N));
      const o = (outBufRef.current ??= new Float32Array(N));
      ma.getFloatTimeDomainData(m);
      oa.getFloatTimeDomainData(o);
      for (let i = N - 1; i > 0; i--) {
        m[i] -= 0.97 * m[i - 1];
        o[i] -= 0.97 * o[i - 1];
      }
      const W = 1024;
      const lagMin = Math.round(0.006 * ctx.sampleRate);
      const lagMax = Math.min(Math.round(0.06 * ctx.sampleRate), N - 1 - W);
      const base = lagMax;
      let em = 0;
      for (let i = 0; i < W; i++) em += m[base + i] * m[base + i];
      if (em < 1e-3) return 0;
      let best = 0;
      for (let lag = lagMin; lag <= lagMax; lag += 8) {
        let dot = 0;
        let eo = 0;
        for (let i = 0; i < W; i++) {
          const mv = m[base + i];
          const ov = o[base + i - lag];
          dot += mv * ov;
          eo += ov * ov;
        }
        if (eo > 1e-6) {
          const rho = Math.abs(dot) / Math.sqrt(em * eo);
          if (rho > best) best = rho;
        }
      }
      return best;
    };

    const spectrum = () => {
      const ga = guardAnalyserRef.current;
      const ctx = ctxRef.current;
      if (!ga || !ctx) return null;
      const freq = (guardFreqRef.current ??= new Float32Array(ga.frequencyBinCount));
      ga.getFloatFrequencyData(freq);
      let bin = -1;
      let peakDb = -Infinity;
      for (let i = 4; i < freq.length; i++) {
        if (freq[i] > peakDb) {
          peakDb = freq[i];
          bin = i;
        }
      }
      if (bin < 4 || !Number.isFinite(peakDb)) return null;
      let nSum = 0;
      let nCount = 0;
      for (const side of [-1, 1]) {
        for (let d = 6; d <= 24; d++) {
          const j = bin + side * d;
          if (j >= 4 && j < freq.length && Number.isFinite(freq[j])) {
            nSum += freq[j];
            nCount++;
          }
        }
      }
      if (!nCount) return null;
      const pnpr = peakDb - nSum / nCount;
      const L = freq[bin - 1];
      const R = freq[bin + 1];
      const den = L - 2 * peakDb + R;
      const delta =
        den !== 0 && Number.isFinite(L) && Number.isFinite(R)
          ? Math.max(-0.5, Math.min(0.5, (0.5 * (L - R)) / den))
          : 0;
      const hz = ((bin + delta) * ctx.sampleRate) / ga.fftSize;
      return { bin, peakDb, pnpr, hz };
    };

    const releaseStaleNotches = () => {
      const ctx = ctxRef.current;
      const { notches } = nodesRef.current;
      if (!ctx) return;
      const now = Date.now();
      notchAtRef.current.forEach((at, i) => {
        if (at !== 0 && now - at > NOTCH_HOLD_MS) {
          notches[i]?.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
          notchAtRef.current[i] = 0;
        }
      });
    };

    const deployNotch = (hz: number) => {
      const ctx = ctxRef.current;
      const { notches } = nodesRef.current;
      if (!ctx || !notches.length) return;
      let idx = notchAtRef.current.findIndex((at) => at === 0);
      if (idx === -1) {
        idx = 0;
        for (let i = 1; i < notchAtRef.current.length; i++)
          if (notchAtRef.current[i] < notchAtRef.current[idx]) idx = i;
      }
      const n = notches[idx];
      n.frequency.setValueAtTime(hz, ctx.currentTime);
      n.gain.setTargetAtTime(NOTCH_GAIN, ctx.currentTime, 0.03);
      notchAtRef.current[idx] = Date.now();
    };

    const hardTrip = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      feedbackLatchRef.current = true;
      const { masterGain, guard } = nodesRef.current;
      masterGain?.gain.cancelScheduledValues(ctx.currentTime);
      masterGain?.gain.setValueAtTime(0, ctx.currentTime);
      guard?.gain.cancelScheduledValues(ctx.currentTime);
      guard?.gain.setValueAtTime(1, ctx.currentTime);
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      ctx.suspend();
      setGuardActive(false);
      setState("bypass");
      setFeedbackBlocked(true);
      setError(null);
    };

    const checkFeedback = () => {
      if (feedbackLatchRef.current || !ctxRef.current) return;
      releaseStaleNotches();
      const rms = rmsNow();
      const sp = spectrum();
      sinceNotch++;

      rmsHist.push(rms);
      if (rmsHist.length > RMS_HIST_LEN) rmsHist.shift();
      const sustained = rmsHist.length === RMS_HIST_LEN && rms >= rmsHist[0] * RMS_DECAY_TOL;
      const howlSig = !!sp && sp.pnpr > PNPR_DB && sp.peakDb > PEAK_DB_MIN;

      corrSmooth = corrSmooth * 0.6 + loopCorr() * 0.4;
      const looping = corrSmooth >= CORR_TRIP && rms > RMS_GATE && howlSig && sustained;
      corrHot = looping ? corrHot + 1 : Math.max(0, corrHot - 1);
      if (corrHot >= CORR_SUSTAIN_CHECKS) {
        hardTrip();
        return;
      }

      const candidate = howlSig && rms > RMS_GATE;
      if (candidate && sp && Math.abs(sp.bin - lastBin) <= 3) persist++;
      else persist = candidate ? 1 : 0;
      lastBin = candidate && sp ? sp.bin : -1;

      if (persist >= IPMP_CHECKS && sinceNotch >= NOTCH_SPACING && sp) {
        deployNotch(sp.hz);
        persist = 0;
        sinceNotch = 0;
      }

      setGuardActive(notchAtRef.current.some((at) => at !== 0));
    };

    guardIntervalRef.current = window.setInterval(checkFeedback, 100);
    return () => {
      if (guardIntervalRef.current) clearInterval(guardIntervalRef.current);
    };
  }, [state]);

  const resumeFromFeedback = useCallback(() => {
    const ctx = ctxRef.current;
    feedbackLatchRef.current = false;
    setGuardActive(false);
    setFeedbackBlocked(false);
    setError(null);
    const off = () => {
      const { masterGain, bypass, effects, guard } = nodesRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      masterGain?.gain.cancelScheduledValues(now);
      masterGain?.gain.setValueAtTime(0, now);
      guard?.gain.cancelScheduledValues(now);
      guard?.gain.setValueAtTime(1, now);
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
      masterGain?.gain.setTargetAtTime(
        masterGainFromKnob(masterVolumeRef.current),
        t,
        armedOnceRef.current ? 0.1 : 0.45,
      );
      armedOnceRef.current = true;
      bypass?.gain.setTargetAtTime(0, t, 0.02);
      effects?.gain.setTargetAtTime(1, t, 0.02);
      setState("active");
    } else {
      bypass?.gain.setTargetAtTime(1, t, 0.02);
      effects?.gain.setTargetAtTime(0, t, 0.02);
      setState("bypass");
    }
  }, [state, init, resumeFromFeedback]);

  const setBypass = useCallback(
    async (on: boolean) => {
      if (feedbackLatchRef.current) return;
      if (!ctxRef.current) await init();
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();

      const t = ctx.currentTime;
      const { bypass, effects, masterGain } = nodesRef.current;
      streamRef.current?.getAudioTracks().forEach((tr) => {
        tr.enabled = true;
      });
      masterGain?.gain.setTargetAtTime(
        masterGainFromKnob(masterVolumeRef.current),
        t,
        armedOnceRef.current ? 0.1 : 0.45,
      );
      armedOnceRef.current = true;
      bypass?.gain.setTargetAtTime(on ? 1 : 0, t, 0.015);
      effects?.gain.setTargetAtTime(on ? 0 : 1, t, 0.015);
      setError(null);
      setState(on ? "bypass" : "active");
    },
    [init],
  );

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
    const analyser = levelAnalyserRef.current;
    if (!analyser) return (emptyRef.current ??= new Float32Array(128));
    const buf = (scratchRef.current ??= new Float32Array(analyser.fftSize));
    analyser.getFloatTimeDomainData(buf);
    return buf;
  }, []);

  const getLevel = useCallback((): number => {
    const analyser = levelAnalyserRef.current;
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

  const micScratchRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const getMicWaveform = useCallback((): Float32Array => {
    const analyser = micAnalyserRef.current;
    if (!analyser) return (emptyRef.current ??= new Float32Array(128));
    const buf = (micScratchRef.current ??= new Float32Array(analyser.fftSize));
    analyser.getFloatTimeDomainData(buf);
    return buf;
  }, []);

  const getSampleRate = useCallback(() => ctxRef.current?.sampleRate ?? 0, []);

  return {
    state,
    ready,
    ctxRef,
    tapRef,
    ensureAudio: init,
    getMicWaveform,
    getSampleRate,
    error: error ?? recorder.error,
    micBlocked,
    toggle,
    setBypass,
    getLevel,
    getWaveform,
    feedbackBlocked,
    guardActive,
    resumeFromFeedback,
    recorder,
  };
}
