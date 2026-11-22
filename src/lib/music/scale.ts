import type { TKey, TNote } from '@/types/music';

import { pitchClass } from './pitch';

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10, 11];

function scalePitchClasses(key: TKey): Set<number> {
  const steps = key.mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
  return new Set(steps.map((step) => (key.tonic + step) % 12));
}

export function inKey(midi: number, key: TKey): boolean {
  return scalePitchClasses(key).has(pitchClass(midi));
}

export function nearestScaleTone(midi: number, pitch: number, key: TKey): number {
  const scale = scalePitchClasses(key);
  if (scale.has(pitchClass(midi))) return midi;
  const below = midi - 1;
  const above = midi + 1;
  const belowFits = scale.has(pitchClass(below));
  const aboveFits = scale.has(pitchClass(above));
  if (belowFits && !aboveFits) return below;
  if (aboveFits && !belowFits) return above;
  return pitch < midi ? below : above;
}

export function snapToKey(notes: TNote[], key: TKey): TNote[] {
  return notes.map((note) => {
    const midi = nearestScaleTone(note.midi, note.pitch, key);
    return midi === note.midi ? note : { ...note, midi };
  });
}
