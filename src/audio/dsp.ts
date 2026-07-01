export function createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  // softer voicing: the steeper exponent keeps the lower half of the knob clean
  // (edge-of-breakup), so the mid presets stop sounding like the heavy ones
  const k = Math.pow(amount, 2.2) * 9;
  const asym = 1 + amount * 0.6;
  // makeup gain — saturation fattens the wave and raises RMS, so pull the level
  // back as drive rises; otherwise the dirty presets are just louder
  const makeup = 1 / (1 + Math.pow(amount, 1.5) * 0.8);

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (x > 0) {
      curve[i] = makeup * (1 + k) * x / (1 + k * Math.abs(x));
    } else {
      const kn = k * asym;
      curve[i] = makeup * (1 + kn) * x / (1 + kn * Math.pow(Math.abs(x), 0.85));
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

// Flanger (Electric Mistress voiced — the "Heart-Shaped Box" watery sweep): a
// short modulated delay with damped feedback (the resonant jet). Depth is the
// LFO swing in seconds around a ~2.5ms base delay; fb is the feedback that gives
// the resonance; mix is the wet level. Feedback is kept moderate and the loop is
// low-passed elsewhere so it sweeps instead of whistling.
export function mapFlangerDepth(value: number): number {
  return 0.0004 + value * 0.0018;
}

export function mapFlangerFb(value: number): number {
  return value * 0.22;
}

export function mapFlangerMix(value: number): number {
  return value * 0.4;
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

// Procedural stereo reverb impulse response — no assets, generated at init. An
// exponentially-decaying noise tail (reaches ~-60dB at `decay`), tone-shaped by a
// one-pole lowpass (lower `tone` = darker/bigger room), with a short onset fade so
// it diffuses in instead of clicking. L/R are decorrelated by `width` (1 = fully
// independent/widest, 0 = mono center) so a mono DI gets stereo width in the cans.
// Returns [left, right]; the caller wraps them in a 2-channel AudioBuffer.
export function createReverbIR(
  sampleRate: number,
  decay: number,
  tone: number,
  width: number,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const len = Math.floor(sampleRate * decay);
  const left = new Float32Array(len);
  const right = new Float32Array(len);

  const tau = decay / 6.9078; // ln(1000) → env hits ~-60dB at t = decay
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * tone);
  const a = dt / (rc + dt); // one-pole lowpass smoothing factor

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

// Gentle tape-style saturation for the delay feedback loop. Normalised so the
// small-signal slope is ~1 (unity at low level → doesn't add loop gain / runaway)
// and only the peaks soft-compress — gives repeats a warm, slightly squashed tape
// character instead of clean digital copies. oversample:"none" so it adds no
// latency inside the loop.
export function createTapeCurve(drive = 1.3): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * drive) / drive;
  }
  return curve;
}
