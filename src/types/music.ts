export type TMode = 'major' | 'minor';

export type TKey = { tonic: number; mode: TMode };

export type TKeyEstimate = TKey & { score: number; runnerUp: TKey & { score: number } };

export type TGridStep = 0.5 | 0.25;

export type TGrid = {
  bpm: number;
  offset: number;
  beatsPerBar: number;
  bars: number;
  step: TGridStep;
};

export type TNote = {
  start: number;
  duration: number;
  midi: number;
  pitch: number;
  velocity: number;
};

export type TChordQuality = 'major' | 'minor' | 'diminished' | 'dominant7';

export type TChord = {
  root: number;
  quality: TChordQuality;
  degree: string;
};

export type TChordSpan = { chord: TChord; start: number; duration: number };

export type TProgression = { spans: TChordSpan[]; score: number };
