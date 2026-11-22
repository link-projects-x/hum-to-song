import type { TChordSpan, TGrid, TKeyEstimate, TMode, TNote } from './music';

export type TStyleId = 'dance' | 'lofi' | 'ballad';

export type TLeadId = 'auto' | 'piano' | 'pluck' | 'keys' | 'synth';

export type TLeadSound = Exclude<TLeadId, 'auto'>;

export type TChordSound = 'pad' | 'keys' | 'piano';

export type TBassSound = 'offbeat' | 'warm' | 'soft';

export type TKit = 'dance' | 'lofi' | 'ballad';

export type TTrackId = 'melody' | 'chords' | 'bass' | 'drums' | 'hum';

export type TDrum = 'kick' | 'snare' | 'clap' | 'hat' | 'openHat' | 'rim';

export type TDrumHit = { drum: TDrum; time: number; velocity: number };

export type TArrangement = {
  style: TStyleId;
  bpm: number;
  bars: number;
  beatsPerBar: number;
  lead: TLeadSound;
  chordSound: TChordSound;
  bassSound: TBassSound;
  kit: TKit;
  melody: TNote[];
  chords: TNote[];
  bass: TNote[];
  drums: TDrumHit[];
};

export type TSong = {
  grid: TGrid;
  notes: TNote[];
  key: TKeyEstimate;
  hummedMode: TMode;
  progressions: TChordSpan[][];
  progressionIndex: number;
  spans: TChordSpan[];
  arrangement: TArrangement;
};
