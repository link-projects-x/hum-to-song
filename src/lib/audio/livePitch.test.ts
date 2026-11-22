import { describe, expect, it } from 'vitest';

import { detectPitch } from './livePitch';

const tone = (hz: number, rate: number, harmonics = 1, gain = 0.3, length = 2048) => {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let value = 0;
    for (let k = 1; k <= harmonics; k++) value += Math.sin((2 * Math.PI * hz * k * i) / rate) / k;
    out[i] = gain * value;
  }
  return out;
};

const noise = (length: number) => {
  let seed = 7;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    out[i] = (seed / 2147483648 - 0.5) * 0.6;
  }
  return out;
};

const near = (value: number | null, hz: number) =>
  value !== null && Math.abs(value - hz) / hz < 0.01;

describe('detectPitch', () => {
  it('hears a plain tone', () => {
    expect(near(detectPitch(tone(220, 48000), 48000), 220)).toBe(true);
  });

  it('finds the low note of a rich voice, not its overtone', () => {
    expect(near(detectPitch(tone(110, 48000, 6), 48000), 110)).toBe(true);
  });

  it('works at 44.1 kHz', () => {
    expect(near(detectPitch(tone(440, 44100, 3), 44100), 440)).toBe(true);
  });

  it('stays quiet on silence and noise', () => {
    expect(detectPitch(new Float32Array(2048), 48000)).toBeNull();
    expect(detectPitch(noise(2048), 48000)).toBeNull();
  });
});
