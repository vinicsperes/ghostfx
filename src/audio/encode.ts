export function computePeaks(buf: AudioBuffer, buckets = 360): Float32Array {
  const ch = buf.getChannelData(0);
  const block = Math.max(1, Math.floor(ch.length / buckets));
  const peaks = new Float32Array(buckets);
  for (let b = 0; b < buckets; b++) {
    let max = 0;
    const start = b * block;
    for (let i = 0; i < block && start + i < ch.length; i++) {
      const a = Math.abs(ch[start + i]);
      if (a > max) max = a;
    }
    peaks[b] = max;
  }
  return peaks;
}

export function encodeWav(buf: AudioBuffer): Blob {
  const numCh = Math.min(buf.numberOfChannels, 2);
  const sr = buf.sampleRate;
  const len = buf.length;
  const blockAlign = numCh * 2;
  const dataSize = len * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(out);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  dv.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE");
  str(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * blockAlign, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, 16, true);
  str(36, "data");
  dv.setUint32(40, dataSize, true);
  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}

function floatToPcm(ch: Float32Array): Int16Array {
  const pcm = new Int16Array(ch.length);
  for (let i = 0; i < ch.length; i++) {
    const s = Math.max(-1, Math.min(1, ch[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm;
}

export async function encodeMp3(buf: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const numCh = Math.min(buf.numberOfChannels, 2);
  const enc = new Mp3Encoder(numCh, buf.sampleRate, 128);
  const left = floatToPcm(buf.getChannelData(0));
  const right = numCh === 2 ? floatToPcm(buf.getChannelData(1)) : null;
  const parts: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += 1152) {
    const mp3 = right
      ? enc.encodeBuffer(left.subarray(i, i + 1152), right.subarray(i, i + 1152))
      : enc.encodeBuffer(left.subarray(i, i + 1152));
    if (mp3.length > 0) parts.push(mp3);
  }
  const tail = enc.flush();
  if (tail.length > 0) parts.push(tail);
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}
