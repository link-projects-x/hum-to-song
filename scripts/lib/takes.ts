import type { TKey } from '@/types/music';

import { randomVoice, renderHum } from './humSynth';
import { melodyById, melodyRange, scoreNotes } from './melodies';
import { createRandom } from './random';

import type { TSungNote, THumVoice } from './humSynth';
import type { TScoreNote } from './melodies';
import type { TRandom } from './random';

export type TRegister = 'low' | 'high';

export const REGISTERS: Record<TRegister, [number, number]> = { low: [45, 57], high: [57, 69] };

export type TTakeSpec = {
  melody: string;
  bars: number;
  bpm: number;
  register: TRegister;
  seed: number;
  rate: number;
  leadIn?: number;
  transpose?: number;
};

export type TTruth = {
  melody: string;
  title: string;
  bpm: number;
  bars: number;
  register: TRegister;
  transpose: number;
  key: TKey;
  leadIn: number;
  rate: number;
  duration: number;
  seed: number;
  notes: TScoreNote[];
  sung: TSungNote[];
  voice: THumVoice;
};

export function chooseTranspose(id: string, register: TRegister, random: TRandom): number {
  const [low, high] = melodyRange(melodyById(id));
  const [regLow, regHigh] = REGISTERS[register];
  const fits: number[] = [];
  for (let t = -36; t <= 36; t++) {
    if (low + t >= regLow - 2 && high + t <= regHigh + 3) fits.push(t);
  }
  if (fits.length) return random.pick(fits);
  const centre = Math.round((regLow + regHigh) / 2 - (low + high) / 2);
  return centre;
}

export function renderTake(spec: TTakeSpec): { samples: Float32Array; truth: TTruth } {
  const random = createRandom(spec.seed);
  const melody = melodyById(spec.melody);
  const transpose = spec.transpose ?? chooseTranspose(spec.melody, spec.register, random);
  const leadIn = spec.leadIn ?? random.range(0.45, 1);
  const voice = randomVoice(random);
  const notes = scoreNotes(melody, spec.bars, transpose);
  const take = renderHum(notes, spec.bpm, leadIn, spec.rate, voice, random);
  return {
    samples: take.samples,
    truth: {
      melody: melody.id,
      title: melody.title,
      bpm: spec.bpm,
      bars: spec.bars,
      register: spec.register,
      transpose,
      key: { tonic: (((melody.tonic + transpose) % 12) + 12) % 12, mode: melody.mode },
      leadIn,
      rate: spec.rate,
      duration: take.duration,
      seed: spec.seed,
      notes,
      sung: take.sung,
      voice,
    },
  };
}
