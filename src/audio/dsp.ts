export type DriveShape =
  | "screamer"
  | "fuzz"
  | "clean"
  | "rectifier"
  | "smooth"
  | "starved"
  | "grunge"
  | "tube"
  | "turbo";

function shapeScreamer(x: number, a: number): number {
  const k = Math.pow(a, 2.2) * 9;
  const makeup = 1 / (1 + Math.pow(a, 1.5) * 0.8);
  if (x > 0) return (makeup * (1 + k) * x) / (1 + k * Math.abs(x));
  const kn = k * (1 + a * 0.6);
  return (makeup * (1 + kn) * x) / (1 + kn * Math.pow(Math.abs(x), 0.85));
}

function shapeFuzz(x: number, a: number): number {
  const kp = 2 + 11 * Math.pow(a, 1.45);
  const kn = kp * 1.55;
  const makeup = 1 / (1.25 + a * 0.5);
  const y = x > 0 ? Math.tanh(kp * x) : Math.tanh(kn * x) * 0.92;
  return y * makeup;
}

function shapeClean(x: number, a: number): number {
  const m = 0.12 + 0.38 * a;
  const even = 0.06 * a;
  const y = x * (1 - m) + Math.tanh(x * 1.8) * m + even * x * x;
  return y / ((1 + even) * (1 + a * 0.1));
}

function softClip(u: number, p: number): number {
  return u / Math.pow(1 + Math.pow(Math.abs(u), p), 1 / p);
}

function shapeRectifier(x: number, a: number): number {
  const b1 = 0.5 * a;
  const b2 = 1.0 * a;
  const s1 = softClip((1 + 20 * a) * x + b1, 2.2) - softClip(b1, 2.2);
  const s2 = softClip((1 + 3 * a) * s1 + b2, 2.2) - softClip(b2, 2.2);
  return s2 * 0.4;
}

function shapeSmooth(x: number, a: number): number {
  const k = 1.5 + 9 * a;
  const makeup = 1 / (1 + a * 0.85);
  const y = x > 0 ? Math.atan(k * x) / Math.atan(k) : Math.atan(k * 1.15 * x) / Math.atan(k * 1.15);
  return y * makeup;
}

function shapeStarved(x: number, a: number): number {
  const b = 0.4 * a;
  return (softClip((1.6 + 9 * a) * x + b, 2.2) - softClip(b, 2.2)) * 0.5;
}

function shapeGrunge(x: number, a: number): number {
  const g = 1.6 + 16 * Math.pow(a, 1.2);
  const y = softClip(g * x, 2.4);
  const asym = x < 0 ? 0.86 : 1;
  return y * asym * (0.8 / (1 + a * 0.5));
}

function shapeTube(x: number, a: number): number {
  const k = 1.4 + 8 * Math.pow(a, 1.3);
  const bias = 0.18 * a;
  const y = Math.tanh(k * x + bias) - Math.tanh(bias);
  return y / (1 + a * 0.95);
}

function shapeTurbo(x: number, a: number): number {
  const g = 1.15 + 26 * Math.pow(a, 1.55);
  const bias = 0.1 * a;
  return (softClip(g * x + bias, 4.3) - softClip(bias, 4.3)) * (0.72 / (1 + a * 0.42));
}

const DRIVE_SHAPES: Record<DriveShape, (x: number, a: number) => number> = {
  screamer: shapeScreamer,
  fuzz: shapeFuzz,
  clean: shapeClean,
  rectifier: shapeRectifier,
  smooth: shapeSmooth,
  starved: shapeStarved,
  grunge: shapeGrunge,
  tube: shapeTube,
  turbo: shapeTurbo,
};

export function createDistortionCurve(
  amount: number,
  shape: DriveShape = "screamer",
): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  const fn = DRIVE_SHAPES[shape];
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = fn(x, amount);
  }
  return curve;
}

export function driveOversample(amount: number, shape: DriveShape = "screamer"): OverSampleType {
  if (shape === "clean") return "none";
  if (shape === "starved") return amount >= 0.25 ? "2x" : "none";
  if (shape === "fuzz" || shape === "rectifier" || shape === "grunge")
    return amount >= 0.4 ? "2x" : "none";
  if (shape === "tube" || shape === "turbo") return amount >= 0.3 ? "2x" : "none";
  return amount >= 0.6 ? "2x" : "none";
}

