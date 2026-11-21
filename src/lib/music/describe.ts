import type { TChordSpan, TKey, TNote } from '@/types/music';

import { chordName } from './chords';
import { noteName, pitchClassName, prefersFlats } from './pitch';

export function keyLabel(key: TKey): string {
  return `${pitchClassName(key.tonic, prefersFlats(key.tonic, key.mode))} ${key.mode}`;
}

export function chordsByBar(spans: TChordSpan[], key: TKey, beatsPerBar: number): string[][] {
  const bars: string[][] = [];
  for (const span of spans) {
    const bar = Math.floor(span.start / beatsPerBar + 1e-6);
    (bars[bar] ??= []).push(chordName(span.chord, key));
  }
  return bars;
}

export function describeNote(note: TNote, key: TKey, beatsPerBar: number): string {
  const bar = Math.floor(note.start / beatsPerBar + 1e-6);
  const beat = note.start - bar * beatsPerBar + 1;
  const length = note.duration === 1 ? '1 beat' : `${note.duration} beats`;
  return `${noteName(note.midi, prefersFlats(key.tonic, key.mode))}, bar ${bar + 1} beat ${beat}, ${length}`;
}
