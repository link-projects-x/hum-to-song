import { describe, expect, it } from 'vitest';

import type { TGrid } from '@/types/music';
import type { TRawNote } from '@/types/transcription';

import { barsSpanned, beatsToSeconds, quantizeNotes, secondsToBeats } from './quantize';

const grid: TGrid = { bpm: 120, offset: 0.5, beatsPerBar: 4, bars: 2, step: 0.5 };
const raw = (start: number, end: number, midi = 60): TRawNote => ({
  start,
  end,
  midi,
  pitch: midi,
  amplitude: 0.7,
});

describe('quantizeNotes', () => {
  it('maps seconds to beats through the grid', () => {
    expect(secondsToBeats(1.5, grid)).toBeCloseTo(2);
    expect(beatsToSeconds(2, grid)).toBeCloseTo(1.5);
  });

  it('snaps onsets to the eighth grid and fills short gaps', () => {
    const notes = quantizeNotes(
      [raw(0.53, 0.95, 60), raw(1.02, 1.4, 62), raw(1.46, 2.3, 64)],
      grid
    );
    expect(notes.map((n) => [n.start, n.duration, n.midi])).toEqual([
      [0, 1, 60],
      [1, 1, 62],
      [2, 1.5, 64],
    ]);
  });

  it('uses the sixteenth grid when asked', () => {
    const notes = quantizeNotes([raw(0.5, 0.62), raw(0.63, 0.9, 62)], { ...grid, step: 0.25 });
    expect(notes.map((n) => n.start)).toEqual([0, 0.25]);
  });

  it('moves a later note to the next step when two land on the same one', () => {
    const notes = quantizeNotes([raw(0.5, 0.6, 60), raw(0.62, 1.2, 62)], grid);
    expect(notes.map((n) => [n.start, n.midi])).toEqual([
      [0, 60],
      [0.5, 62],
    ]);
  });

  it('never overlaps and drops notes outside the bars', () => {
    const notes = quantizeNotes([raw(0.5, 2, 60), raw(1, 1.6, 62), raw(9, 9.5, 64)], grid);
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].start).toBeGreaterThanOrEqual(notes[i - 1].start + notes[i - 1].duration);
    }
    expect(notes.every((n) => n.start < 8)).toBe(true);
  });

  it('counts the bars the notes cover', () => {
    expect(barsSpanned([raw(0.5, 4.4)], grid)).toBe(2);
    expect(barsSpanned([raw(0.5, 2.5)], grid)).toBe(1);
  });
});
