import type { TKey, TMode, TNote } from '@/types/music';

import { pitchClass } from './pitch';

const TO_MINOR: Record<number, number> = { 4: -1, 9: -1, 11: -1 };
const TO_MAJOR: Record<number, number> = { 3: 1, 8: 1, 10: 1 };

export function changeMode(notes: TNote[], key: TKey, mode: TMode): TNote[] {
  if (key.mode === mode) return notes;
  const shifts = mode === 'minor' ? TO_MINOR : TO_MAJOR;
  return notes.map((note) => {
    const shift = shifts[(pitchClass(note.midi) - key.tonic + 12) % 12] ?? 0;
    return shift ? { ...note, midi: note.midi + shift, pitch: note.pitch + shift } : note;
  });
}
