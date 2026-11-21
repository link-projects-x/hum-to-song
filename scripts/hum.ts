import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { encodeWav } from '@/lib/audio/wav';

import { MELODIES } from './lib/melodies';
import { renderTake } from './lib/takes';

import type { TRegister } from './lib/takes';

const { values } = parseArgs({
  options: {
    melody: { type: 'string', default: 'ode-to-joy' },
    bpm: { type: 'string', default: '100' },
    bars: { type: 'string', default: '8' },
    register: { type: 'string', default: 'high' },
    seed: { type: 'string', default: '1' },
    rate: { type: 'string', default: '44100' },
    out: { type: 'string' },
    truth: { type: 'boolean', default: false },
    list: { type: 'boolean', default: false },
  },
});

if (values.list) {
  for (const melody of MELODIES)
    console.log(`${melody.id.padEnd(16)} ${melody.title} (${melody.origin})`);
  process.exit(0);
}

const register: TRegister = values.register === 'low' ? 'low' : 'high';
const out = resolve(values.out ?? `hums/${values.melody}-${register}-${values.seed}.wav`);
const { samples, truth } = renderTake({
  melody: values.melody,
  bpm: Number(values.bpm),
  bars: Number(values.bars),
  register,
  seed: Number(values.seed),
  rate: Number(values.rate),
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodeWav(samples, truth.rate));
if (values.truth) writeFileSync(out.replace(/\.wav$/, '.json'), JSON.stringify(truth, null, 2));
console.log(
  `${out}  ${truth.title}, ${truth.bpm} BPM, ${truth.bars} bars, ${truth.duration.toFixed(1)} s`
);
