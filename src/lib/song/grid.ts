import { metricWeight } from '@/lib/music/meter';
import { barsSpanned, quantizeNotes } from '@/lib/music/quantize';
import { barStarts, estimateBeat } from '@/lib/music/tempo';
import type { TKnownGrid } from '@/types/take';
import type { TRawNote } from '@/types/transcription';

export const BEATS_PER_BAR = 4;
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const MAX_BARS = 40;
export const FALLBACK_BPM = 100;

export type TDownbeatWeights = { metric: number; first: number };

export const DOWNBEAT_WEIGHTS: TDownbeatWeights = { metric: 1, first: 0.1 };

export function onsetsOf(notes: TRawNote[]) {
  return notes.map((note) => ({
    time: note.start,
    weight: Math.sqrt(Math.max(0.05, note.end - note.start)),
  }));
}

export function barsFor(notes: TRawNote[], bpm: number, offset: number): number {
  return Math.min(MAX_BARS, barsSpanned(notes, { bpm, offset, beatsPerBar: BEATS_PER_BAR }));
}

export function downbeatScore(
  notes: TRawNote[],
  bpm: number,
  offset: number,
  weights: TDownbeatWeights
): number {
  const bars = barsFor(notes, bpm, offset);
  const grid = { bpm, offset, bars, beatsPerBar: BEATS_PER_BAR, step: 0.5 as const };
  const quantized = quantizeNotes(notes, grid);
  if (!quantized.length) return -Infinity;
  const total = quantized.reduce((sum, note) => sum + note.duration, 0);
  const metric =
    quantized.reduce(
      (sum, note) => sum + note.duration * metricWeight(note.start, BEATS_PER_BAR),
      0
    ) / total;
  const first = quantized[0].start % BEATS_PER_BAR === 0 ? 1 : 0;
  return weights.metric * metric + weights.first * first;
}

export function estimateGrid(
  notes: TRawNote[],
  weights: TDownbeatWeights = DOWNBEAT_WEIGHTS
): TKnownGrid {
  const beat = estimateBeat(onsetsOf(notes));
  const first = notes[0]?.start ?? 0;
  if (!beat) return { bpm: FALLBACK_BPM, offset: first, bars: barsFor(notes, FALLBACK_BPM, first) };
  let best = { offset: first, score: -Infinity };
  for (const offset of barStarts(beat.phase, beat.bpm, BEATS_PER_BAR, first)) {
    const score = downbeatScore(notes, beat.bpm, offset, weights);
    if (score > best.score) best = { offset, score };
  }
  return { bpm: beat.bpm, offset: best.offset, bars: barsFor(notes, beat.bpm, best.offset) };
}

export function withBpm(notes: TRawNote[], grid: TKnownGrid, bpm: number): TKnownGrid {
  const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm * 10) / 10));
  return { bpm: clamped, offset: grid.offset, bars: barsFor(notes, clamped, grid.offset) };
}