export function mapDrivePreGain(value: number): number {
  return 1 + Math.pow(value, 1.5) * 1.8;
}

export function synthDriveTrim(amount: number, shape: DriveShape = "screamer"): number {
  const fn = DRIVE_SHAPES[shape];
  const amp = 0.45 * mapDrivePreGain(amount);
  const S = 256;
  const ys = new Float64Array(S);
  let mean = 0;
  for (let i = 0; i < S; i++) {
    const x = Math.max(-1, Math.min(1, ((2 * i) / S - 1) * amp));
    ys[i] = fn(x, amount);
    mean += ys[i];
  }
  mean /= S;
  let sum = 0;
  for (const y of ys) sum += (y - mean) * (y - mean);
  const rms = Math.sqrt(sum / S);
  return 0.14 / Math.max(rms, 0.02);
}

export function masterGainFromKnob(value: number): number {
  if (value <= 0) return 0;
  return (Math.pow(10, 2 * Math.min(1, value)) - 1) / 99;
}

type CabShape = {
  lowCut: number;
  bodyHz: number;
  bodyGain: number;
  presHz: number;
  presGain: number;
  topCut: number;
};

type Biquad = [number, number, number, number, number];

function biquadCoef(
  type: "lowpass" | "highpass" | "peaking",
  f0: number,
  q: number,
  gainDb: number,
  rate: number,
): Biquad {
  const w0 = (2 * Math.PI * f0) / rate;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (type === "peaking") {
    const A = Math.pow(10, gainDb / 40);
    const alpha = sw / (2 * q);
    b0 = 1 + alpha * A;
    b1 = -2 * cw;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cw;
    a2 = 1 - alpha / A;
  } else {
    const alpha = sw / (2 * Math.pow(10, q / 20));
    if (type === "lowpass") {
      b0 = (1 - cw) / 2;
      b1 = 1 - cw;
      b2 = b0;
    } else {
      b0 = (1 + cw) / 2;
      b1 = -(1 + cw);
      b2 = b0;
    }
    a0 = 1 + alpha;
    a1 = -2 * cw;
    a2 = 1 - alpha;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function biquadMag([b0, b1, b2, a1, a2]: Biquad, f: number, rate: number): number {
  const w = (2 * Math.PI * f) / rate;
  const nr = b0 + b1 * Math.cos(w) + b2 * Math.cos(2 * w);
  const ni = -(b1 * Math.sin(w) + b2 * Math.sin(2 * w));
  const dr = 1 + a1 * Math.cos(w) + a2 * Math.cos(2 * w);
  const di = -(a1 * Math.sin(w) + a2 * Math.sin(2 * w));
  return Math.hypot(nr, ni) / Math.hypot(dr, di);
}

export function cabTrim(cab: CabShape, rate = 48000): number {
  const stages: Biquad[] = [
    biquadCoef("highpass", cab.lowCut, 0.707, 0, rate),
    biquadCoef("peaking", cab.bodyHz, 0.9, cab.bodyGain, rate),
    biquadCoef("peaking", cab.presHz, 1.0, cab.presGain, rate),
    biquadCoef("lowpass", cab.topCut, 0.9, 0, rate),
  ];
  let shaped = 0;
  let flat = 0;
  for (let k = 1; k <= 120; k++) {
    const f = 220 * k;
    if (f > rate / 2) break;
    const a = 1 / k;
    let g = 1;
    for (const c of stages) g *= biquadMag(c, f, rate);
    shaped += a * g * (a * g);
    flat += a * a;
  }
  return Math.sqrt(flat / Math.max(shaped, 1e-12));
}

const CAB_DESIGN_N = 16384;
const CAB_IR_LEN = 2048;
const CAB_MODES = 7;

// Radix-2 in-place complex FFT. `inverse` also applies the 1/N scale.
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * cr - im[i + k + half] * ci;
        const vi = re[i + k + half] * ci + im[i + k + half] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// Small deterministic PRNG. The cab has to sound identical on every reload, so
// the breakup modes cannot come from Math.random the way the reverb tail does.
function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A speaker is not four biquads: the cone breaks into modes that put a fine
// ripple across the mids, and the whole thing is minimum phase. Build the
// target magnitude from the same cascade the biquad nodes used - so the voicing
// and the broadband gain carry over untouched - add the breakup ripple those
// four filters cannot express, then realise it as a minimum-phase impulse so
// the pick attack stays tight instead of smearing.
export function createCabIR(cab: CabShape, rate: number): Float32Array<ArrayBuffer> {
  const N = CAB_DESIGN_N;
  const stages: Biquad[] = [
    biquadCoef("highpass", cab.lowCut, 0.707, 0, rate),
    biquadCoef("peaking", cab.bodyHz, 0.9, cab.bodyGain, rate),
    biquadCoef("peaking", cab.presHz, 1.0, cab.presGain, rate),
    biquadCoef("lowpass", cab.topCut, 0.9, 0, rate),
  ];
  const rnd = lcg(Math.round(cab.bodyHz * 7 + cab.presHz * 3 + cab.topCut));
  const modes: Biquad[] = [];
  for (let m = 0; m < CAB_MODES; m++) {
    modes.push(
      biquadCoef("peaking", 900 * Math.pow(5, rnd()), 5 + rnd() * 7, (rnd() * 2 - 1) * 3, rate),
    );
  }

  const half = N / 2;
  const baseLog = new Float64Array(half + 1);
  const modeLog = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) {
    const f = (k * rate) / N;
    let g = 1;
    for (const c of stages) g *= biquadMag(c, f, rate);
    baseLog[k] = Math.log(Math.max(g, 1e-7));
    let mg = 1;
    for (const c of modes) mg *= biquadMag(c, f, rate);
    modeLog[k] = Math.log(mg);
  }

  // Left alone, seven resonances land wherever the seed puts them and several
  // can stack inside the same octave, which drags the voicing off the profile
  // the four filters describe. Subtract their own octave-wide average so what
  // survives is fine grain either side of zero, not a tilt.
  const pre = new Float64Array(half + 2);
  for (let k = 0; k <= half; k++) pre[k + 1] = pre[k] + modeLog[k];

  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let k = 0; k <= half; k++) {
    let v = baseLog[k];
    if (k > 0) {
      const lo = Math.max(1, Math.round(k / Math.SQRT2));
      const hi = Math.min(half, Math.round(k * Math.SQRT2));
      v += modeLog[k] - (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
    }
    re[k] = v;
    if (k > 0 && k < half) re[N - k] = v;
  }

  fft(re, im, true);
  const fre = new Float64Array(N);
  const fim = new Float64Array(N);
  fre[0] = re[0];
  for (let n = 1; n < N / 2; n++) fre[n] = 2 * re[n];
  fre[N / 2] = re[N / 2];
  fft(fre, fim, false);
  for (let k = 0; k < N; k++) {
    const m = Math.exp(fre[k]);
    fre[k] = m * Math.cos(fim[k]);
    fim[k] = m * Math.sin(fim[k]);
  }
  fft(fre, fim, true);

  const ir = new Float32Array(CAB_IR_LEN);
  const fade = Math.floor(CAB_IR_LEN * 0.25);
  const fadeFrom = CAB_IR_LEN - fade;
  for (let i = 0; i < CAB_IR_LEN; i++) {
    const w = i < fadeFrom ? 1 : 0.5 * (1 + Math.cos((Math.PI * (i - fadeFrom)) / fade));
    ir[i] = fre[i] * w;
  }
  return ir;
}

const COMP_STEPS = 2048;
const COMP_KNEE_DB = 8;

type CompShape = { threshold: number; ratio: number; makeup: number };

export function createRectifierCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(COMP_STEPS);
  for (let i = 0; i < COMP_STEPS; i++) curve[i] = Math.abs((i / (COMP_STEPS - 1)) * 2 - 1);
  return curve;
}

