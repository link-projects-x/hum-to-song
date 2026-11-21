import { MODEL_BASE_URL, MODEL_JSON } from '@/constants/audio';
import { MODEL_RATE } from '@/lib/transcribe/frames';
import { loadModel, pickBackend, runModel } from '@/lib/transcribe/model';
import type { TModelJson } from '@/lib/transcribe/model';
import { transcribe } from '@/lib/transcribe/transcribe';
import type { TNoteFinderRequest, TNoteFinderResponse } from '@/types/worker';

import type { GraphModel } from '@tensorflow/tfjs';

let model: Promise<GraphModel> | null = null;

function post(message: TNoteFinderResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

type TDownload = { loaded: number; total: number };

async function download(
  url: string,
  progress: TDownload,
  report: () => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the note finder (HTTP ${response.status}).`);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    progress.loaded += value.length;
    report();
  }
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out.buffer;
}

async function sizeOf(url: string): Promise<number> {
  const response = await fetch(url, { method: 'HEAD' });
  return Number(response.headers.get('Content-Length')) || 0;
}

async function prepare(origin: string): Promise<GraphModel> {
  const started = performance.now();
  const base = new URL(MODEL_BASE_URL, origin).toString();
  const jsonUrl = `${base}${MODEL_JSON}`;
  const backend = pickBackend(['webgl', 'cpu']);
  const jsonSize = await sizeOf(jsonUrl);
  const progress: TDownload = { loaded: 0, total: jsonSize };
  const report = () =>
    post({ type: 'downloading', loaded: progress.loaded, total: progress.total });
  const json = JSON.parse(
    new TextDecoder().decode(await download(jsonUrl, progress, report))
  ) as TModelJson;
  const weightUrls = json.weightsManifest.flatMap((group) =>
    group.paths.map((path) => `${base}${path}`)
  );
  const sizes = await Promise.all(weightUrls.map(sizeOf));
  progress.total = progress.loaded + sizes.reduce((sum, size) => sum + size, 0);
  report();
  const parts = await Promise.all(weightUrls.map((url) => download(url, progress, report)));
  const weights = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    weights.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  post({ type: 'warming' });
  const name = await backend;
  const loaded = await loadModel(json, weights.buffer);
  await runModel(loaded, new Float32Array(MODEL_RATE), () => undefined);
  post({
    type: 'ready',
    backend: name,
    bytes: progress.loaded,
    loadMs: performance.now() - started,
  });
  return loaded;
}

function ensureModel(origin: string): Promise<GraphModel> {
  if (!model) {
    model = prepare(origin);
    model.catch(() => {
      model = null;
    });
  }
  return model;
}

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

let origin = '';

self.addEventListener('message', async (event: MessageEvent<TNoteFinderRequest>) => {
  const request = event.data;
  if (request.type === 'load') {
    origin = request.origin;
    try {
      await ensureModel(origin);
    } catch (error) {
      post({ type: 'error', id: null, message: message(error, 'Could not load the note finder.') });
    }
    return;
  }
  try {
    const ready = await ensureModel(origin || self.location.origin);
    const started = performance.now();
    const output = await runModel(ready, request.audio, (fraction) =>
      post({ type: 'progress', id: request.id, fraction })
    );
    const transcription = transcribe(output, request.audio);
    post({ type: 'result', id: request.id, transcription, inferMs: performance.now() - started }, [
      transcription.contour.times.buffer,
      transcription.contour.pitches.buffer,
    ]);
  } catch (error) {
    post({ type: 'error', id: request.id, message: message(error, 'Could not find the notes.') });
  }
});
