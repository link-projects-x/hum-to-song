export type TRawNote = {
  start: number;
  end: number;
  midi: number;
  pitch: number;
  amplitude: number;
};

export type TModelOutput = {
  frames: Float32Array;
  onsets: Float32Array;
  contours: Float32Array;
  frameCount: number;
};

export type TContour = { times: Float32Array; pitches: Float32Array };

export type TTranscription = {
  notes: TRawNote[];
  contour: TContour;
  duration: number;
  tuning: number;
  voiced: boolean;
};
