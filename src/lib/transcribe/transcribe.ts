import type { TModelOutput, TTranscription } from '@/types/transcription';

import { contourFrom, DEFAULT_DECODE, decodeNotes } from './decode';
import { FFT_HOP, MODEL_RATE, frameTimes } from './frames';
import { energyAtTimes, gateThreshold } from '../audio/energy';

import type { TDecodeOptions } from './decode';
import type { TGateOptions } from '../audio/energy';

export const DEFAULT_GATE: TGateOptions = {
  floorPercentile: 0.03,
  floorMarginDb: 10,
  headroomDb: 25,
  minDb: -60,
};

export const ENERGY_WINDOW_SECONDS = 0.025;
export const MIN_TUNE_NOTES = 3;
export const MIN_TUNE_SECONDS = 1;

export type TTranscribeOptions = { decode: TDecodeOptions; gate: TGateOptions };

export const DEFAULT_TRANSCRIBE: TTranscribeOptions = {
  decode: DEFAULT_DECODE,
  gate: DEFAULT_GATE,
};

export function frameEnergy(audio: Float32Array, frameCount: number): Float32Array {
  const centres = frameTimes(frameCount, FFT_HOP / MODEL_RATE / 2);
  return energyAtTimes(audio, MODEL_RATE, centres, ENERGY_WINDOW_SECONDS);
}

export function transcribe(
  output: TModelOutput,
  audio: Float32Array,
  options: TTranscribeOptions = DEFAULT_TRANSCRIBE
): TTranscription {
  const energy = frameEnergy(audio, output.frameCount);
  const gate = gateThreshold(energy, options.gate);
  const { notes, tuning, track } = decodeNotes(output, energy, gate, options.decode);
  return {
    notes,
    contour: contourFrom(track, tuning, options.decode.timeOffset),
    duration: audio.length / MODEL_RATE,
    tuning,
    voiced:
      notes.length >= MIN_TUNE_NOTES &&
      notes.reduce((sum, note) => sum + note.end - note.start, 0) >= MIN_TUNE_SECONDS,
  };
}
