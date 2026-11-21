import { describe, expect, it } from 'vitest';

import type { TNote } from '@/types/music';

import { inKey, nearestScaleTone, snapToKey } from './scale';

const C_MAJOR = { tonic: 0, mode: 'major' as const };
const A_MINOR = { tonic: 9, mode: 'minor' as const };

describe('snapToKey', () => {
  it('leaves scale tones alone', () => {
    expect(nearestScaleTone(64, 64, C_MAJOR)).toBe(64);
  });

  it('breaks ties with the sung pitch', () => {
    expect(nearestScaleTone(61, 60.8, C_MAJOR)).toBe(60);
    expect(nearestScaleTone(61, 61.2, C_MAJOR)).toBe(62);
  });

  it('keeps the raised seventh in minor', () => {
    expect(inKey(68, A_MINOR)).toBe(true);
    expect(nearestScaleTone(66, 65.9, A_MINOR)).toBe(65);
  });

  it('moves only the notes that are out of key', () => {
    const notes: TNote[] = [
      { start: 0, duration: 1, midi: 60, pitch: 60, velocity: 90 },
      { start: 1, duration: 1, midi: 66, pitch: 66.3, velocity: 90 },
    ];
    expect(snapToKey(notes, C_MAJOR).map((n) => n.midi)).toEqual([60, 67]);
  });
});
