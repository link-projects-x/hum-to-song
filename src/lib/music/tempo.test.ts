import { describe, expect, it } from 'vitest';

import { estimateGrid } from '@/lib/song/grid';
import type { TRawNote } from '@/types/transcription';

import { barStarts, estimateBeat } from './tempo';

const jitter = (i: number) => (((i * 7919) % 17) / 17 - 0.5) * 0.06;

function onsets(bpm: number, beats: number[], offset = 0.6) {
  return beats.map((beat, i) => ({ time: offset + (beat * 60) / bpm + jitter(i), weight: 1 }));
}

const RHYTHM = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.5, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29.5, 30,
];

describe('estimateBeat', () => {
  it.each([80, 96, 110, 128])('finds %i BPM from note onsets', (bpm) => {
    const estimate = estimateBeat(onsets(bpm, RHYTHM));
    expect(estimate).not.toBeNull();
    expect(Math.abs((estimate?.bpm ?? 0) - bpm) / bpm).toBeLessThan(0.02);
  });

  it('needs a few notes', () => {
    expect(estimateBeat(onsets(100, [0, 1]))).toBeNull();
  });

  it('offers one bar start per beat of the bar, none after the first note', () => {
    const starts = barStarts(0.6, 120, 4, 1.1);
    expect(starts).toHaveLength(4);
    for (const start of starts) expect(start).toBeLessThanOrEqual(1.1 + 0.07);
  });
});

describe('estimateGrid', () => {
  it('puts the downbeat on the first note of a tune that starts on beat one', () => {
    const bpm = 100;
    const beat = 60 / bpm;
    const pattern: [number, number][] = [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 2],
      [6, 2],
      [8, 1],
      [9, 1],
      [10, 1],
      [11, 1],
      [12, 4],
    ];
    const notes: TRawNote[] = pattern.map(([start, length], i) => ({
      start: 0.8 + start * beat + jitter(i) / 2,
      end: 0.8 + (start + length) * beat - 0.05,
      midi: 60 + (i % 5),
      pitch: 60 + (i % 5),
      amplitude: 0.7,
    }));
    const grid = estimateGrid(notes);
    expect(Math.abs(grid.bpm - bpm)).toBeLessThan(2);
    expect(Math.abs(grid.offset - 0.8)).toBeLessThan(0.05);
    expect(grid.bars).toBe(4);
  });
});
