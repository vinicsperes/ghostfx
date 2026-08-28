import { useCallback, useEffect, useRef, useState } from "react";
import {
  cabTrim,
  createDistortionCurve,
  createLimiterCurve,
  createTapeCurve,
  driveOversample,
  mapDrivePreGain,
  synthDriveTrim,
  masterGainFromKnob,
} from "../audio/dsp";
import { rigAt } from "../data/presets";
import { chorusOf, mixNorm, tremoloDepth } from "../audio/chain";

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

const SYNTH_HEADROOM = 0.65;

const REV_DT = [0.0233, 0.0371, 0.0531];
const REV_AP = [0.0077, 0.0051];
const REV_AP_G = 0.7;
const REV_FB_CAP = 0.92;
const REV_DAMP_Q = -3.01;
const REV_MAKEUP = 6.0;

function combFeedback(decay: number): number[] {
  return REV_DT.map((dt) => Math.min(REV_FB_CAP, Math.exp((Math.log(0.001) * dt) / decay)));
}

type SynthNodes = {
  input: GainNode;
  midEmphasis: BiquadFilterNode;
  preGain: GainNode;
  drive: WaveShaperNode;
  driveTrim: GainNode;
  cabHP: BiquadFilterNode;
  cabBody: BiquadFilterNode;
  cabPres: BiquadFilterNode;
  cabLP: BiquadFilterNode;
  tone: BiquadFilterNode;
  delay: DelayNode;
  delayLoopHP: BiquadFilterNode;
  delayLoopLP: BiquadFilterNode;
  delaySat: WaveShaperNode;
  feedback: GainNode;
  wet: GainNode;
  modLfo: OscillatorNode;
  modDelay: DelayNode;
  modDepth: GainNode;
  modDamp: BiquadFilterNode;
  modFb: GainNode;
  modWet: GainNode;
  trem: GainNode;
  tremDepth: GainNode;
  revIn: GainNode;
  revDamp: BiquadFilterNode[];
  revFB: GainNode[];
  revNorm: GainNode[];
  reverbWet: GainNode;
  mix: GainNode;
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
    const rig = rigAt(idx);
    const dp = rig.drive;
    const dl = rig.delay;
    const mp = rig.mod;
    const rv = rig.reverb;
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
    driveTrim.gain.value = synthDriveTrim(p.drive, dp.shape) * cabTrim(rig.cab, ctx.sampleRate);

    const cabHP = ctx.createBiquadFilter();
    cabHP.type = "highpass";
    cabHP.frequency.value = rig.cab.lowCut;
    cabHP.Q.value = 0.707;
    const cabBody = ctx.createBiquadFilter();
    cabBody.type = "peaking";
    cabBody.frequency.value = rig.cab.bodyHz;
    cabBody.Q.value = 0.9;
    cabBody.gain.value = rig.cab.bodyGain;
    const cabPres = ctx.createBiquadFilter();
    cabPres.type = "peaking";
    cabPres.frequency.value = rig.cab.presHz;
    cabPres.Q.value = 1.0;
    cabPres.gain.value = rig.cab.presGain;
    const cabLP = ctx.createBiquadFilter();
    cabLP.type = "lowpass";
    cabLP.frequency.value = rig.cab.topCut;
    cabLP.Q.value = 0.9;

    const dcBlock = ctx.createBiquadFilter();
    dcBlock.type = "highpass";
    dcBlock.frequency.value = 30;
    dcBlock.Q.value = 0.707;

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 600 * Math.pow(20, p.tone);

    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = dl.timeMin + p.echo * (dl.timeMax - dl.timeMin);

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

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = dl.fbMin + p.echo * (dl.fbMax - dl.fbMin);

    const wetGain = ctx.createGain();
    wetGain.gain.value = p.echo * 0.5;

    const ch = chorusOf(mp);

    const modDelay = ctx.createDelay(0.05);
    modDelay.delayTime.value = ch.base;
    const modLfo = ctx.createOscillator();
    modLfo.type = "sine";
    modLfo.frequency.value = mp.rate;
    const modDepth = ctx.createGain();
    modDepth.gain.value = ch.depthMin + p.mod * (ch.depthMax - ch.depthMin);
    modLfo.connect(modDepth);
    modDepth.connect(modDelay.delayTime);
    modLfo.start();
    const modDamp = ctx.createBiquadFilter();
    modDamp.type = "lowpass";
    modDamp.frequency.value = ch.damp;
    const modFb = ctx.createGain();
    modFb.gain.value = p.mod * ch.fbMax;
    const modWet = ctx.createGain();
    modWet.gain.value = p.mod * ch.mixMax;

    const throb = tremoloDepth(mp, p.mod);
    const trem = ctx.createGain();
    trem.gain.value = 1 - throb;
    const tremDepth = ctx.createGain();
    tremDepth.gain.value = throb;
    modLfo.connect(tremDepth);
    tremDepth.connect(trem.gain);

    const revIn = ctx.createGain();
    revIn.gain.value = REV_MAKEUP;

    const combSum = ctx.createGain();
    const revDamp: BiquadFilterNode[] = [];
    const revFB: GainNode[] = [];
    const revNorm: GainNode[] = [];
    const startFb = combFeedback(rv.decay);
    REV_DT.forEach((dt, i) => {
      const line = ctx.createDelay(0.1);
      line.delayTime.value = dt;
      const damp = ctx.createBiquadFilter();
      damp.type = "lowpass";
      damp.frequency.value = Math.min(8000, rv.tone);
      damp.Q.value = REV_DAMP_Q;
      const fb = ctx.createGain();
      fb.gain.value = startFb[i];
      const norm = ctx.createGain();
      norm.gain.value = 1 - startFb[i];
      revIn.connect(line);
      line.connect(damp);
      damp.connect(fb);
      fb.connect(line);
      line.connect(norm);
      norm.connect(combSum);
      revDamp.push(damp);
      revFB.push(fb);
      revNorm.push(norm);
    });

    let diffused: AudioNode = combSum;
    for (const dt of REV_AP) {
      const sum = ctx.createGain();
      const line = ctx.createDelay(0.1);
      line.delayTime.value = dt;
      const fb = ctx.createGain();
      fb.gain.value = REV_AP_G;
      const ff = ctx.createGain();
      ff.gain.value = -REV_AP_G;
      const out = ctx.createGain();
      diffused.connect(sum);
      sum.connect(line);
      line.connect(fb);
      fb.connect(sum);
      line.connect(out);
      sum.connect(ff);
      ff.connect(out);
      diffused = out;
    }

    const reverbWet = ctx.createGain();
    reverbWet.gain.value = p.reverb * 0.5;
    diffused.connect(reverbWet);

    const mix = ctx.createGain();
    mix.gain.value = mixNorm(p, mp);

    const master = ctx.createGain();
    master.gain.value = masterGainFromKnob(p.masterVolume) * SYNTH_HEADROOM;

    const limiter = ctx.createWaveShaper();
    limiter.curve = createLimiterCurve();
    limiter.oversample = "none";

    input.connect(midEmphasis);
    midEmphasis.connect(preGain);
    preGain.connect(driveNode);
    driveNode.connect(driveTrim);
    driveTrim.connect(dcBlock);
    dcBlock.connect(cabHP);
    cabHP.connect(cabBody);
    cabBody.connect(cabPres);
    cabPres.connect(cabLP);
    cabLP.connect(toneFilter);
    toneFilter.connect(mix);
    toneFilter.connect(delayNode);
    delayNode.connect(delayLoopHP);
    delayLoopHP.connect(delayLoopLP);
    delayLoopLP.connect(delaySat);
    delaySat.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delaySat.connect(wetGain);
    wetGain.connect(mix);
    toneFilter.connect(modDelay);
    modDelay.connect(modDamp);
    modDamp.connect(modFb);
    modFb.connect(modDelay);
    modDamp.connect(modWet);
    modWet.connect(mix);
    toneFilter.connect(revIn);
    reverbWet.connect(mix);
    mix.connect(master);
    master.connect(trem);
    trem.connect(limiter);
    limiter.connect(ctx.destination);

    const nodes: SynthNodes = {
      input,
      midEmphasis,
      preGain,
      drive: driveNode,
      driveTrim,
      cabHP,
      cabBody,
      cabPres,
      cabLP,
      tone: toneFilter,
      delay: delayNode,
      delayLoopHP,
      delayLoopLP,
      delaySat,
      feedback: feedbackGain,
      wet: wetGain,
      modLfo,
      modDelay,
      modDepth,
      modDamp,
      modFb,
      modWet,
      trem,
      tremDepth,
      revIn,
      revDamp,
      revFB,
      revNorm,
      reverbWet,
      mix,
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
    const rig = rigAt(idx);
    const dp = rig.drive;
    const dl = rig.delay;
    const mp = rig.mod;
    const rv = rig.reverb;
    const t = ctx.currentTime;
    n.preGain.gain.setTargetAtTime(mapDrivePreGain(drive), t, 0.05);
    n.drive.curve = createDistortionCurve(drive, dp.shape);
    n.drive.oversample = driveOversample(drive, dp.shape);
    n.driveTrim.gain.setTargetAtTime(
      synthDriveTrim(drive, dp.shape) * cabTrim(rig.cab, ctx.sampleRate),
      t,
      0.05,
    );
    n.cabHP.frequency.setTargetAtTime(rig.cab.lowCut, t, 0.05);
    n.cabBody.frequency.setTargetAtTime(rig.cab.bodyHz, t, 0.05);
    n.cabBody.gain.setTargetAtTime(rig.cab.bodyGain, t, 0.05);
    n.cabPres.frequency.setTargetAtTime(rig.cab.presHz, t, 0.05);
    n.cabPres.gain.setTargetAtTime(rig.cab.presGain, t, 0.05);
    n.cabLP.frequency.setTargetAtTime(rig.cab.topCut, t, 0.05);
    n.midEmphasis.frequency.setTargetAtTime(dp.midHz, t, 0.05);
    n.midEmphasis.gain.setTargetAtTime(dp.midGain + 2, t, 0.05);
    n.tone.frequency.setTargetAtTime(600 * Math.pow(20, tone), t, 0.05);
    n.delay.delayTime.setTargetAtTime(dl.timeMin + echo * (dl.timeMax - dl.timeMin), t, 0.05);
    n.delayLoopHP.frequency.setTargetAtTime(dl.loopHp, t, 0.05);
    n.delayLoopLP.frequency.setTargetAtTime(dl.loopLp, t, 0.05);
    n.delaySat.curve = createTapeCurve(dl.sat);
    n.feedback.gain.setTargetAtTime(dl.fbMin + echo * (dl.fbMax - dl.fbMin), t, 0.05);
    n.wet.gain.setTargetAtTime(echo * 0.5, t, 0.05);
    const revFbs = combFeedback(rv.decay);
    n.revDamp.forEach((d) => d.frequency.setTargetAtTime(Math.min(8000, rv.tone), t, 0.05));
    n.revFB.forEach((g, i) => g.gain.setTargetAtTime(revFbs[i], t, 0.05));
    n.revNorm.forEach((g, i) => g.gain.setTargetAtTime(1 - revFbs[i], t, 0.05));
    n.reverbWet.gain.setTargetAtTime(reverb * 0.5, t, 0.05);
    const ch = chorusOf(mp);
    n.modLfo.frequency.setTargetAtTime(mp.rate, t, 0.1);
    n.modDelay.delayTime.setTargetAtTime(ch.base, t, 0.1);
    n.modDamp.frequency.setTargetAtTime(ch.damp, t, 0.05);
    n.modDepth.gain.setTargetAtTime(ch.depthMin + mod * (ch.depthMax - ch.depthMin), t, 0.05);
    n.modFb.gain.setTargetAtTime(mod * ch.fbMax, t, 0.05);
    n.modWet.gain.setTargetAtTime(mod * ch.mixMax, t, 0.05);
    const throb = tremoloDepth(mp, mod);
    n.tremDepth.gain.setTargetAtTime(throb, t, 0.08);
    n.trem.gain.setTargetAtTime(1 - throb, t, 0.08);
    n.mix.gain.setTargetAtTime(mixNorm({ echo, reverb, mod }, mp), t, 0.05);
    n.master.gain.setTargetAtTime(masterGainFromKnob(masterVolume) * SYNTH_HEADROOM, t, 0.05);
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
