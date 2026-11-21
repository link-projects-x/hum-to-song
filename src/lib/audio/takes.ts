import { MAX_UPLOAD_BYTES, MAX_UPLOAD_SECONDS } from '@/constants/audio';
import type { TExample } from '@/constants/examples';
import { MODEL_RATE } from '@/lib/transcribe/frames';
import type { TTake } from '@/types/take';

import { decodeAtModelRate, formatClock } from './decode';

export async function loadExampleTake(example: TExample): Promise<TTake> {
  const response = await fetch(example.file);
  if (!response.ok) throw new Error(`Could not load the example (HTTP ${response.status}).`);
  const samples = await decodeAtModelRate(await response.arrayBuffer());
  return {
    source: 'example',
    name: example.title,
    samples,
    grid: { bpm: example.bpm, offset: example.offset, bars: example.bars },
  };
}

export async function readUploadTake(file: File): Promise<TTake> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That file is too big. Pick a voice memo up to 60 seconds long.');
  }
  let samples: Float32Array<ArrayBuffer>;
  try {
    samples = await decodeAtModelRate(await file.arrayBuffer());
  } catch {
    throw new Error('This file can’t be played here. Try a WAV, MP3, M4A, WebM or OGG voice memo.');
  }
  const seconds = samples.length / MODEL_RATE;
  if (seconds > MAX_UPLOAD_SECONDS + 0.5) {
    throw new Error(`This memo is ${formatClock(seconds)} long. Pick one up to 1:00.`);
  }
  if (seconds < 1) throw new Error('This memo is too short. Hum for at least a few seconds.');
  return { source: 'upload', name: file.name, samples, grid: null };
}
