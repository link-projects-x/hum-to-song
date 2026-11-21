import { describe, expect, it } from 'vitest';

import { encodeWav, parseWav } from './wav';

describe('wav', () => {
  it('round-trips 16-bit mono samples', () => {
    const samples = Float32Array.from([0, 0.5, -0.5, 1, -1, 0.25]);
    const parsed = parseWav(encodeWav(samples, 22050).slice().buffer);
    expect(parsed.rate).toBe(22050);
    expect(parsed.channels).toBe(1);
    parsed.data.forEach((value, i) => expect(value).toBeCloseTo(samples[i], 3));
  });

  it('writes interleaved stereo with a consistent header', () => {
    const left = Float32Array.from([0.5, 0.5, 0.5]);
    const right = Float32Array.from([-0.5, -0.5, -0.5]);
    const bytes = encodeWav([left, right], 44100);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(28, true)).toBe(44100 * 4);
    expect(view.getUint32(40, true)).toBe(12);
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect(parseWav(bytes.slice().buffer).data[0]).toBeCloseTo(0, 3);
  });

  it('rejects other files', () => {
    expect(() => parseWav(new Uint8Array(64).buffer)).toThrow(/Not a WAV/);
  });
});
