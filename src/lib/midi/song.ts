import { GM_DRUMS, GM_PROGRAMS } from '@/constants/styles';
import type { TNote } from '@/types/music';
import type { TArrangement } from '@/types/song';

import { writeMidi, writeSingleTrackMidi } from './write';

import type { TMidiPart, TMidiPartNote } from './write';

const DRUM_CHANNEL = 9;
const DRUM_LENGTH = 0.125;

const toPartNotes = (notes: TNote[]): TMidiPartNote[] =>
  notes.map((n) => ({ midi: n.midi, start: n.start, beats: n.duration, velocity: n.velocity }));

export function melodyPart(arrangement: TArrangement): TMidiPart {
  return {
    name: 'Melody',
    channel: 0,
    program: GM_PROGRAMS.lead[arrangement.lead],
    notes: toPartNotes(arrangement.melody),
  };
}

export function songParts(arrangement: TArrangement): TMidiPart[] {
  return [
    melodyPart(arrangement),
    {
      name: 'Chords',
      channel: 1,
      program: GM_PROGRAMS.chords[arrangement.chordSound],
      notes: toPartNotes(arrangement.chords),
    },
    {
      name: 'Bass',
      channel: 2,
      program: GM_PROGRAMS.bass[arrangement.bassSound],
      notes: toPartNotes(arrangement.bass),
    },
    {
      name: 'Drums',
      channel: DRUM_CHANNEL,
      notes: arrangement.drums.map((hit) => ({
        midi: GM_DRUMS[hit.drum],
        start: hit.time,
        beats: DRUM_LENGTH,
        velocity: hit.velocity,
      })),
    },
  ];
}

export function songMidi(arrangement: TArrangement, title: string): Uint8Array {
  return writeMidi({ title, bpm: arrangement.bpm, parts: songParts(arrangement) });
}

export function melodyMidi(arrangement: TArrangement, title: string): Uint8Array {
  return writeSingleTrackMidi({ title, bpm: arrangement.bpm, parts: [melodyPart(arrangement)] });
}
