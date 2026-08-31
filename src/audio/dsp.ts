export type DriveShape =
  | "screamer"
  | "fuzz"
  | "clean"
  | "rectifier"
  | "smooth"
  | "starved"
  | "grunge"
  | "tube";

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

const DRIVE_SHAPES: Record<DriveShape, (x: number, a: number) => number> = {
  screamer: shapeScreamer,
  fuzz: shapeFuzz,
  clean: shapeClean,
  rectifier: shapeRectifier,
  smooth: shapeSmooth,
  starved: shapeStarved,
  grunge: shapeGrunge,
  tube: shapeTube,
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
  if (shape === "tube") return amount >= 0.3 ? "2x" : "none";
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
