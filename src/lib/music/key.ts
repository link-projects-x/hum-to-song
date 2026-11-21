import type { TKey, TKeyEstimate, TMode } from '@/types/music';

import { beatStrength } from './meter';
import { pitchClass } from './pitch';

export const MAJOR_PROFILE = [5, 2, 3.5, 2, 4.5, 4, 2, 4.5, 2, 3.5, 1.5, 4];
export const MINOR_PROFILE = [5, 2, 3.5, 4.5, 2, 4, 2, 4.5, 3.5, 2, 1.5, 4];

export type TWeightedPitch = { midi: number; duration: number; start?: number };

export function pitchClassProfile(notes: TWeightedPitch[], beatsPerBar = 4): number[] {
  const profile = new Array<number>(12).fill(0);
  for (const note of notes) {
    const accent = note.start === undefined ? 1 : beatStrength(note.start, beatsPerBar);
    profile[pitchClass(note.midi)] += Math.max(0, note.duration) * accent;
  }
  return profile;
}

export function correlation(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((sum, v) => sum + v, 0) / n;
  const meanB = b.reduce((sum, v) => sum + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den > 0 ? num / den : 0;
}

export function keyScores(profile: number[]): (TKey & { score: number })[] {
  const scores: (TKey & { score: number })[] = [];
  const modes: [TMode, number[]][] = [
    ['major', MAJOR_PROFILE],
    ['minor', MINOR_PROFILE],
  ];
  for (const [mode, template] of modes) {
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotated = template.map((_, i) => template[(i - tonic + 12) % 12]);
      scores.push({ tonic, mode, score: correlation(profile, rotated) });
    }
  }
  return scores.sort((a, b) => b.score - a.score);
}

export function detectKey(notes: TWeightedPitch[], beatsPerBar = 4): TKeyEstimate {
  const ranked = keyScores(pitchClassProfile(notes, beatsPerBar));
  const [best, runnerUp] = ranked;
  return { ...best, runnerUp };
}
