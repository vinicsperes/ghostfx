import { useCallback, useRef, useState } from "react";

export type TunerApi = {
  active: boolean;
  ready: boolean;
  note: string;
  cents: number;
  frequency: number;
  clarity: number;
  toggle: () => Promise<void>;
  error: string | null;
};

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function autoCorrelate(buf: Float32Array, sampleRate: number) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return { freq: -1, clarity: 0 };

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thres) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; } }

  const trimmed = buf.slice(r1, r2);
  const L = trimmed.length;
  const c = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < L - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < L; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return { freq: sampleRate / T0, clarity: maxval / c[0] };
}

export function useTuner(): TunerApi {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("-");
  const [cents, setCents] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const init = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      setReady(true);
    } catch (e) {
      setError("Mic access denied");
    }
  }, []);

  const update = useCallback(() => {
    if (!analyserRef.current || !ctxRef.current) return;
    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);
    const { freq, clarity: c } = autoCorrelate(buf, ctxRef.current.sampleRate);

    if (freq > 0 && c > 0.8) {
      const h = Math.round(12 * (Math.log(freq / 440) / Math.log(2)));
      const noteIdx = (h + 69) % 12;
      const ct = Math.floor((1200 * Math.log(freq / (440 * Math.pow(2, h / 12)))) / Math.log(2));
      setNote(NOTES[noteIdx < 0 ? noteIdx + 12 : noteIdx]);
      setCents(ct);
      setFrequency(freq);
      setClarity(c);
    }
    rafRef.current = requestAnimationFrame(update);
  }, []);

  const toggle = useCallback(async () => {
    if (!ctxRef.current) await init();
    const next = !active;
    setActive(next);
    if (next) update();
    else if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [active, init, update]);

  return { active, ready, note, cents, frequency, clarity, toggle, error };
}