export function createCompCurve(comp: CompShape): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(COMP_STEPS);
  const slope = 1 - 1 / Math.max(1, comp.ratio);
  const half = COMP_KNEE_DB / 2;
  for (let i = 0; i < COMP_STEPS; i++) {
    const env = Math.max(0, (i / (COMP_STEPS - 1)) * 2 - 1);
    const over = 20 * Math.log10(Math.max(env, 1e-5)) - comp.threshold;
    const cut =
      over >= half
        ? over * slope
        : over > -half
          ? (slope * (over + half) * (over + half)) / (2 * COMP_KNEE_DB)
          : 0;
    curve[i] = Math.pow(10, (comp.makeup - cut) / 20);
  }
  return curve;
}

type GateShape = { threshold: number; knee: number };

export const GATE_ENV_HZ = 20;

// A WaveShaper table is linear in amplitude, so a threshold down at -60 dBFS
// lands within a couple of entries of the 2048-step curve and quantises into a
// staircase. Lift the envelope by this much before it indexes the table, then
// subtract it again when reading the level back, so the usable region spans
// hundreds of entries. Anything hotter than -GATE_LUT_BOOST clamps to the last
// entry, which is fully open, so the boost has to stay under the lowest
// threshold the rigs ask for.
export const GATE_LUT_BOOST = 40;

