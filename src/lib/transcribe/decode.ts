import type { TContour, TModelOutput, TRawNote } from '@/types/transcription';

import {
  CONTOUR_BINS,
  CONTOUR_BINS_PER_SEMITONE,
  CONTOUR_PEAK_SHIFT,
  FFT_HOP,
  MIDI_OFFSET,
  MODEL_RATE,
  NOTE_BINS,
  frameTime,
} from './frames';

export type TDecodeOptions = {
  minMidi: number;
  maxMidi: number;
  voicing: number;
  onset: number;
  dipDb: number;
  medianFrames: number;
  bridgeFrames: number;
  minNoteSeconds: number;
  mergeGapSeconds: number;
  scoopSemitones: number;
  timeOffset: number;
};

export const DEFAULT_DECODE: TDecodeOptions = {
  minMidi: 36,
  maxMidi: 84,
  voicing: 0.15,
  onset: 0.8,
  dipDb: 6,
  medianFrames: 1,
  bridgeFrames: 3,
  minNoteSeconds: 0.13,
  mergeGapSeconds: 0.03,
  scoopSemitones: 2,
  timeOffset: 0,
};

export type TPitchTrack = {
  voiced: Uint8Array;
  strength: Float32Array;
  pitch: Float32Array;
  semitone: Int16Array;
};

const FRAME_SECONDS = FFT_HOP / MODEL_RATE;

function refinePitch(output: TModelOutput, frame: number, bin: number): number {
  const base = frame * CONTOUR_BINS;
  const center = bin * CONTOUR_BINS_PER_SEMITONE + CONTOUR_PEAK_SHIFT;
  let peak = center;
  let peakValue = -Infinity;
  for (let c = Math.max(0, center - 4); c <= Math.min(CONTOUR_BINS - 1, center + 4); c++) {
    const value = output.contours[base + c];
    if (value > peakValue) {
      peakValue = value;
      peak = c;
    }
  }
  let offset = 0;
  if (peak > 0 && peak < CONTOUR_BINS - 1) {
    const y0 = output.contours[base + peak - 1];
    const y1 = output.contours[base + peak];
    const y2 = output.contours[base + peak + 1];
    const den = y0 - 2 * y1 + y2;
    if (den < 0) offset = Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den));
  }
  return MIDI_OFFSET + (peak + offset - CONTOUR_PEAK_SHIFT) / CONTOUR_BINS_PER_SEMITONE;
}

export function trackPitch(
  output: TModelOutput,
  energyDb: Float32Array,
  gateDb: number,
  options: TDecodeOptions
): TPitchTrack {
  const count = output.frameCount;
  const voiced = new Uint8Array(count);
  const strength = new Float32Array(count);
  const pitch = new Float32Array(count).fill(Number.NaN);
  const low = Math.max(0, options.minMidi - MIDI_OFFSET);
  const high = Math.min(NOTE_BINS - 1, options.maxMidi - MIDI_OFFSET);
  for (let t = 0; t < count; t++) {
    const base = t * NOTE_BINS;
    let best = low;
    for (let p = low + 1; p <= high; p++) {
      if (output.frames[base + p] > output.frames[base + best]) best = p;
    }
    strength[t] = output.frames[base + best];
    pitch[t] = refinePitch(output, t, best);
    voiced[t] = strength[t] >= options.voicing && energyDb[t] >= gateDb ? 1 : 0;
  }
  return { voiced, strength, pitch, semitone: new Int16Array(count).fill(-1) };
}

