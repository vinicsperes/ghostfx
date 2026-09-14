import {
  createCabIR,
  createCompCurve,
  createDistortionCurve,
  createGateCurve,
  createRectifierCurve,
  createReverbIR,
  createTapeCurve,
  driveOversample,
  GATE_ENV_HZ,
  GATE_LUT_BOOST,
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
  gateIn: GainNode;
  gateRect: WaveShaperNode;
  gateEnv: BiquadFilterNode;
  gateBoost: GainNode;
  gateMap: WaveShaperNode;
  gateGain: GainNode;
  preFilter: BiquadFilterNode;
  midEmphasis: BiquadFilterNode;
  preGain: GainNode;
  drive: WaveShaperNode;
  driveTrim: GainNode;
  stageHP: BiquadFilterNode;
  stageLP: BiquadFilterNode;
  stageGain: GainNode;
  stage2: WaveShaperNode;
  compRect: WaveShaperNode;
  compEnv: BiquadFilterNode;
  compMap: WaveShaperNode;
  compGain: GainNode;
  cabConvA: ConvolverNode;
  cabConvB: ConvolverNode;
  cabWetA: GainNode;
  cabWetB: GainNode;
  cabSum: GainNode;
  toneFilter: BiquadFilterNode;
  delay: DelayNode;
  delayR: DelayNode;
  panL: StereoPannerNode;
  panR: StereoPannerNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  feedback: GainNode;
  delayLoopHP: BiquadFilterNode;
  delayLoopLP: BiquadFilterNode;
  delaySat: WaveShaperNode;
  pong: GainNode;
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

// The gate sits ahead of the drive, so it cannot see how hard the stages
// behind it will lift the noise floor. Track the drive knob instead: the
// hotter the rig is set, the earlier the gate has to shut.
const GATE_DRIVE_TRACK = 7;

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

export function mixNorm(
  p: { echo: number; reverb: number; mod: number },
  rig: { mod: ModProfile; delay: { wet: number }; send: { wet: number } },
): number {
  const ch = chorusOf(rig.mod);
  const wet = p.echo * rig.delay.wet + p.reverb * rig.send.wet + p.mod * ch.mixMax;
  const throb = tremoloDepth(rig.mod, p.mod);
  return 1 / (Math.sqrt(1 + wet * wet) * (1 - throb * 0.42));
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

const cabCache = new Map<number, Float32Array<ArrayBuffer>[]>();

export function cabBuffers(ctx: BaseAudioContext): AudioBuffer[] {
  const rate = ctx.sampleRate;
  let raw = cabCache.get(rate);
  if (!raw) {
    raw = RIGS.map(({ cab }) => createCabIR(cab, rate));
    cabCache.set(rate, raw);
  }
  return raw.map((ir) => {
    const buf = ctx.createBuffer(1, ir.length, rate);
    buf.copyToChannel(ir, 0);
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

  nodes.gateMap.curve = createGateCurve({
    threshold: rig.gate.threshold + p.drive * GATE_DRIVE_TRACK,
    knee: rig.gate.knee,
  });

  nodes.drive.curve = createDistortionCurve(p.drive, dp.shape);
  nodes.drive.oversample = driveOversample(p.drive, dp.shape);
  nodes.preGain.gain.setTargetAtTime(mapDrivePreGain(p.drive), t, ramp);

  nodes.toneFilter.frequency.setTargetAtTime(600 * Math.pow(20, p.tone), t, ramp);

  const s2 = dp.stage2;
  nodes.stageGain.gain.setTargetAtTime(
    s2 ? 1 + (s2.gain - 1) * Math.pow(p.drive, 1.5) : 1,
    t,
    ramp,
  );
  nodes.stageHP.frequency.setTargetAtTime(s2 ? s2.hp : 20, t, ramp);
  nodes.stageLP.frequency.setTargetAtTime(s2 ? s2.lp : 20000, t, ramp);
  nodes.stage2.curve = s2
    ? createDistortionCurve(s2.amount * Math.pow(p.drive, 1.8), s2.shape)
    : createDistortionCurve(0, "clean");

  const time = dl.timeMin + p.echo * (dl.timeMax - dl.timeMin);
  nodes.delay.delayTime.setTargetAtTime(time, t, ramp);
  nodes.delayR.delayTime.setTargetAtTime(time * dl.bounce, t, ramp);
  nodes.panL.pan.setTargetAtTime(-dl.spread, t, ramp);
  nodes.panR.pan.setTargetAtTime(dl.spread, t, ramp);
  nodes.lfoGain.gain.setTargetAtTime(0.003 * p.echo, t, ramp);
  nodes.feedback.gain.setTargetAtTime(dl.fbMin + p.echo * (dl.fbMax - dl.fbMin), t, ramp);
  nodes.pong.gain.setTargetAtTime(dl.pong, t, ramp);
  nodes.wet.gain.setTargetAtTime(p.echo * dl.wet, t, ramp);

  nodes.reverbWet.gain.setTargetAtTime(p.reverb * rig.send.wet, t, ramp);

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

  nodes.mix.gain.setTargetAtTime(mixNorm(p, rig), t, ramp);
}

export function buildChain(
  ctx: BaseAudioContext,
  p: ChainParams,
  irBuffers: AudioBuffer[],
  cabIRs: AudioBuffer[],
): { input: AudioNode; output: GainNode; nodes: ChainNodes } {
  const idx = p.presetIdx ?? 0;
  const rig = rigAt(idx);
  const dp = rig.drive;
  const dl = rig.delay;
  const mp = rig.mod;

  const gateIn = ctx.createGain();

  const gateRect = ctx.createWaveShaper();
  gateRect.curve = createRectifierCurve();
  gateRect.oversample = "none";

  const gateEnv = ctx.createBiquadFilter();
  gateEnv.type = "lowpass";
  gateEnv.frequency.value = GATE_ENV_HZ;
  gateEnv.Q.value = 0.5;

  const gateBoost = ctx.createGain();
  gateBoost.gain.value = Math.pow(10, GATE_LUT_BOOST / 20);

  const gateMap = ctx.createWaveShaper();
  gateMap.curve = createGateCurve({
    threshold: rig.gate.threshold + p.drive * GATE_DRIVE_TRACK,
    knee: rig.gate.knee,
  });
  gateMap.oversample = "none";

  const gateGain = ctx.createGain();
  gateGain.gain.value = 0;

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

  const s2 = dp.stage2;

  const stageHP = ctx.createBiquadFilter();
  stageHP.type = "highpass";
  stageHP.frequency.value = s2 ? s2.hp : 20;
  stageHP.Q.value = 0.707;

  const stageLP = ctx.createBiquadFilter();
  stageLP.type = "lowpass";
  stageLP.frequency.value = s2 ? s2.lp : 20000;
  stageLP.Q.value = 0.707;

  const stageGain = ctx.createGain();
  stageGain.gain.value = s2 ? 1 + (s2.gain - 1) * Math.pow(p.drive, 1.5) : 1;

  const stage2 = ctx.createWaveShaper();
  stage2.curve = s2
    ? createDistortionCurve(s2.amount * Math.pow(p.drive, 1.8), s2.shape)
    : createDistortionCurve(0, "clean");
  stage2.oversample = s2 ? "2x" : "none";

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

  // normalize has to stay off: the IR is built to carry the exact broadband
  // gain the four biquads had, and each rig's drive trim is calibrated against
  // that. Letting the convolver rescale it would move every rig's level.
  const cabConvA = ctx.createConvolver();
  cabConvA.normalize = false;
  cabConvA.buffer = cabIRs[idx] ?? null;
  const cabConvB = ctx.createConvolver();
  cabConvB.normalize = false;

  const cabWetA = ctx.createGain();
  cabWetA.gain.value = 1;
  const cabWetB = ctx.createGain();
  cabWetB.gain.value = 0;

  const cabSum = ctx.createGain();

  const toneFilter = ctx.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.value = 600 * Math.pow(20, p.tone);

  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = dl.timeMin + p.echo * (dl.timeMax - dl.timeMin);
  const delayR = ctx.createDelay(2.0);
  delayR.delayTime.value = delay.delayTime.value * dl.bounce;
  const panL = ctx.createStereoPanner();
  panL.pan.value = -dl.spread;
  const panR = ctx.createStereoPanner();
  panR.pan.value = dl.spread;

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

  const pong = ctx.createGain();
  pong.gain.value = dl.pong;

  const wet = ctx.createGain();
  wet.gain.value = p.echo * dl.wet;

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
  reverbWet.gain.value = p.reverb * send.wet;

  const mix = ctx.createGain();
  mix.gain.value = mixNorm(p, rig);

  const effects = ctx.createGain();
  effects.gain.value = 1;

  gateIn.connect(gateRect);
  gateRect.connect(gateEnv);
  gateEnv.connect(gateBoost);
  gateBoost.connect(gateMap);
  gateMap.connect(gateGain.gain);
  gateIn.connect(gateGain);
  gateGain.connect(preFilter);

  preFilter.connect(midEmphasis);
  midEmphasis.connect(preGain);
  preGain.connect(drive);
  drive.connect(stageHP);
  stageHP.connect(stageLP);
  stageLP.connect(stageGain);
  stageGain.connect(stage2);
  stage2.connect(driveTrim);
  driveTrim.connect(compRect);
  compRect.connect(compEnv);
  compEnv.connect(compMap);
  compMap.connect(compGain.gain);
  driveTrim.connect(compGain);
  compGain.connect(cabConvA);
  compGain.connect(cabConvB);
  cabConvA.connect(cabWetA);
  cabConvB.connect(cabWetB);
  cabWetA.connect(cabSum);
  cabWetB.connect(cabSum);
  cabSum.connect(toneFilter);

  mix.connect(trem);
  trem.connect(effects);

  toneFilter.connect(mix);

  toneFilter.connect(delay);
  delay.connect(panL);
  panL.connect(wet);
  delay.connect(delayR);
  delayR.connect(delayLoopHP);
  delayLoopHP.connect(delayLoopLP);
  delayLoopLP.connect(delaySat);
  delaySat.connect(panR);
  panR.connect(pong);
  pong.connect(wet);
  delaySat.connect(feedback);
  feedback.connect(delay);
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
    input: gateIn,
    output: effects,
    nodes: {
      gateIn,
      gateRect,
      gateEnv,
      gateBoost,
      gateMap,
      gateGain,
      preFilter,
      midEmphasis,
      preGain,
      drive,
      driveTrim,
      stageHP,
      stageLP,
      stageGain,
      stage2,
      compRect,
      compEnv,
      compMap,
      compGain,
      cabConvA,
      cabConvB,
      cabWetA,
      cabWetB,
      cabSum,
      toneFilter,
      delay,
      delayR,
      panL,
      panR,
      lfo,
      lfoGain,
      feedback,
      delayLoopHP,
      delayLoopLP,
      delaySat,
      pong,
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
