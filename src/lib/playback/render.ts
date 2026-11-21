import * as Tone from 'tone';

import { RENDER_PEAK, RENDER_RATE, RENDER_TAIL_SECONDS } from '@/constants/audio';
import { encodeWav } from '@/lib/audio/wav';
import type { TArrangement, TTrackId } from '@/types/song';

import { createMaster } from './player';
import { createBuses, scheduleSong, songSeconds } from './schedule';
import { createVoices } from './voices';

import type { TPianoBuffers } from './piano';
import type { THumAudio } from './schedule';

export { loadPiano } from './piano';

export async function renderSongWav(
  arrangement: TArrangement,
  piano: TPianoBuffers | null,
  hum: THumAudio | null,
  enabled: Record<TTrackId, boolean>
): Promise<Uint8Array> {
  const buffer = await Tone.Offline(
    async ({ transport, destination }) => {
      const master = createMaster(destination);
      const buses = createBuses(enabled, master.input);
      const voices = createVoices(arrangement, piano, buses);
      await voices.ready;
      transport.bpm.value = arrangement.bpm;
      scheduleSong(arrangement, voices, buses, hum);
      transport.start(0);
    },
    songSeconds(arrangement) + RENDER_TAIL_SECONDS,
    2,
    RENDER_RATE
  );
  const data = buffer.toArray();
  return encodeWav(normalizePeak(Array.isArray(data) ? data : [data]), RENDER_RATE);
}

export function normalizePeak(channels: Float32Array[]): Float32Array[] {
  let peak = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) peak = Math.max(peak, Math.abs(channel[i]));
  }
  if (peak <= RENDER_PEAK) return channels;
  const gain = RENDER_PEAK / peak;
  return channels.map((channel) => channel.map((value) => value * gain));
}
