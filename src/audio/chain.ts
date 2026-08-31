import {
  createCompCurve,
  createDistortionCurve,
  createRectifierCurve,
  createReverbIR,
  createTapeCurve,
  driveOversample,
  mapDrivePreGain,
} from "./dsp";
import { RIGS, rigAt, type ChorusProfile, type ModProfile } from "../data/presets";

export type SignalParams = {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  mod: number;
};

export type ChainParams = SignalParams & { presetIdx: number | null };

export type ChainNodes = {
  preFilter: BiquadFilterNode;
  midEmphasis: BiquadFilterNode;
  preGain: GainNode;
  drive: WaveShaperNode;
  driveTrim: GainNode;
  compRect: WaveShaperNode;
  compEnv: BiquadFilterNode;
  compMap: WaveShaperNode;
  compGain: GainNode;
  cabHP: BiquadFilterNode;
  cabBody: BiquadFilterNode;
  cabPres: BiquadFilterNode;
  cabLP: BiquadFilterNode;
  toneFilter: BiquadFilterNode;
  delay: DelayNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  feedback: GainNode;
  delayLoopHP: BiquadFilterNode;
  delayLoopLP: BiquadFilterNode;
  delaySat: WaveShaperNode;
  wet: GainNode;
  modDelay: DelayNode;
  modLfo: OscillatorNode;
  modDepth: GainNode;
  modDamp: BiquadFilterNode;
  modFb: GainNode;
  modWet: GainNode;
  trem: GainNode;
  tremDepth: GainNode;
  reverbHP: BiquadFilterNode;
  reverbPre: DelayNode;
  convolverA: ConvolverNode;
  convolverB: ConvolverNode;
  reverbWetA: GainNode;
  reverbWetB: GainNode;
  reverbWet: GainNode;
  mix: GainNode;
  effects: GainNode;
};

const IDLE_CHORUS: Omit<ChorusProfile, "kind" | "rate"> = {
  base: 0.003,
  depthMin: 0,
  depthMax: 0,
  fbMax: 0,
  mixMax: 0,
  damp: 4000,
};

export function chorusOf(mp: ModProfile): Omit<ChorusProfile, "kind" | "rate"> {
  return mp.kind === "chorus" ? mp : IDLE_CHORUS;
}

export function tremoloDepth(mp: ModProfile, mod: number): number {
  return mp.kind === "tremolo" ? mod * mp.depth : 0;
}

export function mixNorm(p: { echo: number; reverb: number; mod: number }, mp: ModProfile): number {
  const ch = chorusOf(mp);
  const wet = p.echo * 0.5 + p.reverb * 0.5 + p.mod * ch.mixMax;
  const throb = tremoloDepth(mp, p.mod);
  return 1 / ((1 + 0.55 * wet) * (1 - throb * 0.5));
}

const irCache = new Map<number, [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>][]>();

export function reverbBuffers(ctx: BaseAudioContext): AudioBuffer[] {
  const rate = ctx.sampleRate;
  let raw = irCache.get(rate);
  if (!raw) {
    raw = RIGS.map(({ reverb: r }) => createReverbIR(rate, r.decay, r.tone, r.width));
    irCache.set(rate, raw);
  }
  return raw.map(([left, right]) => {
    const buf = ctx.createBuffer(2, left.length, rate);
    buf.copyToChannel(left, 0);
    buf.copyToChannel(right, 1);
    return buf;
  });
}

export function applyChainParams(
  ctx: BaseAudioContext,
  nodes: ChainNodes,
  p: ChainParams,
  ramp = 0.04,
): void {
  const rig = rigAt(p.presetIdx);
  const dp = rig.drive;
  const dl = rig.delay;
  const mp = rig.mod;
  const t = ctx.currentTime;

  nodes.drive.curve = createDistortionCurve(p.drive, dp.shape);
  nodes.drive.oversample = driveOversample(p.drive, dp.shape);
  nodes.preGain.gain.setTargetAtTime(mapDrivePreGain(p.drive), t, ramp);

  nodes.toneFilter.frequency.setTargetAtTime(600 * Math.pow(20, p.tone), t, ramp);

  nodes.delay.delayTime.setTargetAtTime(dl.timeMin + p.echo * (dl.timeMax - dl.timeMin), t, ramp);
  nodes.lfoGain.gain.setTargetAtTime(0.003 * p.echo, t, ramp);
  nodes.feedback.gain.setTargetAtTime(dl.fbMin + p.echo * (dl.fbMax - dl.fbMin), t, ramp);
  nodes.wet.gain.setTargetAtTime(p.echo * 0.5, t, ramp);

  nodes.reverbWet.gain.setTargetAtTime(p.reverb * 0.5, t, ramp);

  const ch = chorusOf(mp);
  nodes.modLfo.frequency.setTargetAtTime(mp.rate, t, ramp);
  nodes.modDelay.delayTime.setTargetAtTime(ch.base, t, ramp);
  nodes.modDamp.frequency.setTargetAtTime(ch.damp, t, ramp);
  nodes.modDepth.gain.setTargetAtTime(ch.depthMin + p.mod * (ch.depthMax - ch.depthMin), t, ramp);
  nodes.modFb.gain.setTargetAtTime(p.mod * ch.fbMax, t, ramp);
  nodes.modWet.gain.setTargetAtTime(p.mod * ch.mixMax, t, ramp);

  const throb = tremoloDepth(mp, p.mod);
  nodes.tremDepth.gain.setTargetAtTime(throb, t, ramp);
  nodes.trem.gain.setTargetAtTime(1 - throb, t, ramp);

  nodes.mix.gain.setTargetAtTime(mixNorm(p, mp), t, ramp);
}

