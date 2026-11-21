export type TWav = { data: Float32Array; rate: number; channels: number };

const readTag = (view: DataView, offset: number) =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );

export function parseWav(buffer: ArrayBuffer): TWav {
  const view = new DataView(buffer);
  if (view.byteLength < 44 || readTag(view, 0) !== 'RIFF' || readTag(view, 8) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }
  let rate = 44100;
  let channels = 1;
  let bits = 16;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = readTag(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      channels = view.getUint16(body + 2, true);
      rate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      if (bits !== 16) throw new Error('Only 16-bit PCM WAV files are supported');
      const frames = Math.floor(Math.min(size, view.byteLength - body) / (2 * channels));
      const data = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++)
          sum += view.getInt16(body + (i * channels + c) * 2, true);
        data[i] = sum / channels / 32768;
      }
      return { data, rate, channels };
    }
    offset = body + size + (size & 1);
  }
  throw new Error('WAV file has no data chunk');
}

export function encodeWav(input: Float32Array | Float32Array[], rate: number): Uint8Array {
  const channels = Array.isArray(input) ? input : [input];
  const count = channels.length;
  const frames = channels.reduce((min, channel) => Math.min(min, channel.length), Infinity);
  const dataBytes = frames * count * 2;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  const writeTag = (offset: number, tag: string) => {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, tag.charCodeAt(i));
  };
  writeTag(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  writeTag(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < count; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(44 + (i * count + c) * 2, Math.round(v * 32767), true);
    }
  }
  return bytes;
}
