import { describe, expect, it } from 'vitest';

import { diatonicChords } from '@/lib/music/chords';
import type { TChordSpan, TNote } from '@/types/music';
import type { TStyleId } from '@/types/song';

import { arrange, leadOctaveShift } from './styles';

const KEY = { tonic: 0, mode: 'major' as const };
const [I, , , IV, V] = diatonicChords(KEY);
const SPANS: TChordSpan[] = [
  { chord: I, start: 0, duration: 4 },
  { chord: IV, start: 4, duration: 2 },
  { chord: V, start: 6, duration: 2 },
];
const MELODY: TNote[] = [
  { start: 0, duration: 2, midi: 52, pitch: 52, velocity: 90 },
  { start: 2, duration: 2, midi: 55, pitch: 55, velocity: 90 },
  { start: 4, duration: 4, midi: 53, pitch: 53, velocity: 90 },
];

const build = (style: TStyleId) =>
  arrange({
    style,
    lead: 'auto',
    melody: MELODY,
    spans: SPANS,
    key: KEY,
    bpm: 100,
    bars: 2,
    beatsPerBar: 4,
  });

const times = (hits: { time: number }[]) => hits.map((h) => h.time).sort((a, b) => a - b);

describe('dance', () => {
  const song = build('dance');
  it('plays four on the floor with claps on 2 and 4', () => {
    expect(times(song.drums.filter((h) => h.drum === 'kick'))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(times(song.drums.filter((h) => h.drum === 'clap'))).toEqual([1, 3, 5, 7]);
  });
  it('puts the bass on the offbeats, on the chord roots', () => {
    expect(song.bass.every((n) => n.start % 1 === 0.5)).toBe(true);
    expect(song.bass.filter((n) => n.start < 4).every((n) => n.midi % 12 === 0)).toBe(true);
    expect(song.bass.filter((n) => n.start >= 6).every((n) => n.midi % 12 === 7)).toBe(true);
  });
  it('holds pad chords for each span and doubles the melody with a pluck', () => {
    expect(song.lead).toBe('pluck');
    expect(song.chords.filter((n) => n.start === 0)).toHaveLength(3);
    expect(song.melody.map((n) => n.midi % 12)).toEqual(MELODY.map((n) => n.midi % 12));
  });
});

describe('lo-fi', () => {
  const song = build('lofi');
  it('swings the offbeat hats', () => {
    const offbeats = song.drums.filter((h) => h.drum === 'hat' && h.time % 1 !== 0);
    expect(offbeats.length).toBeGreaterThan(0);
    expect(offbeats.every((h) => Math.abs((h.time % 1) - 0.62) < 1e-9)).toBe(true);
  });
  it('voices keys with sevenths and keeps kick and snare soft', () => {
    expect(song.chords.filter((n) => n.start === 0)).toHaveLength(4);
    const kit = song.drums.filter((h) => h.drum === 'kick' || h.drum === 'snare');
    expect(Math.max(...kit.map((h) => h.velocity))).toBeLessThan(100);
  });
});

describe('ballad', () => {
  const song = build('ballad');
  it('uses piano for chords and lead with soft drums', () => {
    expect(song.chordSound).toBe('piano');
    expect(song.lead).toBe('piano');
    expect(Math.max(...song.drums.map((h) => h.velocity))).toBeLessThan(80);
  });
  it('breaks chords into eighth notes', () => {
    const starts = song.chords.filter((n) => n.start < 2).map((n) => n.start);
    expect(starts.sort((a, b) => a - b)).toEqual([0, 0.5, 1, 1.5]);
  });
});

describe('lead register', () => {
  it('moves a low hum up into the lead range by whole octaves', () => {
    expect(leadOctaveShift(MELODY, 'pluck')).toBe(24);
    expect(leadOctaveShift(MELODY, 'piano')).toBe(12);
  });
  it('honours a picked lead sound', () => {
    const song = arrange({
      style: 'dance',
      lead: 'piano',
      melody: MELODY,
      spans: SPANS,
      key: KEY,
      bpm: 100,
      bars: 2,
      beatsPerBar: 4,
    });
    expect(song.lead).toBe('piano');
  });
});
