import type { TChord, TChordQuality, TChordSpan, TKey, TNote, TProgression } from '@/types/music';

import { beatStrength } from './meter';
import { pitchClass, pitchClassName, prefersFlats } from './pitch';

type TChordDef = { degree: string; offset: number; quality: TChordQuality };

const MAJOR_CHORDS: TChordDef[] = [
  { degree: 'I', offset: 0, quality: 'major' },
  { degree: 'ii', offset: 2, quality: 'minor' },
  { degree: 'iii', offset: 4, quality: 'minor' },
  { degree: 'IV', offset: 5, quality: 'major' },
  { degree: 'V', offset: 7, quality: 'major' },
  { degree: 'vi', offset: 9, quality: 'minor' },
];

const MINOR_CHORDS: TChordDef[] = [
  { degree: 'i', offset: 0, quality: 'minor' },
  { degree: 'III', offset: 3, quality: 'major' },
  { degree: 'iv', offset: 5, quality: 'minor' },
  { degree: 'v', offset: 7, quality: 'minor' },
  { degree: 'V', offset: 7, quality: 'major' },
  { degree: 'V7', offset: 7, quality: 'dominant7' },
  { degree: 'VI', offset: 8, quality: 'major' },
  { degree: 'VII', offset: 10, quality: 'major' },
];

const MAJOR_MOVES: Record<string, Record<string, number>> = {
  I: { ii: -1.2, iii: -1.8, IV: -0.4, V: -0.4, vi: -0.8 },
  ii: { I: -1.2, iii: -2, IV: -1, V: -0.2, vi: -1.5 },
  iii: { I: -1.5, ii: -1.5, IV: -0.6, V: -1.5, vi: -0.5 },
  IV: { I: -0.4, ii: -1, iii: -1.8, V: -0.3, vi: -1.2 },
  V: { I: -0.2, ii: -1.5, iii: -1.8, IV: -0.8, vi: -0.6 },
  vi: { I: -1, ii: -0.6, iii: -1.5, IV: -0.3, V: -0.7 },
};

const MINOR_MOVES: Record<string, Record<string, number>> = {
  i: { III: -0.8, iv: -0.5, v: -1.2, V: -0.6, V7: -0.7, VI: -0.5, VII: -0.6 },
  III: { i: -0.8, iv: -0.8, v: -1.5, V: -1, V7: -1.2, VI: -0.5, VII: -0.7 },
  iv: { i: -0.5, III: -1.2, v: -1, V: -0.3, V7: -0.4, VI: -0.8, VII: -0.6 },
  v: { i: -0.5, III: -1, iv: -0.8, V: -1.5, V7: -1.5, VI: -0.5, VII: -1 },
  V: { i: -0.2, III: -1.5, iv: -1.2, v: -1.5, V7: -0.5, VI: -0.6, VII: -1.5 },
  V7: { i: -0.1, III: -1.5, iv: -1.5, v: -1.5, V: -1, VI: -0.5, VII: -1.5 },
  VI: { i: -0.8, III: -0.8, iv: -0.5, v: -1.2, V: -0.4, V7: -0.5, VII: -0.4 },
  VII: { i: -0.4, III: -0.3, iv: -1.2, v: -1.2, V: -1, V7: -1.2, VI: -0.8 },
};

const DEGREE_PRIOR: Record<string, number> = {
  I: 0.3,
  i: 0.3,
  IV: 0.1,
  iv: 0.1,
  V: 0.1,
  iii: -0.3,
  v: -0.3,
  V7: -0.2,
};

const INTERVALS: Record<TChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  dominant7: [0, 4, 7, 10],
};

export type THarmonyOptions = {
  beatsPerBar: number;
  bars: number;
  alternatives: number;
  midBarPenalty: number;
  stay: number;
  startBonus: number;
  endBonus: number;
  chordTone: number;
  rootTone: number;
  seventhTone: number;
  outsideTone: number;
  heldWeight: number;
};

export const DEFAULT_HARMONY: THarmonyOptions = {
  beatsPerBar: 4,
  bars: 4,
  alternatives: 8,
  midBarPenalty: 0.8,
  stay: 1,
  startBonus: 0.8,
  endBonus: 1,
  chordTone: 0.9,
  rootTone: 1,
  seventhTone: 0.7,
  outsideTone: -0.8,
  heldWeight: 0.4,
};

export function diatonicChords(key: TKey): TChord[] {
  const defs = key.mode === 'major' ? MAJOR_CHORDS : MINOR_CHORDS;
  return defs.map((def) => ({
    root: (key.tonic + def.offset) % 12,
    quality: def.quality,
    degree: def.degree,
  }));
}

export function chordPitchClasses(chord: TChord): number[] {
  return INTERVALS[chord.quality].map((interval) => (chord.root + interval) % 12);
}

