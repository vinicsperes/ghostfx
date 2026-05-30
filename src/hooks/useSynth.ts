import { useCallback, useEffect, useRef, useState } from "react";
import { createDistortionCurve, mapDelayTime, mapFeedback } from "../audio/dsp";

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
  drive: WaveShaperNode;
  tone: BiquadFilterNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  reverbWet: GainNode;
  master: GainNode;
};

export function useSynth({
  drive, echo, tone, reverb, masterVolume,
}: {
  drive: number; echo: number; tone: number; reverb: number; masterVolume: number;
}) {
  const ctxRef   = useRef<AudioContext | null>(null);
  const nodesRef = useRef<SynthNodes | null>(null);
  const activeRef = useRef(new Map<string, { osc: OscillatorNode; env: GainNode }>());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  const paramsRef = useRef({ drive, echo, tone, reverb, masterVolume });
  useEffect(() => { paramsRef.current = { drive, echo, tone, reverb, masterVolume }; }, [drive, echo, tone, reverb, masterVolume]);

  const ensureInit = useCallback(() => {
    if (ctxRef.current && nodesRef.current) return { ctx: ctxRef.current, nodes: nodesRef.current };

    const p = paramsRef.current;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const input = ctx.createGain();
    input.gain.value = 1.2;

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

    const rev1 = ctx.createDelay(0.1); rev1.delayTime.value = 0.023;
    const revFB1 = ctx.createGain(); revFB1.gain.value = 0.5;
    const rev2 = ctx.createDelay(0.1); rev2.delayTime.value = 0.037;
    const revFB2 = ctx.createGain(); revFB2.gain.value = 0.45;
    const reverbWet = ctx.createGain(); reverbWet.gain.value = p.reverb * 0.5;

    const master = ctx.createGain(); master.gain.value = p.masterVolume * 0.55;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0;
    limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.05;

    input.connect(driveNode);
    driveNode.connect(toneFilter);
    toneFilter.connect(master);
    toneFilter.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    feedbackGain.connect(wetGain);
    wetGain.connect(master);
    toneFilter.connect(rev1); rev1.connect(revFB1); revFB1.connect(rev1); rev1.connect(reverbWet);
    toneFilter.connect(rev2); rev2.connect(revFB2); revFB2.connect(rev2); rev2.connect(reverbWet);
    reverbWet.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const nodes: SynthNodes = { input, drive: driveNode, tone: toneFilter, delay: delayNode, feedback: feedbackGain, wet: wetGain, reverbWet, master };
    nodesRef.current = nodes;
    return { ctx, nodes };
  }, []);

  useEffect(() => {
    const n = nodesRef.current; const ctx = ctxRef.current;
    if (!n || !ctx) return;
    const t = ctx.currentTime;
    n.drive.curve = createDistortionCurve(drive);
    n.tone.frequency.setTargetAtTime(500 * Math.pow(16, tone), t, 0.05);
    n.delay.delayTime.setTargetAtTime(mapDelayTime(echo), t, 0.05);
    n.feedback.gain.setTargetAtTime(mapFeedback(echo), t, 0.05);
    n.wet.gain.setTargetAtTime(echo * 0.5, t, 0.05);
    n.reverbWet.gain.setTargetAtTime(reverb * 0.5, t, 0.05);
    n.master.gain.setTargetAtTime(masterVolume * 0.55, t, 0.05);
  }, [drive, echo, tone, reverb, masterVolume]);

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
