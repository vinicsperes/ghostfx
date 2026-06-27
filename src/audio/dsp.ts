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

// Chorus: a short modulated delay mixed against the dry signal. Depth is the
// LFO swing (in seconds) around an ~18ms base delay; mix is the wet level.
export function mapChorusDepth(value: number): number {
  return 0.0008 + value * 0.0042;
}

export function mapChorusMix(value: number): number {
  return value * 0.7;
}

// Zero-latency brickwall-ish limiter as a WaveShaper curve. Replaces the output
// DynamicsCompressor, whose ~6ms lookahead was pure round-trip latency. Unity
// (transparent) below `threshold`, then a tanh soft-knee that asymptotes toward
// full scale — peaks soft-clip instantly instead of being delayed. Slope is
// continuous (=1) at the knee, so no audible kink. Use oversample:"none" on the
// shaper so it adds no latency of its own.
export function createLimiterCurve(threshold = 0.82): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    const a = Math.abs(x);
    const y = a <= threshold
      ? a
      : threshold + (1 - threshold) * Math.tanh((a - threshold) / (1 - threshold));
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}
