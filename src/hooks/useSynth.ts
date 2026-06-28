import { useCallback, useEffect, useRef, useState } from "react";
import { createDistortionCurve, mapDrivePreGain, mapDelayTime, mapFeedback, mapFlangerDepth, mapFlangerFb, mapFlangerMix } from "../audio/dsp";

export const NOTE_KEYS: Record<string, { freq: number; note: string; black?: true }> = {
  a: { freq: 261.63, note: "C4" },
  w: { freq: 277.18, note: "C#4", black: true },
  s: { freq: 293.66, note: "D4" },
  e: { freq: 311.13, note: "D#4", black: true },
  d: { freq: 329.63, note: "E4" },
  f: { freq: 349.23, note: "F4" },
  t: { freq: 369.99, note: "F#4", black: true },
  g: { freq: 392.00, note: "G4" },
  y: { freq: 415.30, note: "G#4", black: true },
  h: { freq: 440.00, note: "A4" },
  u: { freq: 466.16, note: "A#4", black: true },
  j: { freq: 493.88, note: "B4" },
  k: { freq: 523.25, note: "C5" },
  o: { freq: 554.37, note: "C#5", black: true },
  l: { freq: 587.33, note: "D5" },
  p: { freq: 622.25, note: "D#5", black: true },
};

type SynthNodes = {
  input: GainNode;
  preGain: GainNode;
  drive: WaveShaperNode;
  tone: BiquadFilterNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  flangerDepth: GainNode;
  flangerFb: GainNode;
  flangerWet: GainNode;
  reverbWet: GainNode;
  master: GainNode;
};

