export type DriveShape =
  | "screamer"
  | "fuzz"
  | "clean"
  | "rectifier"
  | "smooth"
  | "starved"
  | "grunge";

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

const DRIVE_SHAPES: Record<DriveShape, (x: number, a: number) => number> = {
  screamer: shapeScreamer,
  fuzz: shapeFuzz,
  clean: shapeClean,
  rectifier: shapeRectifier,
  smooth: shapeSmooth,
  starved: shapeStarved,
  grunge: shapeGrunge,
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

export function createLimiterCurve(threshold = 0.82): Float32Array<ArrayBuffer> {
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
