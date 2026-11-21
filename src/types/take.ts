export type TTakeSource = 'mic' | 'upload' | 'example';

export type TKnownGrid = { bpm: number; offset: number; bars: number };

export type TTake = {
  source: TTakeSource;
  name: string;
  samples: Float32Array<ArrayBuffer>;
  grid: TKnownGrid | null;
};
