export type TNoteFinderStatus =
  | { phase: 'idle' }
  | { phase: 'downloading'; loaded: number; total: number }
  | { phase: 'warming' }
  | { phase: 'ready'; backend: string; loadMs: number; bytes: number }
  | { phase: 'error'; message: string };

export type TRecorderPhase = 'idle' | 'asking' | 'countin' | 'recording' | 'saving';

export type TRecorderState = {
  phase: TRecorderPhase;
  beat: number;
  bar: number;
  progress: number;
};

export type TStudioStatus =
  | { phase: 'idle' }
  | { phase: 'opening' }
  | { phase: 'notes'; fraction: number }
  | { phase: 'chords' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

export type TStatusView = {
  text: string;
  progress: number | null;
  tone: 'busy' | 'error' | 'live';
};
