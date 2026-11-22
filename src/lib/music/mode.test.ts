import { describe, expect, it } from 'vitest';

import type { TNote } from '@/types/music';

import { changeMode } from './mode';

const tune = (midis: number[]): TNote[] =>
  midis.map((midi, i) => ({ start: i, duration: 1, midi, pitch: midi + 0.1, velocity: 90 }));

describe('changeMode', () => {
  it('turns a major tune into the minor of the same tonic', () => {
    const notes = changeMode(
      tune([62, 64, 66, 67, 69, 71, 73, 74]),
      { tonic: 2, mode: 'major' },
      'minor'
    );
    expect(notes.map((note) => note.midi)).toEqual([62, 64, 65, 67, 69, 70, 72, 74]);
  });

  it('turns a minor tune into the major of the same tonic', () => {
    const notes = changeMode(
      tune([69, 71, 72, 74, 76, 77, 79, 80]),
      { tonic: 9, mode: 'minor' },
      'major'
    );
    expect(notes.map((note) => note.midi)).toEqual([69, 71, 73, 74, 76, 78, 80, 80]);
  });

  it('moves the sung pitch along with the note', () => {
    const [note] = changeMode(tune([64]), { tonic: 0, mode: 'major' }, 'minor');
    expect(note.pitch).toBeCloseTo(63.1);
  });

  it('leaves a tune alone when the mode already matches', () => {
    const notes = tune([60, 64, 67]);
    expect(changeMode(notes, { tonic: 0, mode: 'major' }, 'major')).toBe(notes);
  });
});