export function useSynth({
  drive, echo, tone, reverb, flanger, masterVolume,
}: {
  drive: number; echo: number; tone: number; reverb: number; flanger: number; masterVolume: number;
}) {
  const ctxRef   = useRef<AudioContext | null>(null);
  const nodesRef = useRef<SynthNodes | null>(null);
  const activeRef = useRef(new Map<string, { osc: OscillatorNode; env: GainNode }>());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  const paramsRef = useRef({ drive, echo, tone, reverb, flanger, masterVolume });
  useEffect(() => { paramsRef.current = { drive, echo, tone, reverb, flanger, masterVolume }; }, [drive, echo, tone, reverb, flanger, masterVolume]);

  const ensureInit = useCallback(() => {
    if (ctxRef.current && nodesRef.current) return { ctx: ctxRef.current, nodes: nodesRef.current };

    const p = paramsRef.current;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const input = ctx.createGain();
    input.gain.value = 1.0;

    const midEmphasis = ctx.createBiquadFilter();
    midEmphasis.type = "peaking";
    midEmphasis.frequency.value = 700;
    midEmphasis.Q.value = 0.8;
    midEmphasis.gain.value = 4;

    const preGain = ctx.createGain();
    preGain.gain.value = mapDrivePreGain(p.drive);

    const driveNode = ctx.createWaveShaper();
    driveNode.curve = createDistortionCurve(p.drive);
    driveNode.oversample = "2x";

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 500 * Math.pow(16, p.tone);

    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = mapDelayTime(p.echo);

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = mapFeedback(p.echo);

    const wetGain = ctx.createGain();
    wetGain.gain.value = p.echo * 0.5;

    const flangerDelay = ctx.createDelay(0.05);
    flangerDelay.delayTime.value = 0.0025;
    const flangerLfo = ctx.createOscillator();
    flangerLfo.type = "sine";
    flangerLfo.frequency.value = 0.4;
    const flangerDepth = ctx.createGain();
    flangerDepth.gain.value = mapFlangerDepth(p.flanger);
    flangerLfo.connect(flangerDepth);
    flangerDepth.connect(flangerDelay.delayTime);
    flangerLfo.start();
    const flangerDamp = ctx.createBiquadFilter();
    flangerDamp.type = "lowpass";
    flangerDamp.frequency.value = 2800;
    const flangerFb = ctx.createGain();
    flangerFb.gain.value = mapFlangerFb(p.flanger);
    const flangerWet = ctx.createGain();
    flangerWet.gain.value = mapFlangerMix(p.flanger);

    const reverbDamping = ctx.createBiquadFilter();
    reverbDamping.type = "lowpass"; reverbDamping.frequency.value = 3200;
    const rev1 = ctx.createDelay(0.1); rev1.delayTime.value = 0.0233;
    const revFB1 = ctx.createGain(); revFB1.gain.value = 0.72;
    const rev2 = ctx.createDelay(0.1); rev2.delayTime.value = 0.0371;
    const revFB2 = ctx.createGain(); revFB2.gain.value = 0.68;
    const rev3 = ctx.createDelay(0.1); rev3.delayTime.value = 0.0531;
    const revFB3 = ctx.createGain(); revFB3.gain.value = 0.64;
    const reverbWet = ctx.createGain(); reverbWet.gain.value = p.reverb * 0.5;

    const master = ctx.createGain(); master.gain.value = p.masterVolume * 0.55;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5; limiter.knee.value = 3;
    limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.1;

    input.connect(midEmphasis);
    midEmphasis.connect(preGain);
    preGain.connect(driveNode);
    driveNode.connect(toneFilter);
    toneFilter.connect(master);
    toneFilter.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    feedbackGain.connect(wetGain);
    wetGain.connect(master);
    toneFilter.connect(flangerDelay); flangerDelay.connect(flangerDamp); flangerDamp.connect(flangerFb); flangerFb.connect(flangerDelay); flangerDamp.connect(flangerWet); flangerWet.connect(master);
    toneFilter.connect(reverbDamping);
    reverbDamping.connect(rev1); rev1.connect(revFB1); revFB1.connect(rev1); rev1.connect(reverbWet);
    reverbDamping.connect(rev2); rev2.connect(revFB2); revFB2.connect(rev2); rev2.connect(reverbWet);
    reverbDamping.connect(rev3); rev3.connect(revFB3); revFB3.connect(rev3); rev3.connect(reverbWet);
    reverbWet.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const nodes: SynthNodes = { input, preGain, drive: driveNode, tone: toneFilter, delay: delayNode, feedback: feedbackGain, wet: wetGain, flangerDepth, flangerFb, flangerWet, reverbWet, master };
    nodesRef.current = nodes;
    return { ctx, nodes };
  }, []);

  useEffect(() => {
    const n = nodesRef.current; const ctx = ctxRef.current;
    if (!n || !ctx) return;
    const t = ctx.currentTime;
    n.preGain.gain.setTargetAtTime(mapDrivePreGain(drive), t, 0.05);
    n.drive.curve = createDistortionCurve(drive);
    n.tone.frequency.setTargetAtTime(500 * Math.pow(16, tone), t, 0.05);
    n.delay.delayTime.setTargetAtTime(mapDelayTime(echo), t, 0.05);
    n.feedback.gain.setTargetAtTime(mapFeedback(echo), t, 0.05);
    n.wet.gain.setTargetAtTime(echo * 0.5, t, 0.05);
    n.reverbWet.gain.setTargetAtTime(reverb * 0.5, t, 0.05);
    n.flangerDepth.gain.setTargetAtTime(mapFlangerDepth(flanger), t, 0.05);
    n.flangerFb.gain.setTargetAtTime(mapFlangerFb(flanger), t, 0.05);
    n.flangerWet.gain.setTargetAtTime(mapFlangerMix(flanger), t, 0.05);
    n.master.gain.setTargetAtTime(masterVolume * 0.55, t, 0.05);
  }, [drive, echo, tone, reverb, flanger, masterVolume]);

  const playNote = useCallback((key: string, freq: number) => {
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
    setActiveKeys(prev => new Set([...prev, key]));
  }, [ensureInit]);

  const stopNote = useCallback((key: string) => {
    const note = activeRef.current.get(key);
    if (!note || !ctxRef.current) return;
    const { osc, env } = note;
    const t = ctxRef.current.currentTime;
    env.gain.setTargetAtTime(0, t, 0.06);
    setTimeout(() => {
      try { osc.stop(); osc.disconnect(); env.disconnect(); } catch { }
    }, 600);
    activeRef.current.delete(key);
    setActiveKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
  }, []);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return { playNote, stopNote, activeKeys };
}
