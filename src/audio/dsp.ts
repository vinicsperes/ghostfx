export function createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  const k = Math.pow(amount, 2.2) * 9;
  const asym = 1 + amount * 0.6;
  const makeup = 1 / (1 + Math.pow(amount, 1.5) * 0.8);

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (x > 0) {
      curve[i] = (makeup * (1 + k) * x) / (1 + k * Math.abs(x));
    } else {
      const kn = k * asym;
      curve[i] = (makeup * (1 + kn) * x) / (1 + kn * Math.pow(Math.abs(x), 0.85));
    }
  }
  return curve;
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

export function mapFlangerDepth(value: number): number {
  return 0.0004 + value * 0.0018;
}

export function mapFlangerFb(value: number): number {
  return value * 0.22;
}

export function mapFlangerMix(value: number): number {
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
  const len = Math.floor(sampleRate * decay);
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
    const env = Math.exp(-t / tau) * Math.min(1, t / 0.006);
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
