import { describe, expect, it } from 'vitest';

import type { TNote } from '@/types/music';

import { chordFit, chordName, chordPitchClasses, diatonicChords, harmonize } from './chords';

const C_MAJOR = { tonic: 0, mode: 'major' as const };
const A_MINOR = { tonic: 9, mode: 'minor' as const };

const bars = (pitches: number[][]): TNote[] =>
  pitches.flatMap((bar, b) =>
    bar.map((midi, i) => ({
      start: b * 4 + i * (4 / bar.length),
      duration: 4 / bar.length,
      midi,
      pitch: midi,
      velocity: 90,
    }))
  );

describe('diatonic chords', () => {
  it('lists the triads of a major key', () => {
    expect(diatonicChords(C_MAJOR).map((c) => chordName(c, C_MAJOR))).toEqual([
      'C',
      'Dm',
      'Em',
      'F',
      'G',
      'Am',
    ]);
  });

  it('allows V and V7 in minor', () => {
    const names = diatonicChords(A_MINOR).map((c) => chordName(c, A_MINOR));
    expect(names).toEqual(expect.arrayContaining(['Am', 'E', 'E7', 'Em', 'F', 'G', 'C', 'Dm']));
    expect(chordPitchClasses(diatonicChords(A_MINOR)[5])).toEqual([4, 8, 11, 2]);
  });
});

describe('harmonize', () => {
  it('follows a melody that outlines I V vi IV', () => {
    const melody = bars([
      [60, 64, 67, 64],
      [67, 71, 74, 71],
      [69, 72, 76, 72],
      [65, 69, 72, 69],
      [60, 64, 67, 72],
    ]);
    const [best] = harmonize(melody, C_MAJOR, { bars: 5 });
    expect(best.spans.map((s) => s.chord.degree)).toEqual(['I', 'V', 'vi', 'IV', 'I']);
  });

  it('starts and ends on the tonic when the melody allows it', () => {
    const melody = bars([
      [64, 67],
      [62, 67],
      [60, 64],
      [67, 64],
    ]);
    const [best] = harmonize(melody, C_MAJOR, { bars: 4 });
    expect(best.spans[0].chord.degree).toBe('I');
    expect(best.spans[best.spans.length - 1].chord.degree).toBe('I');
  });

  it('changes chord mid-bar when the melody clearly does', () => {
    const melody = bars([
      [60, 64, 71, 74],
      [60, 64, 67, 72],
    ]);
    const [best] = harmonize(melody, C_MAJOR, { bars: 2 });
    expect(best.spans.slice(0, 2).map((s) => [s.start, s.chord.degree])).toEqual([
      [0, 'I'],
      [2, 'V'],
    ]);
  });

  it('returns other progressions, best first and all different', () => {
    const melody = bars([
      [60, 64],
      [67, 71],
      [69, 72],
      [65, 69],
    ]);
    const options = harmonize(melody, C_MAJOR, { bars: 4, alternatives: 5 });
    expect(options.length).toBe(5);
    for (let i = 1; i < options.length; i++)
      expect(options[i].score).toBeLessThanOrEqual(options[i - 1].score);
    const keys = options.map((o) => o.spans.map((s) => `${s.start}${s.chord.degree}`).join());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses the dominant in minor', () => {
    const melody = bars([
      [69, 72, 76, 72],
      [68, 71, 74, 71],
      [69, 72, 76, 69],
    ]);
    const [best] = harmonize(melody, A_MINOR, { bars: 3 });
    expect(['V', 'V7']).toContain(best.spans[1].chord.degree);
  });

  it('measures how many strong-beat notes are chord tones', () => {
    const melody = bars([[60, 62, 64, 65]]);
    const spans = [{ chord: diatonicChords(C_MAJOR)[0], start: 0, duration: 4 }];
    expect(chordFit(melody, spans, 4)).toBe(1);
    const off = bars([[62, 60, 65, 64]]);
    expect(chordFit(off, spans, 4)).toBe(0);
  });
});
