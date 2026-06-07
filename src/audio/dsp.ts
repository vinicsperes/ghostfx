export function createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  const k = Math.pow(amount, 1.7) * 16;
  const asym = 1 + amount * 0.6;

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (x > 0) {
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    } else {
      const kn = k * asym;
      curve[i] = (1 + kn) * x / (1 + kn * Math.pow(Math.abs(x), 0.85));
    }
  }
  return curve;
}

export function mapDrivePreGain(value: number): number {
  return 1 + Math.pow(value, 1.4) * 3.2;
}

export function mapDelayTime(value: number): number {
  return 0.15 + value * 0.45;
}

export function mapFeedback(value: number): number {
  return 0.2 + value * 0.45;
}
