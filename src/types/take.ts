export type TTakeSource = 'mic' | 'upload' | 'example' | 'link';

export type TKnownGrid = { bpm: number; offset: number; bars: number };

export type TTake = {
  source: TTakeSource;
  name: string;
  samples: Float32Array<ArrayBuffer>;
  grid: TKnownGrid | null;
};

export type TPitchPoint = { beat: number; midi: number | null };

export type TLiveTake = { trace: TPitchPoint[]; bars: number; position: number | null };
