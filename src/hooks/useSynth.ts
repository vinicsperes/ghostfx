import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDistortionCurve,
  driveOversample,
  mapDrivePreGain,
  synthDriveTrim,
} from "../audio/dsp";
import { DELAYS, DRIVES, MODS, REVERBS } from "../data/presets";

export const NOTE_KEYS: Record<string, { freq: number; note: string; black?: true }> = {
  a: { freq: 261.63, note: "C4" },
  w: { freq: 277.18, note: "C#4", black: true },
  s: { freq: 293.66, note: "D4" },
  e: { freq: 311.13, note: "D#4", black: true },
  d: { freq: 329.63, note: "E4" },
  f: { freq: 349.23, note: "F4" },
  t: { freq: 369.99, note: "F#4", black: true },
  g: { freq: 392.0, note: "G4" },
  y: { freq: 415.3, note: "G#4", black: true },
  h: { freq: 440.0, note: "A4" },
  u: { freq: 466.16, note: "A#4", black: true },
  j: { freq: 493.88, note: "B4" },
  k: { freq: 523.25, note: "C5" },
  o: { freq: 554.37, note: "C#5", black: true },
  l: { freq: 587.33, note: "D5" },
  p: { freq: 622.25, note: "D#5", black: true },
};

type SynthNodes = {
  input: GainNode;
  midEmphasis: BiquadFilterNode;
  preGain: GainNode;
  drive: WaveShaperNode;
  driveTrim: GainNode;
  tone: BiquadFilterNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  modLfo: OscillatorNode;
  modDelay: DelayNode;
  modDepth: GainNode;
  modDamp: BiquadFilterNode;
  modFb: GainNode;
  modWet: GainNode;
  revDamp: BiquadFilterNode;
  reverbWet: GainNode;
  master: GainNode;
};