export function createGateCurve(gate: GateShape): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(COMP_STEPS);
  for (let i = 0; i < COMP_STEPS; i++) {
    const env = Math.max(0, (i / (COMP_STEPS - 1)) * 2 - 1);
    const db = 20 * Math.log10(Math.max(env, 1e-6)) - GATE_LUT_BOOST;
    const t = Math.min(1, Math.max(0, 1 + (db - gate.threshold) / gate.knee));
    curve[i] = t * t * (3 - 2 * t);
  }
  return curve;
}

type AmpShape = { bias: number; sag: number };

// Bias moves with the note; the supply behind it recovers slower.
export const AMP_ENV_HZ = 15;
export const AMP_SAG_HZ = 5;

// A WaveShaper has no memory: at a given input level it always returns the
// same harmonics, which is the one thing that reads as "digital" no matter how
// good the curve is. Sliding a DC offset in front of it with the envelope ties
// the harmonic mix to how hard the last few notes were. The offset grows with
// level, feeding in even harmonics exactly while hard clipping is crowding the
// spectrum with odd ones, so the tone thickens under attack instead of
// squaring off. tanh bounds it so a hot input cannot run it away.
export function createBiasCurve(amp: AmpShape): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(COMP_STEPS);
  for (let i = 0; i < COMP_STEPS; i++) {
    const env = Math.max(0, (i / (COMP_STEPS - 1)) * 2 - 1);
    curve[i] = amp.bias * Math.tanh(env * 2);
  }
  return curve;
}

// Supply droop, ahead of the shaper rather than behind it. The compressor
// after the drive only changes how loud the distortion is; pulling the level
// down before the drive changes how much distortion there is at all.
export function createSagCurve(amp: AmpShape): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(COMP_STEPS);
  for (let i = 0; i < COMP_STEPS; i++) {
    const env = Math.max(0, (i / (COMP_STEPS - 1)) * 2 - 1);
    curve[i] = 1 - amp.sag * Math.tanh(env * 1.6);
  }
  return curve;
}

export const LIMITER_THRESHOLD = 0.82;

export function createLimiterCurve(threshold = LIMITER_THRESHOLD): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    const a = Math.abs(x);
    const y =
      a <= threshold
        ? a
        : threshold + (1 - threshold) * Math.tanh((a - threshold) / (1 - threshold));
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

export function createReverbIR(
  sampleRate: number,
  decay: number,
  tone: number,
  width: number,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const len = Math.floor(sampleRate * decay * 0.8);
  const fadeStart = Math.floor(len * 0.92);
  const left = new Float32Array(len);
  const right = new Float32Array(len);

  const tau = decay / 6.9078;
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * tone);
  const a = dt / (rc + dt);

  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const fade = i > fadeStart ? 1 - (i - fadeStart) / (len - fadeStart) : 1;
    const env = Math.exp(-t / tau) * Math.min(1, t / 0.006) * fade;
    const s = Math.random() * 2 - 1;
    const nl = Math.random() * 2 - 1;
    const nr = Math.random() * 2 - 1;
    lpL += a * (s * (1 - width) + nl * width - lpL);
    lpR += a * (s * (1 - width) + nr * width - lpR);
    left[i] = lpL * env;
    right[i] = lpR * env;
  }
  return [left, right];
}

export function createTapeCurve(drive = 1.3): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * drive) / drive;
  }
  return curve;
}
