import { buildChain, reverbBuffers, type SignalParams } from "./chain";
import { CLEAN_RIG } from "../data/presets";
import { createLimiterCurve } from "./dsp";

export type Backing = {
  buffer: AudioBuffer;
  name: string;
  level: number;
  loop: boolean;
  start: number;
  end: number;
  offset: number;
};

export const REVERB_TAIL_S = 3;

export function backingPositionAt(backing: Backing, at: number): number {
  const span = backing.end - backing.start;
  if (!backing.loop || span <= 0) {
    return Math.min(backing.buffer.duration, Math.max(0, backing.offset + at));
  }
  const into = backing.offset - backing.start + at;
  return backing.start + (((into % span) + span) % span);
}

export function startBacking(
  ctx: BaseAudioContext,
  backing: Backing,
  target: AudioNode,
  {
    at,
    when = 0,
    stopAt,
    loopSpan,
  }: { at: number; when?: number; stopAt?: number; loopSpan?: number },
): { source: AudioBufferSourceNode; gain: GainNode } {
  const gain = ctx.createGain();
  gain.gain.value = backing.level;
  gain.connect(target);

  const from = backingPositionAt(backing, at);
  const source = ctx.createBufferSource();
  source.buffer = backing.buffer;
  if (loopSpan && loopSpan > 0) {
    source.loop = true;
    source.loopStart = from;
    source.loopEnd = Math.min(backing.buffer.duration, from + loopSpan);
  } else {
    source.loop = backing.loop && backing.end - backing.start > 0;
    source.loopStart = backing.start;
    source.loopEnd = backing.end;
  }
  source.connect(gain);
  source.start(when, from);
  if (stopAt !== undefined) source.stop(stopAt);

  return { source, gain };
}

function limiterNode(ctx: BaseAudioContext): WaveShaperNode {
  const limiter = ctx.createWaveShaper();
  limiter.curve = createLimiterCurve();
  limiter.oversample = "none";
  return limiter;
}

export async function renderLayers(
  buffers: AudioBuffer[],
  rate: number,
  region?: { start: number; end: number },
): Promise<AudioBuffer> {
  const full = Math.max(...buffers.map((b) => b.length));
  const from = region ? Math.max(0, region.start) : 0;
  const span = region ? Math.max(0, region.end - region.start) : full / rate;
  const frames = Math.max(1, Math.min(full, Math.round(span * rate)));
  const ctx = new OfflineAudioContext(2, frames, rate);
  const out = limiterNode(ctx);
  out.connect(ctx.destination);
  for (const buffer of buffers) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.start(0, from);
  }
  return ctx.startRendering();
}

export async function renderArrangement(
  clips: { buffer: AudioBuffer; at: number; from: number; span: number; level: number }[],
  rate: number,
  master = 1,
): Promise<AudioBuffer> {
  const total = clips.reduce((max, clip) => Math.max(max, clip.at + clip.span), 0);
  const frames = Math.max(1, Math.ceil(total * rate));
  const ctx = new OfflineAudioContext(2, frames, rate);
  const out = limiterNode(ctx);
  const bus = ctx.createGain();
  bus.gain.value = master;
  bus.connect(out);
  out.connect(ctx.destination);
  for (const clip of clips) {
    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    const gain = ctx.createGain();
    gain.gain.value = clip.level;
    gain.connect(bus);
    source.connect(gain);
    source.start(clip.at, clip.from, clip.span);
  }
  return ctx.startRendering();
}

export async function renderTake({
  rate,
  wet,
  dry,
  presetIdx,
  params,
  backing,
  region,
}: {
  rate: number;
  wet: AudioBuffer | null;
  dry: AudioBuffer | null;
  presetIdx: number;
  params: SignalParams;
  backing: Backing | null;
  region?: { start: number; end: number };
}): Promise<AudioBuffer> {
  const guitar = wet ?? dry;
  if (!guitar) throw new Error("no take audio");

  const from = Math.max(0, Math.min(guitar.duration, region?.start ?? 0));
  const to = Math.max(from, Math.min(guitar.duration, region?.end ?? guitar.duration));
  const clean = presetIdx === CLEAN_RIG;
  const tail = wet || clean ? 0 : REVERB_TAIL_S;
  const frames = Math.ceil((to - from + tail) * rate);
  const ctx = new OfflineAudioContext(2, frames, rate);

  const mix = ctx.createGain();
  const out = limiterNode(ctx);
  mix.connect(out);
  out.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = guitar;
  if (wet || clean) {
    source.connect(mix);
  } else {
    const chain = buildChain(ctx, { ...params, presetIdx }, reverbBuffers(ctx));
    const chainOut = limiterNode(ctx);
    source.connect(chain.input);
    chain.output.connect(chainOut);
    chainOut.connect(mix);
  }
  source.start(0, from);

  if (backing) startBacking(ctx, backing, mix, { at: from, stopAt: to - from });

  return ctx.startRendering();
}
