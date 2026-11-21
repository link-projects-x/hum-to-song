import type { TTranscription } from './transcription';

export type TNoteFinderRequest =
  | { type: 'load'; origin: string }
  | { type: 'transcribe'; id: number; audio: Float32Array<ArrayBuffer> };

export type TNoteFinderResponse =
  | { type: 'downloading'; loaded: number; total: number }
  | { type: 'warming' }
  | { type: 'ready'; backend: string; bytes: number; loadMs: number }
  | { type: 'progress'; id: number; fraction: number }
  | { type: 'result'; id: number; transcription: TTranscription; inferMs: number }
  | { type: 'error'; id: number | null; message: string };
