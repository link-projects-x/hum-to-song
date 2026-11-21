import * as Tone from 'tone';

import { PIANO_BASE_URL, PIANO_SAMPLES } from '@/constants/audio';

export type TPianoBuffers = Record<string, Tone.ToneAudioBuffer>;

let pending: Promise<TPianoBuffers> | null = null;

export function loadPiano(): Promise<TPianoBuffers> {
  if (pending) return pending;
  pending = Promise.all(
    Object.entries(PIANO_SAMPLES).map(async ([note, file]) => {
      const buffer = await Tone.ToneAudioBuffer.fromUrl(`${PIANO_BASE_URL}${file}`);
      return [note, buffer] as const;
    })
  ).then((entries) => Object.fromEntries(entries));
  pending.catch(() => {
    pending = null;
  });
  return pending;
}