export function chordName(chord: TChord, key: TKey): string {
  const root = pitchClassName(chord.root, prefersFlats(key.tonic, key.mode));
  if (chord.quality === 'minor') return `${root}m`;
  if (chord.quality === 'diminished') return `${root}°`;
  if (chord.quality === 'dominant7') return `${root}7`;
  return root;
}

export function toneFit(midi: number, chord: TChord, options: THarmonyOptions): number {
  const pc = pitchClass(midi);
  const tones = chordPitchClasses(chord);
  if (pc === tones[0]) return options.rootTone;
  if (pc === tones[1] || pc === tones[2]) return options.chordTone;
  if (tones.length > 3 && pc === tones[3]) return options.seventhTone;
  return options.outsideTone;
}

function emission(
  notes: TNote[],
  from: number,
  to: number,
  chord: TChord,
  options: THarmonyOptions
): number {
  let score = 0;
  for (const note of notes) {
    const overlap = Math.min(to, note.start + note.duration) - Math.max(from, note.start);
    if (overlap <= 0) continue;
    const strength =
      note.start >= from - 1e-6
        ? beatStrength(note.start, options.beatsPerBar)
        : options.heldWeight;
    score += overlap * strength * toneFit(note.midi, chord, options);
  }
  return score;
}

function move(key: TKey, from: TChord, to: TChord, stay: number): number {
  if (from.degree === to.degree) return -stay;
  const table = key.mode === 'major' ? MAJOR_MOVES : MINOR_MOVES;
  return table[from.degree]?.[to.degree] ?? -1.5;
}

type TPath = { score: number; state: number; prev: TPath | null };

export function harmonize(
  notes: TNote[],
  key: TKey,
  overrides: Partial<THarmonyOptions> = {}
): TProgression[] {
  const options = { ...DEFAULT_HARMONY, ...overrides };
  const chords = diatonicChords(key);
  const half = options.beatsPerBar / 2;
  const slots = options.bars * 2;
  const keep = Math.max(1, options.alternatives);
  const tonic = chords.findIndex((chord) => chord.degree === 'I' || chord.degree === 'i');

  const emissions = Array.from({ length: slots }, (_, slot) =>
    chords.map((chord) => emission(notes, slot * half, (slot + 1) * half, chord, options))
  );

  let layer: TPath[][] = chords.map((chord, state) => [
    {
      score:
        emissions[0][state] +
        (DEGREE_PRIOR[chord.degree] ?? 0) +
        (state === tonic ? options.startBonus : 0),
      state,
      prev: null,
    },
  ]);

  for (let slot = 1; slot < slots; slot++) {
    const midBar = slot % 2 === 1;
    layer = chords.map((chord, state) => {
      const candidates: TPath[] = [];
      layer.forEach((paths, prevState) => {
        const same = prevState === state;
        if (midBar && same) {
          paths.forEach((path) =>
            candidates.push({ score: path.score + emissions[slot][state], state, prev: path })
          );
          return;
        }
        const step =
          move(key, chords[prevState], chord, options.stay) +
          (DEGREE_PRIOR[chord.degree] ?? 0) -
          (midBar ? options.midBarPenalty : 0);
        paths.forEach((path) =>
          candidates.push({ score: path.score + step + emissions[slot][state], state, prev: path })
        );
      });
      return candidates.sort((a, b) => b.score - a.score).slice(0, keep);
    });
  }

  const finals = layer
    .flatMap((paths) =>
      paths.map((path) => ({
        ...path,
        score: path.score + (path.state === tonic ? options.endBonus : 0),
      }))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, keep);

  return finals.map((final) => {
    const states: number[] = [];
    let cursor: TPath | null = final;
    while (cursor) {
      states.unshift(cursor.state);
      cursor = cursor.prev;
    }
    const spans: TChordSpan[] = [];
    for (let bar = 0; bar < options.bars; bar++) {
      const first = states[bar * 2];
      const second = states[bar * 2 + 1];
      const start = bar * options.beatsPerBar;
      if (first === second) {
        spans.push({ chord: chords[first], start, duration: options.beatsPerBar });
      } else {
        spans.push({ chord: chords[first], start, duration: half });
        spans.push({ chord: chords[second], start: start + half, duration: half });
      }
    }
    return { spans, score: final.score };
  });
}

export function chordAt(spans: TChordSpan[], beat: number): TChord | null {
  const span = spans.find((s) => beat >= s.start - 1e-6 && beat < s.start + s.duration - 1e-6);
  return span ? span.chord : null;
}

export function chordFit(notes: TNote[], spans: TChordSpan[], beatsPerBar: number): number {
  const strong = notes.filter((note) => {
    const inBar = note.start % beatsPerBar;
    return Math.abs(inBar) < 1e-6 || Math.abs(inBar - beatsPerBar / 2) < 1e-6;
  });
  if (!strong.length) return 1;
  const fits = strong.filter((note) => {
    const chord = chordAt(spans, note.start);
    return chord ? chordPitchClasses(chord).includes(pitchClass(note.midi)) : false;
  });
  return fits.length / strong.length;
}