export function useSynth({
  drive,
  echo,
  tone,
  reverb,
  mod,
  masterVolume,
  presetIdx = 0,
}: {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  mod: number;
  masterVolume: number;
  presetIdx?: number | null;
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<SynthNodes | null>(null);
  const activeRef = useRef(new Map<string, { osc: OscillatorNode; env: GainNode }>());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  const paramsRef = useRef({ drive, echo, tone, reverb, mod, masterVolume, presetIdx });
  useEffect(() => {
    paramsRef.current = { drive, echo, tone, reverb, mod, masterVolume, presetIdx };
  }, [drive, echo, tone, reverb, mod, masterVolume, presetIdx]);

  const ensureInit = useCallback(() => {
    if (ctxRef.current && nodesRef.current) return { ctx: ctxRef.current, nodes: nodesRef.current };

    const p = paramsRef.current;
    const idx = p.presetIdx ?? 0;
    const dp = DRIVES[idx] ?? DRIVES[0];
    const dl = DELAYS[idx] ?? DELAYS[0];
    const mp = MODS[idx] ?? MODS[0];
    const rv = REVERBS[idx] ?? REVERBS[0];
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const input = ctx.createGain();
    input.gain.value = 1.0;

    const midEmphasis = ctx.createBiquadFilter();
    midEmphasis.type = "peaking";
    midEmphasis.frequency.value = dp.midHz;
    midEmphasis.Q.value = 0.8;
    midEmphasis.gain.value = dp.midGain + 2;

    const preGain = ctx.createGain();
    preGain.gain.value = mapDrivePreGain(p.drive);

    const driveNode = ctx.createWaveShaper();
    driveNode.curve = createDistortionCurve(p.drive, dp.shape);
    driveNode.oversample = driveOversample(p.drive, dp.shape);

    const driveTrim = ctx.createGain();
    driveTrim.gain.value = synthDriveTrim(p.drive, dp.shape);

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 600 * Math.pow(20, p.tone);

    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = dl.timeMin + p.echo * (dl.timeMax - dl.timeMin);

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = dl.fbMin + p.echo * (dl.fbMax - dl.fbMin);

    const wetGain = ctx.createGain();
    wetGain.gain.value = p.echo * 0.5;

    const modDelay = ctx.createDelay(0.05);
    modDelay.delayTime.value = mp.base;
    const modLfo = ctx.createOscillator();
    modLfo.type = "sine";
    modLfo.frequency.value = mp.rate;
    const modDepth = ctx.createGain();
    modDepth.gain.value = mp.depthMin + p.mod * (mp.depthMax - mp.depthMin);
    modLfo.connect(modDepth);
    modDepth.connect(modDelay.delayTime);
    modLfo.start();
    const modDamp = ctx.createBiquadFilter();
    modDamp.type = "lowpass";
    modDamp.frequency.value = mp.damp;
    const modFb = ctx.createGain();
    modFb.gain.value = p.mod * mp.fbMax;
    const modWet = ctx.createGain();
    modWet.gain.value = p.mod * mp.mixMax;

    const reverbDamping = ctx.createBiquadFilter();
    reverbDamping.type = "lowpass";
    reverbDamping.frequency.value = Math.min(8000, rv.tone);
    const rev1 = ctx.createDelay(0.1);
    rev1.delayTime.value = 0.0233;
    const revFB1 = ctx.createGain();
    revFB1.gain.value = 0.72;
    const rev2 = ctx.createDelay(0.1);
    rev2.delayTime.value = 0.0371;
    const revFB2 = ctx.createGain();
    revFB2.gain.value = 0.68;
    const rev3 = ctx.createDelay(0.1);
    rev3.delayTime.value = 0.0531;
    const revFB3 = ctx.createGain();
    revFB3.gain.value = 0.64;
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = p.reverb * 0.5;

    const master = ctx.createGain();
    master.gain.value = p.masterVolume * 0.55;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 3;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;

    input.connect(midEmphasis);
    midEmphasis.connect(preGain);
    preGain.connect(driveNode);
    driveNode.connect(driveTrim);
    driveTrim.connect(toneFilter);
    toneFilter.connect(master);
    toneFilter.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    feedbackGain.connect(wetGain);
    wetGain.connect(master);
    toneFilter.connect(modDelay);
    modDelay.connect(modDamp);
    modDamp.connect(modFb);
    modFb.connect(modDelay);
    modDamp.connect(modWet);
    modWet.connect(master);
    toneFilter.connect(reverbDamping);
    reverbDamping.connect(rev1);
    rev1.connect(revFB1);
    revFB1.connect(rev1);
    rev1.connect(reverbWet);
    reverbDamping.connect(rev2);
    rev2.connect(revFB2);
    revFB2.connect(rev2);
    rev2.connect(reverbWet);
    reverbDamping.connect(rev3);
    rev3.connect(revFB3);
    revFB3.connect(rev3);
    rev3.connect(reverbWet);
    reverbWet.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const nodes: SynthNodes = {
      input,
      midEmphasis,
      preGain,
      drive: driveNode,
      driveTrim,
      tone: toneFilter,
      delay: delayNode,
      feedback: feedbackGain,
      wet: wetGain,
      modLfo,
      modDelay,
      modDepth,
      modDamp,
      modFb,
      modWet,
      revDamp: reverbDamping,
      reverbWet,
      master,
    };
    nodesRef.current = nodes;
    return { ctx, nodes };
  }, []);

  useEffect(() => {
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    if (!n || !ctx) return;
    const idx = presetIdx ?? 0;
    const dp = DRIVES[idx] ?? DRIVES[0];
    const dl = DELAYS[idx] ?? DELAYS[0];
    const mp = MODS[idx] ?? MODS[0];
    const rv = REVERBS[idx] ?? REVERBS[0];
    const t = ctx.currentTime;
    n.preGain.gain.setTargetAtTime(mapDrivePreGain(drive), t, 0.05);
    n.drive.curve = createDistortionCurve(drive, dp.shape);
    n.drive.oversample = driveOversample(drive, dp.shape);
    n.driveTrim.gain.setTargetAtTime(synthDriveTrim(drive, dp.shape), t, 0.05);
    n.midEmphasis.frequency.setTargetAtTime(dp.midHz, t, 0.05);
    n.midEmphasis.gain.setTargetAtTime(dp.midGain + 2, t, 0.05);
    n.tone.frequency.setTargetAtTime(600 * Math.pow(20, tone), t, 0.05);
    n.delay.delayTime.setTargetAtTime(dl.timeMin + echo * (dl.timeMax - dl.timeMin), t, 0.05);
    n.feedback.gain.setTargetAtTime(dl.fbMin + echo * (dl.fbMax - dl.fbMin), t, 0.05);
    n.wet.gain.setTargetAtTime(echo * 0.5, t, 0.05);
    n.revDamp.frequency.setTargetAtTime(Math.min(8000, rv.tone), t, 0.05);
    n.reverbWet.gain.setTargetAtTime(reverb * 0.5, t, 0.05);
    n.modLfo.frequency.setTargetAtTime(mp.rate, t, 0.1);
    n.modDelay.delayTime.setTargetAtTime(mp.base, t, 0.1);
    n.modDamp.frequency.setTargetAtTime(mp.damp, t, 0.05);
    n.modDepth.gain.setTargetAtTime(mp.depthMin + mod * (mp.depthMax - mp.depthMin), t, 0.05);
    n.modFb.gain.setTargetAtTime(mod * mp.fbMax, t, 0.05);
    n.modWet.gain.setTargetAtTime(mod * mp.mixMax, t, 0.05);
    n.master.gain.setTargetAtTime(masterVolume * 0.55, t, 0.05);
  }, [drive, echo, tone, reverb, mod, masterVolume, presetIdx]);

  const playNote = useCallback(
    (key: string, freq: number) => {
      if (activeRef.current.has(key)) return;
      const { ctx, nodes } = ensureInit();
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.012);

      osc.connect(env);
      env.connect(nodes.input);
      osc.start();

      activeRef.current.set(key, { osc, env });
      setActiveKeys((prev) => new Set([...prev, key]));
    },
    [ensureInit],
  );

  const stopNote = useCallback((key: string) => {
    const note = activeRef.current.get(key);
    if (!note || !ctxRef.current) return;
    const { osc, env } = note;
    const t = ctxRef.current.currentTime;
    env.gain.setTargetAtTime(0, t, 0.06);
    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
        env.disconnect();
      } catch {}
    }, 600);
    activeRef.current.delete(key);
    setActiveKeys((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
  }, []);

  useEffect(
    () => () => {
      ctxRef.current?.close();
    },
    [],
  );

  return { playNote, stopNote, activeKeys };
}
