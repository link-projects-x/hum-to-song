import { describe, expect, it } from 'vitest';

import type { TModelOutput } from '@/types/transcription';

import { decodeNotes, DEFAULT_DECODE, estimateTuning, trackPitch } from './decode';
import { CONTOUR_BINS, FFT_HOP, MIDI_OFFSET, MODEL_RATE, NOTE_BINS, frameTime } from './frames';

type TSegment = { from: number; to: number; midi: number; cents?: number };

const FRAME = FFT_HOP / MODEL_RATE;

function fakeOutput(frameCount: number, segments: TSegment[], onsetsAt: [number, number][] = []) {
  const output: TModelOutput = {
    frameCount,
    frames: new Float32Array(frameCount * NOTE_BINS),
    onsets: new Float32Array(frameCount * NOTE_BINS),
    contours: new Float32Array(frameCount * CONTOUR_BINS),
  };
  for (const segment of segments) {
    const bin = segment.midi - MIDI_OFFSET;
    const contourBin = bin * 3 + 1 + Math.round((segment.cents ?? 0) / 33.3);
    for (let t = segment.from; t < segment.to; t++) {
      output.frames[t * NOTE_BINS + bin] = 0.7;
      output.contours[t * CONTOUR_BINS + contourBin] = 0.6;
      output.contours[t * CONTOUR_BINS + contourBin - 1] = 0.3;
      output.contours[t * CONTOUR_BINS + contourBin + 1] = 0.3;
    }
  }
  for (const [t, midi] of onsetsAt) output.onsets[t * NOTE_BINS + midi - MIDI_OFFSET] = 0.9;
  return output;
}

const loud = (count: number, quiet: [number, number][] = []) => {
  const energy = new Float32Array(count).fill(-20);
  for (const [from, to] of quiet) energy.fill(-70, from, to);
  return energy;
};

describe('decodeNotes', () => {
  it('turns steady activations into one note per pitch', () => {
    const output = fakeOutput(120, [
      { from: 10, to: 50, midi: 60 },
      { from: 50, to: 100, midi: 64 },
    ]);
    const { notes } = decodeNotes(output, loud(120), -50);
    expect(notes.map((n) => n.midi)).toEqual([60, 64]);
    expect(notes[0].start).toBeCloseTo(frameTime(10), 5);
    expect(notes[1].end).toBeCloseTo(frameTime(99) + FRAME, 5);
  });

  it('drops a blip that is not next to another note', () => {
    const output = fakeOutput(160, [
      { from: 10, to: 60, midi: 60 },
      { from: 100, to: 104, midi: 67 },
    ]);
    const { notes } = decodeNotes(output, loud(160), -50);
    expect(notes.map((n) => n.midi)).toEqual([60]);
  });

  it('folds a short scoop into the note it leads into', () => {
    const output = fakeOutput(120, [
      { from: 10, to: 14, midi: 61 },
      { from: 14, to: 80, midi: 62 },
    ]);
    const { notes } = decodeNotes(output, loud(120), -50);
    expect(notes).toHaveLength(1);
    expect(notes[0].midi).toBe(62);
    expect(notes[0].start).toBeCloseTo(frameTime(10), 5);
  });

  it('bridges a short dropout inside a held note', () => {
    const output = fakeOutput(120, [
      { from: 10, to: 50, midi: 60 },
      { from: 52, to: 90, midi: 60 },
    ]);
    const { notes } = decodeNotes(output, loud(120), -50);
    expect(notes).toHaveLength(1);
  });

  it('splits a repeated pitch at a strong onset', () => {
    const output = fakeOutput(140, [{ from: 10, to: 110, midi: 62 }], [[60, 62]]);
    const { notes } = decodeNotes(output, loud(140), -50);
    expect(notes.map((n) => n.midi)).toEqual([62, 62]);
    expect(notes[1].start).toBeCloseTo(frameTime(60), 5);
  });

  it('splits a repeated pitch at an energy dip', () => {
    const output = fakeOutput(140, [{ from: 10, to: 110, midi: 62 }]);
    const energy = loud(140);
    energy[59] = -24;
    energy[60] = -30;
    energy[61] = -24;
    const { notes } = decodeNotes(output, energy, -50);
    expect(notes).toHaveLength(2);
  });

  it('ignores frames below the energy gate', () => {
    const output = fakeOutput(120, [{ from: 10, to: 100, midi: 60 }]);
    const { notes } = decodeNotes(output, loud(120, [[0, 120]]), -50);
    expect(notes).toHaveLength(0);
  });

  it('keeps the line monophonic', () => {
    const output = fakeOutput(120, [
      { from: 10, to: 100, midi: 60 },
      { from: 30, to: 60, midi: 72 },
    ]);
    for (let t = 30; t < 60; t++) output.frames[t * NOTE_BINS + 72 - MIDI_OFFSET] = 0.5;
    const { notes } = decodeNotes(output, loud(120), -50);
    for (let i = 1; i < notes.length; i++)
      expect(notes[i].start).toBeGreaterThanOrEqual(notes[i - 1].end - 1e-9);
  });
});

describe('tuning', () => {
  it('measures a global offset and snaps notes to the nearest semitone after it', () => {
    const output = fakeOutput(200, [
      { from: 10, to: 90, midi: 60, cents: 33 },
      { from: 100, to: 190, midi: 64, cents: 33 },
    ]);
    const track = trackPitch(output, loud(200), -50, DEFAULT_DECODE);
    expect(estimateTuning(track)).toBeGreaterThan(0.2);
    const { notes } = decodeNotes(output, loud(200), -50);
    expect(notes.map((n) => n.midi)).toEqual([60, 64]);
  });
});
