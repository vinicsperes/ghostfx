export type DriveShape = "screamer" | "fuzz" | "clean" | "rectifier" | "smooth";

function shapeScreamer(x: number, a: number): number {
  const k = Math.pow(a, 2.2) * 9;
  const makeup = 1 / (1 + Math.pow(a, 1.5) * 0.8);
  if (x > 0) return (makeup * (1 + k) * x) / (1 + k * Math.abs(x));
  const kn = k * (1 + a * 0.6);
  return (makeup * (1 + kn) * x) / (1 + kn * Math.pow(Math.abs(x), 0.85));
}

function shapeFuzz(x: number, a: number): number {
  const kp = 4 + 30 * Math.pow(a, 1.3);
  const kn = kp * 1.7;
  const makeup = 1 / (1.8 + a * 0.2);
  const y = x > 0 ? Math.tanh(kp * x) : Math.tanh(kn * x) * 0.9;
  return y * makeup;
}

function shapeClean(x: number, a: number): number {
  const m = 0.12 + 0.38 * a;
  const even = 0.06 * a;
  const y = x * (1 - m) + Math.tanh(x * 1.8) * m + even * x * x;
  return y / ((1 + even) * (1 + a * 0.1));
}

function shapeRectifier(x: number, a: number): number {
  const th = 1 / (1 + a * 24);
  const makeup = 0.9 / Math.pow(th, 0.75);
  const u = x / th;
  return ((th * u) / Math.pow(1 + Math.pow(Math.abs(u), 8), 1 / 8)) * makeup;
}

function shapeSmooth(x: number, a: number): number {
  const k = 1.5 + 9 * a;
  const makeup = 1 / (1 + a * 0.85);
  const y = x > 0 ? Math.atan(k * x) / Math.atan(k) : Math.atan(k * 1.15 * x) / Math.atan(k * 1.15);
  return y * makeup;
}

const DRIVE_SHAPES: Record<DriveShape, (x: number, a: number) => number> = {
  screamer: shapeScreamer,
  fuzz: shapeFuzz,
  clean: shapeClean,
  rectifier: shapeRectifier,
  smooth: shapeSmooth,
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
  if (shape === "fuzz" || shape === "rectifier") return amount >= 0.4 ? "2x" : "none";
  return amount >= 0.6 ? "2x" : "none";
}

export function mapDrivePreGain(value: number): number {
  return 1 + Math.pow(value, 1.5) * 1.8;
}

export function mapDelayTime(value: number): number {
  return 0.15 + value * 0.45;
}

export function mapFeedback(value: number): number {
  return 0.2 + value * 0.45;
}

export function mapModDepth(value: number): number {
  return 0.0004 + value * 0.0018;
}

export function mapModFb(value: number): number {
  return value * 0.22;
}

export function mapModMix(value: number): number {
  return value * 0.4;
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
