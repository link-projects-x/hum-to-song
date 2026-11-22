import { describe, expect, it } from 'vitest';

import type { TTake } from '@/types/take';
import type { TRawNote } from '@/types/transcription';

import { estimateGrid, fitBars, gridFor } from './grid';

const grid = { bpm: 120, offset: 0.5, bars: 8 };
const at = (beat: number, length = 1, midi = 60): TRawNote => ({
  start: grid.offset + beat * 0.5,
  end: grid.offset + (beat + length) * 0.5,
  midi,
  pitch: midi,
  amplitude: 0.7,
});
const take = (source: TTake['source'], known: TTake['grid']): TTake => ({
  source,
  name: 'take',
  samples: new Float32Array(1),
  grid: known,
});

describe('fitBars', () => {
  it('ends the song at the bar of the last note', () => {
    expect(fitBars([at(0), at(9)], grid).bars).toBe(3);
  });

  it('keeps a held last note inside its bar', () => {
    expect(fitBars([at(0), at(12, 5)], grid).bars).toBe(4);
  });

  it('counts a note sung a little early on the next downbeat', () => {
    expect(fitBars([at(0), at(15.8)], grid).bars).toBe(5);
  });

  it('never grows past the recorded bars', () => {
    expect(fitBars([at(0), at(20)], { ...grid, bars: 4 }).bars).toBe(4);
  });

  it('leaves the grid alone without notes', () => {
    expect(fitBars([], grid)).toEqual(grid);
  });
});

describe('gridFor', () => {
  const notes = [at(0), at(2), at(4), at(6), at(9)];

  it('fits a recorded take to what was hummed', () => {
    expect(gridFor(take('mic', grid), notes)).toEqual({ ...grid, bars: 3 });
  });

  it('keeps the length of an example', () => {
    expect(gridFor(take('example', grid), notes)).toEqual(grid);
  });

  it('finds the grid of an upload', () => {
    expect(gridFor(take('upload', null), notes)).toEqual(estimateGrid(notes));
  });
});
