export const MODEL_BASE_URL = '/model/basic-pitch/';
export const MODEL_JSON = 'model.json';
export const WASM_BASE_URL = '/tfjs/';
export const MODEL_BACKENDS = ['webgpu', 'wasm', 'webgl', 'cpu'];

export const PIANO_BASE_URL = '/samples/piano/';
export const PIANO_SAMPLES: Record<string, string> = {
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
};

export const MAX_UPLOAD_SECONDS = 60;
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
export const UPLOAD_ACCEPT = 'audio/*,.wav,.mp3,.m4a,.webm,.ogg';

export const RENDER_RATE = 44100;
export const RENDER_TAIL_SECONDS = 2;
export const RENDER_PEAK = 0.89;
