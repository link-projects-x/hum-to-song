import { describe, expect, it } from 'vitest';

import type { TRawNote } from '@/types/transcription';

import { decodeSong, encodeSong, songFromHash, songLink } from './share';

import type { TSharedSong } from './share';

const notes: TRawNote[] = Array.from({ length: 30 }, (_, i) => ({
  start: 0.6 + i * 0.625,
  end: 0.6 + i * 0.625 + 0.5,
  midi: 60 + (i % 8),
  pitch: 60 + (i % 8) + 0.23,
  amplitude: 0.71,
}));

const song: TSharedSong = {
  notes,
  grid: { bpm: 96, offset: 0.6, bars: 8 },
  settings: { step: 0.25, snap: false, style: 'lofi', lead: 'keys', alternative: 2, mode: 'minor' },
  tracks: { melody: true, chords: false, bass: true, drums: true, hum: false },
};

describe('song links', () => {
  it('brings back the same song', () => {
    const back = decodeSong(encodeSong(song));
    expect(back?.grid).toEqual(song.grid);
    expect(back?.settings).toEqual(song.settings);
    expect(back?.tracks).toEqual(song.tracks);
    expect(back?.notes).toHaveLength(30);
    back?.notes.forEach((note, i) => {
      expect(note.start).toBeCloseTo(notes[i].start, 3);
      expect(note.end).toBeCloseTo(notes[i].end, 2);
      expect(note.midi).toBe(notes[i].midi);
      expect(note.pitch).toBeCloseTo(notes[i].pitch, 2);
      expect(note.amplitude).toBeCloseTo(0.71, 2);
    });
  });

  it('keeps the link short', () => {
    expect(encodeSong(song).length).toBeLessThan(320);
  });

  it('drops notes far outside the song', () => {
    const extra = { ...notes[0], start: 40, end: 40.5 };
    expect(decodeSong(encodeSong({ ...song, notes: [...notes, extra] }))?.notes).toHaveLength(30);
  });

  it('puts the song after the page address', () => {
    const link = songLink('https://example.com/?a=1#song=old', song);
    expect(link.startsWith('https://example.com/?a=1#song=')).toBe(true);
    expect(songFromHash(link.slice(link.indexOf('#')))?.grid).toEqual(song.grid);
  });

  it('ignores broken links', () => {
    expect(decodeSong('')).toBeNull();
    expect(decodeSong('not a song!')).toBeNull();
    expect(decodeSong(encodeSong(song).slice(0, 40))).toBeNull();
    expect(songFromHash('#other=1')).toBeNull();
    const bytes = encodeSong(song).replace(/^A/, 'B');
    expect(decodeSong(bytes)).toBeNull();
  });
});