export function estimateTuning(track: TPitchTrack): number {
  let x = 0;
  let y = 0;
  for (let t = 0; t < track.voiced.length; t++) {
    if (!track.voiced[t]) continue;
    const deviation = track.pitch[t] - Math.round(track.pitch[t]);
    const angle = 2 * Math.PI * deviation;
    x += track.strength[t] * Math.cos(angle);
    y += track.strength[t] * Math.sin(angle);
  }
  if (x === 0 && y === 0) return 0;
  return Math.atan2(y, x) / (2 * Math.PI);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function smoothSemitones(track: TPitchTrack, tuning: number, options: TDecodeOptions) {
  const count = track.voiced.length;
  const raw = new Int16Array(count).fill(-1);
  for (let t = 0; t < count; t++) {
    if (track.voiced[t]) raw[t] = Math.round(track.pitch[t] - tuning);
  }
  const half = Math.floor(options.medianFrames / 2);
  for (let t = 0; t < count; t++) {
    if (raw[t] < 0) continue;
    const window: number[] = [];
    for (let k = Math.max(0, t - half); k <= Math.min(count - 1, t + half); k++) {
      if (raw[k] >= 0) window.push(raw[k]);
    }
    track.semitone[t] = Math.round(median(window));
  }
  let t = 0;
  while (t < count) {
    if (track.semitone[t] >= 0) {
      t++;
      continue;
    }
    let end = t;
    while (end < count && track.semitone[end] < 0) end++;
    const before = t > 0 ? track.semitone[t - 1] : -1;
    const after = end < count ? track.semitone[end] : -1;
    if (before >= 0 && before === after && end - t <= options.bridgeFrames) {
      for (let k = t; k < end; k++) track.semitone[k] = before;
    }
    t = end;
  }
}

export type TOnsetCue = (frame: number, semitone: number) => number;

export function modelOnsets(output: TModelOutput): TOnsetCue {
  return (frame, semitone) => {
    const bin = semitone - MIDI_OFFSET;
    let best = 0;
    for (let p = Math.max(0, bin - 1); p <= Math.min(NOTE_BINS - 1, bin + 1); p++) {
      best = Math.max(best, output.onsets[frame * NOTE_BINS + p]);
    }
    return best;
  };
}

function isOnsetPeak(
  onset: TOnsetCue,
  t: number,
  from: number,
  to: number,
  semitone: number,
  threshold: number
): boolean {
  const here = onset(t, semitone);
  if (here < threshold) return false;
  for (let k = t - 2; k <= t + 2; k++) {
    if (k !== t && k >= from && k < to && onset(k, semitone) > here) return false;
  }
  return true;
}

function dipDepth(energyDb: Float32Array, t: number, from: number, to: number): number {
  if (energyDb[t] > energyDb[t - 1] || energyDb[t] > energyDb[t + 1]) return 0;
  let left = -Infinity;
  let right = -Infinity;
  for (let k = Math.max(from, t - 6); k < t; k++) left = Math.max(left, energyDb[k]);
  for (let k = t + 1; k <= Math.min(to - 1, t + 6); k++) right = Math.max(right, energyDb[k]);
  return Math.max(0, Math.min(left, right) - energyDb[t]);
}

function splitPoints(
  onset: TOnsetCue,
  energyDb: Float32Array,
  from: number,
  to: number,
  semitone: number,
  options: TDecodeOptions
): number[] {
  const minFrames = Math.max(2, Math.round(options.minNoteSeconds / FRAME_SECONDS));
  const points: number[] = [];
  let last = from;
  for (let t = from + minFrames; t < to - minFrames; t++) {
    if (t - last < minFrames) continue;
    const split =
      isOnsetPeak(onset, t, from, to, semitone, options.onset) ||
      (options.dipDb > 0 && dipDepth(energyDb, t, from, to) >= options.dipDb);
    if (split) {
      points.push(t);
      last = t;
    }
  }
  return points;
}

function segmentNote(
  track: TPitchTrack,
  tuning: number,
  from: number,
  to: number,
  options: TDecodeOptions
): TRawNote {
  const length = to - from;
  const trim = Math.floor(length * 0.2);
  const pitches: number[] = [];
  let strength = 0;
  for (let t = from; t < to; t++) {
    strength += track.strength[t];
    if (t >= from + trim && t < to - trim && track.voiced[t]) pitches.push(track.pitch[t] - tuning);
  }
  const semitone = track.semitone[from];
  const centre = pitches.length ? median(pitches) : semitone;
  return {
    start: frameTime(from, options.timeOffset),
    end: frameTime(to - 1, options.timeOffset) + FRAME_SECONDS,
    midi: Math.abs(centre - semitone) < 0.75 ? semitone : Math.round(centre),
    pitch: centre,
    amplitude: strength / length,
  };
}

function cleanUp(notes: TRawNote[], options: TDecodeOptions): TRawNote[] {
  const out = notes.map((note) => ({ ...note }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const note = out[i];
      if (note.end - note.start >= options.minNoteSeconds) continue;
      const next = out[i + 1];
      const prev = out[i - 1];
      const nearNext =
        next &&
        next.start - note.end <= options.mergeGapSeconds &&
        Math.abs(next.midi - note.midi) <= options.scoopSemitones;
      const nearPrev =
        prev &&
        note.start - prev.end <= options.mergeGapSeconds &&
        Math.abs(prev.midi - note.midi) <= options.scoopSemitones;
      if (nearNext && nearPrev && prev.midi === next.midi) {
        prev.end = next.end;
        out.splice(i, 2);
        changed = true;
        break;
      }
      if (nearNext) next.start = note.start;
      else if (nearPrev) prev.end = note.end;
      out.splice(i, 1);
      changed = true;
      break;
    }
  }
  return out;
}

export type TDecodeResult = { notes: TRawNote[]; tuning: number; track: TPitchTrack };

export function notesFromTrack(
  track: TPitchTrack,
  energyDb: Float32Array,
  onset: TOnsetCue,
  options: TDecodeOptions
): TDecodeResult {
  const tuning = estimateTuning(track);
  smoothSemitones(track, tuning, options);
  const notes: TRawNote[] = [];
  const count = track.voiced.length;
  let t = 0;
  while (t < count) {
    const semitone = track.semitone[t];
    if (semitone < 0) {
      t++;
      continue;
    }
    let end = t;
    while (end < count && track.semitone[end] === semitone) end++;
    const cuts = [t, ...splitPoints(onset, energyDb, t, end, semitone, options), end];
    for (let i = 0; i + 1 < cuts.length; i++) {
      notes.push(segmentNote(track, tuning, cuts[i], cuts[i + 1], options));
    }
    t = end;
  }
  return { notes: cleanUp(notes, options), tuning, track };
}

export function decodeNotes(
  output: TModelOutput,
  energyDb: Float32Array,
  gateDb: number,
  options: TDecodeOptions = DEFAULT_DECODE
): TDecodeResult {
  const track = trackPitch(output, energyDb, gateDb, options);
  return notesFromTrack(track, energyDb, modelOnsets(output), options);
}

export function contourFrom(track: TPitchTrack, tuning: number, timeOffset: number): TContour {
  const count = track.voiced.length;
  const times = new Float32Array(count);
  const pitches = new Float32Array(count);
  for (let t = 0; t < count; t++) {
    times[t] = frameTime(t, timeOffset) + FRAME_SECONDS / 2;
    pitches[t] = track.voiced[t] ? track.pitch[t] - tuning : Number.NaN;
  }
  return { times, pitches };
}
