import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { EXAMPLES } from '@/constants/examples';
import { encodeWav } from '@/lib/audio/wav';

import { renderTake } from './lib/takes';

import type { TRegister } from './lib/takes';

const RATE = 22050;

const VOICES: Record<string, { register: TRegister; seed: number; transpose: number }> = {
  'ode-to-joy': { register: 'high', seed: 11, transpose: 2 },
  'frere-jacques': { register: 'low', seed: 23, transpose: -12 },
  korobeiniki: { register: 'high', seed: 37, transpose: -12 },
};

for (const example of EXAMPLES) {
  const voice = VOICES[example.id];
  if (!voice) throw new Error(`No voice settings for ${example.id}`);
  const { samples, truth } = renderTake({
    melody: example.id,
    bars: example.bars,
    bpm: example.bpm,
    register: voice.register,
    seed: voice.seed,
    rate: RATE,
    leadIn: example.offset,
    transpose: voice.transpose,
  });
  const out = resolve('public', example.file.replace(/^\//, ''));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodeWav(samples, RATE));
  console.log(`${out}  ${truth.title}, ${truth.bpm} BPM, ${truth.duration.toFixed(1)} s`);
}
