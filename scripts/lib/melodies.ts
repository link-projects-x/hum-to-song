import type { TMode } from '@/types/music';

export type TMelody = {
  id: string;
  title: string;
  origin: string;
  tonic: number;
  mode: TMode;
  score: string;
};

export type TMelodyEvent = { midi: number | null; beats: number };

export type TScoreNote = { midi: number; beat: number; beats: number };

export const BEATS_PER_BAR = 4;

export const MELODIES: readonly TMelody[] = [
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    origin: 'Ludwig van Beethoven, 1824',
    tonic: 0,
    mode: 'major',
    score:
      'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | ' +
      'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2',
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    origin: 'French folk tune',
    tonic: 0,
    mode: 'major',
    score:
      'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | ' +
      'G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2',
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    origin: 'French folk song',
    tonic: 0,
    mode: 'major',
    score:
      'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | ' +
      'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | ' +
      'C4 G3 C4:2 | C4 G3 C4:2',
  },
  {
    id: 'korobeiniki',
    title: 'Korobeiniki',
    origin: 'Russian folk song',
    tonic: 9,
    mode: 'minor',
    score:
      'E5 B4:0.5 C5:0.5 D5 C5:0.5 B4:0.5 | A4 A4:0.5 C5:0.5 E5 D5:0.5 C5:0.5 | ' +
      'B4:1.5 C5:0.5 D5 E5 | C5 A4 A4:2 | ' +
      'r:0.5 D5 F5:0.5 A5 G5:0.5 F5:0.5 | E5:1.5 C5:0.5 E5 D5:0.5 C5:0.5 | ' +
      'B4 B4:0.5 C5:0.5 D5 E5 | C5 A4 A4:2',
  },
  {
    id: 'mary-lamb',
    title: 'Mary Had a Little Lamb',
    origin: 'American nursery rhyme, 1830',
    tonic: 0,
    mode: 'major',
    score:
      'E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | ' +
      'E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4',
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    origin: 'James Lord Pierpont, 1857',
    tonic: 0,
    mode: 'major',
    score:
      'E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4 | ' +
      'F4 F4 F4:1.5 F4:0.5 | F4 E4 E4 E4:0.5 E4:0.5 | E4 D4 D4 E4 | D4:2 G4:2',
  },
  {
    id: 'saints',
    title: 'When the Saints Go Marching In',
    origin: 'American spiritual',
    tonic: 0,
    mode: 'major',
    score: 'r C4 E4 F4 | G4:4 | r C4 E4 F4 | G4:4 | ' + 'r C4 E4 F4 | G4:2 E4:2 | C4:2 E4:2 | D4:4',
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    origin: 'Scottish folk song',
    tonic: 0,
    mode: 'major',
    score:
      'r:3 G3 | C4:1.5 C4:0.5 C4 E4 | D4:1.5 C4:0.5 D4 E4:0.5 D4:0.5 | C4:1.5 C4:0.5 E4 G4 | ' +
      'A4:3 A4 | G4:1.5 E4:0.5 E4 C4 | D4:1.5 C4:0.5 D4 E4:0.5 D4:0.5 | C4:1.5 A3:0.5 A3 G3',
  },
  {
    id: 'yankee-doodle',
    title: 'Yankee Doodle',
    origin: 'American folk song',
    tonic: 0,
    mode: 'major',
    score:
      'C4 C4 D4 E4 | C4 E4 D4 G3 | C4 C4 D4 E4 | C4:2 B3:2 | ' +
      'C4 C4 D4 E4 | F4 E4 D4 C4 | B3 G3 A3 B3 | C4:2 C4:2',
  },
  {
    id: 'oh-susanna',
    title: 'Oh! Susanna',
    origin: 'Stephen Foster, 1848',
    tonic: 0,
    mode: 'major',
    score:
      'r:3 C4:0.5 D4:0.5 | E4 G4 G4:1.5 A4:0.5 | G4 E4 C4:1.5 D4:0.5 | E4 E4 D4 C4 | ' +
      'D4:3 C4:0.5 D4:0.5 | E4 G4 G4:1.5 A4:0.5 | G4 E4 C4:1.5 D4:0.5 | E4 E4 D4 D4',
  },
  {
    id: 'mountain-king',
    title: 'In the Hall of the Mountain King',
    origin: 'Edvard Grieg, 1875',
    tonic: 9,
    mode: 'minor',
    score:
      'A3 B3 C4 D4 | E4 C4 E4:2 | D#4 B3 D#4:2 | D4 Bb3 D4:2 | ' +
      'A3 B3 C4 D4 | E4 C4 E4 A4 | G4 E4 C4 E4 | G4:4',
  },
  {
    id: 'god-rest-ye',
    title: 'God Rest Ye Merry, Gentlemen',
    origin: 'English carol',
    tonic: 4,
    mode: 'minor',
    score:
      'r:3 E4 | E4 B4 B4 A4 | G4 F#4 E4 D4 | E4 F#4 G4 A4 | ' +
      'B4:3 E4 | E4 B4 B4 A4 | G4 F#4 E4 D4 | E4 F#4 G4 A4',
  },
];

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parseNoteName(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new Error(`Bad note name "${name}"`);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + LETTERS[match[1]] + accidental;
}

export function parseScore(score: string): TMelodyEvent[] {
  const events: TMelodyEvent[] = [];
  score.split('|').forEach((bar, index) => {
    let total = 0;
    for (const token of bar.trim().split(/\s+/)) {
      const [name, length] = token.split(':');
      const beats = length ? Number(length) : 1;
      total += beats;
      events.push({ midi: name === 'r' ? null : parseNoteName(name), beats });
    }
    if (Math.abs(total - BEATS_PER_BAR) > 1e-9) {
      throw new Error(`Bar ${index + 1} has ${total} beats: "${bar.trim()}"`);
    }
  });
  return events;
}

export function melodyById(id: string): TMelody {
  const melody = MELODIES.find((item) => item.id === id);
  if (!melody) {
    throw new Error(`Unknown melody "${id}". Known: ${MELODIES.map((m) => m.id).join(', ')}`);
  }
  return melody;
}

export function scoreNotes(melody: TMelody, bars: number, transpose: number): TScoreNote[] {
  const limit = bars * BEATS_PER_BAR;
  const notes: TScoreNote[] = [];
  let beat = 0;
  for (const { midi, beats } of parseScore(melody.score)) {
    if (beat >= limit) break;
    if (midi !== null) {
      notes.push({ midi: midi + transpose, beat, beats: Math.min(beats, limit - beat) });
    }
    beat += beats;
  }
  return notes;
}

export function melodyRange(melody: TMelody): [number, number] {
  const pitches = parseScore(melody.score).flatMap(({ midi }) => (midi === null ? [] : [midi]));
  return [Math.min(...pitches), Math.max(...pitches)];
}
