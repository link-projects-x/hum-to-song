import { BasicPitch } from '@spotify/basic-pitch';
import * as tf from '@tensorflow/tfjs';

import type { TModelOutput } from '@/types/transcription';

import { CONTOUR_BINS, MODEL_RATE, NOTE_BINS } from './frames';

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

async function tryBackend(name: string): Promise<boolean> {
  try {
    if (!(await tf.setBackend(name))) return false;
    await tf.ready();
    return true;
  } catch {
    return false;
  }
}

export async function pickBackend(preferred: string[]): Promise<string> {
  for (const name of preferred) {
    if (await tryBackend(name)) return tf.getBackend();
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

export type TStartedModel = { backend: string; model: tf.GraphModel };

export async function startModel(
  json: TModelJson,
  weights: ArrayBuffer,
  backends: string[]
): Promise<TStartedModel> {
  let failure: unknown = new Error('Could not start the note finder.');
  for (const backend of backends) {
    if (!(await tryBackend(backend))) continue;
    let model: tf.GraphModel | null = null;
    try {
      model = await loadModel(json, weights);
      await runModel(model, new Float32Array(MODEL_RATE), () => undefined);
      return { backend, model };
    } catch (error) {
      model?.dispose();
      failure = error;
    }
  }
  throw failure;
}
