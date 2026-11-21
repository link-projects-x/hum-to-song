import { BasicPitch } from '@spotify/basic-pitch';
import * as tf from '@tensorflow/tfjs';

import type { TModelOutput } from '@/types/transcription';

import { CONTOUR_BINS, NOTE_BINS } from './frames';

export type TModelJson = {
  format?: string;
  generatedBy?: string;
  convertedBy?: string | null;
  modelTopology: object;
  weightsManifest: { paths: string[]; weights: tf.io.WeightsManifestEntry[] }[];
};

export async function loadModel(json: TModelJson, weights: ArrayBuffer): Promise<tf.GraphModel> {
  const artifacts: tf.io.ModelArtifacts = {
    format: json.format,
    generatedBy: json.generatedBy,
    convertedBy: json.convertedBy ?? null,
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest.flatMap((group) => group.weights),
    weightData: weights,
  };
  return tf.loadGraphModel(tf.io.fromMemory(artifacts));
}

export async function pickBackend(preferred: string[]): Promise<string> {
  for (const name of preferred) {
    try {
      if (await tf.setBackend(name)) {
        await tf.ready();
        return tf.getBackend();
      }
    } catch {
      continue;
    }
  }
  await tf.ready();
  return tf.getBackend();
}

function flatten(rows: number[][], width: number): Float32Array {
  const out = new Float32Array(rows.length * width);
  rows.forEach((row, i) => out.set(row, i * width));
  return out;
}

export async function runModel(
  model: tf.GraphModel,
  audio: Float32Array,
  onProgress: (fraction: number) => void
): Promise<TModelOutput> {
  const basicPitch = new BasicPitch(Promise.resolve(model));
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  tf.engine().startScope();
  try {
    await basicPitch.evaluateModel(
      audio,
      (f, o, c) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      },
      onProgress
    );
  } finally {
    tf.engine().endScope();
  }
  return {
    frames: flatten(frames, NOTE_BINS),
    onsets: flatten(onsets, NOTE_BINS),
    contours: flatten(contours, CONTOUR_BINS),
    frameCount: frames.length,
  };
}
