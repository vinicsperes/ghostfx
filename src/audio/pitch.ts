const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MIN_FREQ = 60;
const MAX_FREQ = 1400;
const TARGET_RATE = 12000;
const LOWPASS_HZ = 1800;
const RMS_GATE = 0.006;
const PEAK_RATIO = 0.9;
const CLARITY_GATE = 0.78;

export type Note = {
  name: string;
  octave: number;
  cents: number;
  midi: number;
};

export const GUITAR_STRINGS: { label: string; midi: number }[] = [
  { label: "E", midi: 40 },
  { label: "A", midi: 45 },
  { label: "D", midi: 50 },
  { label: "G", midi: 55 },
  { label: "B", midi: 59 },
  { label: "e", midi: 64 },
];

let samples: Float32Array | null = null;
let nsdf: Float32Array | null = null;

export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  let power = 0;
  for (let i = 0; i < buf.length; i++) power += buf[i] * buf[i];
  if (Math.sqrt(power / buf.length) < RMS_GATE) return null;

  const decim = Math.max(1, Math.round(sampleRate / TARGET_RATE));
  const rate = sampleRate / decim;
  const n = Math.floor(buf.length / decim);
  if (n < 256) return null;

  if (!samples || samples.length < n) samples = new Float32Array(n);
  const x = samples;

  const alpha = 1 - Math.exp((-2 * Math.PI * LOWPASS_HZ) / sampleRate);
  let lp1 = 0;
  let lp2 = 0;
  let write = 0;
  let step = 0;
  for (let i = 0; i < buf.length && write < n; i++) {
    lp1 += alpha * (buf[i] - lp1);
    lp2 += alpha * (lp1 - lp2);
    if (++step === decim) {
      x[write++] = lp2;
      step = 0;
    }
  }

  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  for (let i = 0; i < n; i++) x[i] -= mean;

  const minLag = Math.max(2, Math.floor(rate / MAX_FREQ));
  const maxLag = Math.min(n - 2, Math.floor(rate / MIN_FREQ));
  if (maxLag <= minLag + 2) return null;

  if (!nsdf || nsdf.length < maxLag + 2) nsdf = new Float32Array(maxLag + 2);
  const d = nsdf;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let ac = 0;
    let norm = 0;
    const span = n - lag;
    for (let i = 0; i < span; i++) {
      const a = x[i];
      const b = x[i + lag];
      ac += a * b;
      norm += a * a + b * b;
    }
    d[lag] = norm > 0 ? (2 * ac) / norm : 0;
  }

  let best = 0;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (d[lag] > d[lag - 1] && d[lag] >= d[lag + 1] && d[lag] > best) best = d[lag];
  }
  if (best < CLARITY_GATE) return null;

  const threshold = best * PEAK_RATIO;
  let chosen = -1;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (d[lag] > d[lag - 1] && d[lag] >= d[lag + 1] && d[lag] >= threshold) {
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) return null;

  const y0 = d[chosen - 1];
  const y1 = d[chosen];
  const y2 = d[chosen + 1];
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  const lag = chosen + Math.max(-1, Math.min(1, shift));

  const freq = rate / lag;
  return freq >= MIN_FREQ && freq <= MAX_FREQ ? freq : null;
}

export function noteFromFreq(freq: number): Note {
  const exact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exact);
  return {
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exact - midi) * 100),
    midi,
  };
}
