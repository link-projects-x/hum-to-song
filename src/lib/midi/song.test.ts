import { describe, expect, it } from 'vitest';

import { arrange } from '@/lib/arrange/styles';
import { diatonicChords } from '@/lib/music/chords';
import type { TNote } from '@/types/music';

import { parseMidi } from './parse';
import { melodyMidi, songMidi } from './song';

const KEY = { tonic: 0, mode: 'major' as const };
const [I, , , , V] = diatonicChords(KEY);
const MELODY: TNote[] = [64, 64, 65, 67, 67, 65, 64, 62].map((midi, i) => ({
  start: i,
  duration: 1,
  midi,
  pitch: midi,
  velocity: 96,
}));
const song = arrange({
  style: 'dance',
  lead: 'auto',
  melody: MELODY,
  spans: [
    { chord: I, start: 0, duration: 4 },
    { chord: V, start: 4, duration: 4 },
  ],
  key: KEY,
  bpm: 120,
  bars: 2,
  beatsPerBar: 4,
});

const buffer = (bytes: Uint8Array) => bytes.slice().buffer;
const u16 = (bytes: Uint8Array, at: number) => (bytes[at] << 8) | bytes[at + 1];

describe('song MIDI', () => {
  const bytes = songMidi(song, 'Test');
  const parsed = parseMidi(buffer(bytes));

  it('is format 1 with a conductor and four parts', () => {
    expect(u16(bytes, 8)).toBe(1);
    expect(u16(bytes, 10)).toBe(5);
    expect(parsed.trackCount).toBe(5);
  });

  it('keeps every part on its own channel with drums on channel 10', () => {
    const channels = new Set(parsed.notes.map((n) => n.channel));
    expect([...channels].sort((a, b) => a - b)).toEqual([0, 1, 2, 9]);
    expect(parsed.notes.filter((n) => n.channel === 9)).toHaveLength(song.drums.length);
    expect(parsed.notes.filter((n) => n.channel === 1)).toHaveLength(song.chords.length);
  });

  it('round-trips the melody timing at the song tempo', () => {
    const melody = parsed.notes.filter((n) => n.channel === 0);
    expect(melody.map((n) => n.midi)).toEqual(song.melody.map((n) => n.midi));
    expect(melody.map((n) => n.time)).toEqual(song.melody.map((n) => n.start * 0.5));
    expect(melody[0].dur).toBeCloseTo(0.5);
  });
});

describe('melody MIDI', () => {
  const bytes = melodyMidi(song, 'Test melody');

  it('is format 0 with a single track', () => {
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    expect(u16(bytes, 8)).toBe(0);
    expect(u16(bytes, 10)).toBe(1);
  });

  it('loads in the ReelBall MIDI parser with the same notes and times', () => {
    const parsed = parseMidi(buffer(bytes));
    expect(parsed.trackCount).toBe(1);
    expect(parsed.notes.map((n) => n.midi)).toEqual(song.melody.map((n) => n.midi));
    expect(parsed.notes.map((n) => n.time)).toEqual(song.melody.map((n) => n.start * 0.5));
    expect(parsed.duration).toBeCloseTo(4);
  });
});