export function buildChain(
  ctx: BaseAudioContext,
  p: ChainParams,
  irBuffers: AudioBuffer[],
): { input: AudioNode; output: GainNode; nodes: ChainNodes } {
  const idx = p.presetIdx ?? 0;
  const rig = rigAt(idx);
  const dp = rig.drive;
  const cab = rig.cab;
  const dl = rig.delay;
  const mp = rig.mod;

  const preFilter = ctx.createBiquadFilter();
  preFilter.type = "highpass";
  preFilter.frequency.value = dp.preHp;

  const midEmphasis = ctx.createBiquadFilter();
  midEmphasis.type = "peaking";
  midEmphasis.frequency.value = dp.midHz;
  midEmphasis.Q.value = 0.7;
  midEmphasis.gain.value = dp.midGain;

  const preGain = ctx.createGain();
  preGain.gain.value = mapDrivePreGain(p.drive);

  const drive = ctx.createWaveShaper();
  drive.curve = createDistortionCurve(p.drive, dp.shape);
  drive.oversample = driveOversample(p.drive, dp.shape);

  const driveTrim = ctx.createGain();
  driveTrim.gain.value = dp.trim;

  const compRect = ctx.createWaveShaper();
  compRect.curve = createRectifierCurve();
  compRect.oversample = "none";

  const compEnv = ctx.createBiquadFilter();
  compEnv.type = "lowpass";
  compEnv.frequency.value = rig.comp.speed;
  compEnv.Q.value = 0.5;

  const compMap = ctx.createWaveShaper();
  compMap.curve = createCompCurve(rig.comp);
  compMap.oversample = "none";

  const compGain = ctx.createGain();
  compGain.gain.value = 0;

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
  toneFilter.frequency.value = 600 * Math.pow(20, p.tone);

  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = dl.timeMin + p.echo * (dl.timeMax - dl.timeMin);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.85;
  lfoGain.gain.value = 0.003 * p.echo;
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  const feedback = ctx.createGain();
  feedback.gain.value = dl.fbMin + p.echo * (dl.fbMax - dl.fbMin);

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

  const wet = ctx.createGain();
  wet.gain.value = p.echo * 0.5;

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

  const send = rig.send;

  const reverbHP = ctx.createBiquadFilter();
  reverbHP.type = "highpass";
  reverbHP.frequency.value = send.lowCut;
  reverbHP.Q.value = 0.707;

  const reverbPre = ctx.createDelay(0.2);
  reverbPre.delayTime.value = rig.reverb.predelay;

  const convolverA = ctx.createConvolver();
  convolverA.normalize = true;
  convolverA.buffer = irBuffers[idx];
  const convolverB = ctx.createConvolver();
  convolverB.normalize = true;

  const reverbWetA = ctx.createGain();
  reverbWetA.gain.value = 1;
  const reverbWetB = ctx.createGain();
  reverbWetB.gain.value = 0;

  const reverbWet = ctx.createGain();
  reverbWet.gain.value = p.reverb * 0.5;

  const mix = ctx.createGain();
  mix.gain.value = mixNorm(p, mp);

  const effects = ctx.createGain();
  effects.gain.value = 1;

  preFilter.connect(midEmphasis);
  midEmphasis.connect(preGain);
  preGain.connect(drive);
  drive.connect(driveTrim);
  driveTrim.connect(compRect);
  compRect.connect(compEnv);
  compEnv.connect(compMap);
  compMap.connect(compGain.gain);
  driveTrim.connect(compGain);
  compGain.connect(cabHP);
  cabHP.connect(cabBody);
  cabBody.connect(cabPres);
  cabPres.connect(cabLP);
  cabLP.connect(toneFilter);

  mix.connect(trem);
  trem.connect(effects);

  toneFilter.connect(mix);

  toneFilter.connect(delay);
  delay.connect(delayLoopHP);
  delayLoopHP.connect(delayLoopLP);
  delayLoopLP.connect(delaySat);
  delaySat.connect(feedback);
  feedback.connect(delay);
  delaySat.connect(wet);
  wet.connect(mix);

  toneFilter.connect(modDelay);
  modDelay.connect(modDamp);
  modDamp.connect(modFb);
  modFb.connect(modDelay);
  modDamp.connect(modWet);
  modWet.connect(mix);

  toneFilter.connect(reverbHP);
  reverbHP.connect(reverbPre);

  reverbPre.connect(convolverA);
  reverbPre.connect(convolverB);
  convolverA.connect(reverbWetA);
  convolverB.connect(reverbWetB);
  reverbWetA.connect(reverbWet);
  reverbWetB.connect(reverbWet);
  reverbWet.connect(mix);

  return {
    input: preFilter,
    output: effects,
    nodes: {
      preFilter,
      midEmphasis,
      preGain,
      drive,
      driveTrim,
      compRect,
      compEnv,
      compMap,
      compGain,
      cabHP,
      cabBody,
      cabPres,
      cabLP,
      toneFilter,
      delay,
      lfo,
      lfoGain,
      feedback,
      delayLoopHP,
      delayLoopLP,
      delaySat,
      wet,
      modDelay,
      modLfo,
      modDepth,
      modDamp,
      modFb,
      modWet,
      trem,
      tremDepth,
      reverbHP,
      reverbPre,
      convolverA,
      convolverB,
      reverbWetA,
      reverbWetB,
      reverbWet,
      mix,
      effects,
    },
  };
}
