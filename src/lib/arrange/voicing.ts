import { chordPitchClasses } from '@/lib/music/chords';
import type { TChord, TKey } from '@/types/music';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];

export function chordTones(chord: TChord, key: TKey, sevenths: boolean): number[] {
  const tones = chordPitchClasses(chord);
  if (!sevenths || tones.length > 3) return tones;
  const scale = (key.mode === 'major' ? MAJOR_SCALE : NATURAL_MINOR).map(
    (s) => (key.tonic + s) % 12
  );
  const minorSeventh = (chord.root + 10) % 12;
  const majorSeventh = (chord.root + 11) % 12;
  if (scale.includes(majorSeventh) && chord.quality === 'major') return [...tones, majorSeventh];
  if (scale.includes(minorSeventh)) return [...tones, minorSeventh];
  return tones;
}

function stack(pcs: number[], bass: number, low: number): number[] {
  const notes: number[] = [];
  let current = low + ((((pcs[bass] - low) % 12) + 12) % 12);
  notes.push(current);
  for (let i = 1; i < pcs.length; i++) {
    const pc = pcs[(bass + i) % pcs.length];
    current += (((pc - current) % 12) + 12) % 12 || 12;
    notes.push(current);
  }
  return notes;
}

function distance(a: number[], b: number[]): number {
  if (a.length === b.length) return a.reduce((sum, note, i) => sum + Math.abs(note - b[i]), 0);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.abs(mean(a) - mean(b)) * a.length;
}

export function voiceChord(
  pcs: number[],
  previous: number[] | null,
  low: number,
  high: number,
  centre: number
): number[] {
  const candidates: number[][] = [];
  for (let bass = 0; bass < pcs.length; bass++) {
    for (const shift of [-12, 0, 12]) {
      const voicing = stack(pcs, bass, low + shift);
      if (voicing[0] >= low && voicing[voicing.length - 1] <= high) candidates.push(voicing);
    }
  }
  if (!candidates.length) return stack(pcs, 0, low);
  const score = (voicing: number[]) => {
    const mean = voicing.reduce((s, x) => s + x, 0) / voicing.length;
    return previous
      ? distance(voicing, previous) + Math.abs(mean - centre) * 0.3
      : Math.abs(mean - centre);
  };
  return candidates.reduce((best, voicing) => (score(voicing) < score(best) ? voicing : best));
}

export function bassNote(root: number, low: number): number {
  return low + ((((root - low) % 12) + 12) % 12);
}
