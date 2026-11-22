import { describe, expect, it } from 'vitest';

import type { TSongSettings } from '@/types/song';
import type { TRawNote } from '@/types/transcription';

import { buildSong } from './build';

const settings: TSongSettings = {
  step: 0.5,
  snap: true,
  style: 'dance',
  lead: 'auto',
  alternative: 0,
  mode: null,
};
const grid = { bpm: 120, offset: 0, bars: 2, beatsPerBar: 4 };
const raw: TRawNote[] = [60, 64, 67, 64, 65, 62, 71, 72].map((midi, i) => ({
  start: i * 0.5,
  end: i * 0.5 + 0.45,
  midi,
  pitch: midi,
  amplitude: 0.7,
}));

describe('buildSong', () => {
  it('keeps the key it heard by default', () => {
    const song = buildSong(raw, grid, settings);
    expect(song?.key).toMatchObject({ tonic: 0, mode: 'major' });
    expect(song?.hummedMode).toBe('major');
  });

  it('turns the tune sad when asked', () => {
    const song = buildSong(raw, grid, { ...settings, mode: 'minor' });
    expect(song?.key).toMatchObject({ tonic: 0, mode: 'minor' });
    expect(song?.hummedMode).toBe('major');
    expect(song?.notes.map((note) => note.midi)).toEqual([60, 63, 67, 63, 65, 62, 70, 72]);
    expect(song?.arrangement.melody.length).toBe(8);
  });
});
