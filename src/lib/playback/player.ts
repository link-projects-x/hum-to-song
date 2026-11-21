import * as Tone from 'tone';

import type { TArrangement, TTrackId } from '@/types/song';

import { createBuses, scheduleSong, songSeconds } from './schedule';
import { createVoices } from './voices';

import type { TPianoBuffers } from './piano';
import type { THumAudio } from './schedule';
import type { TBuses, TVoices } from './voices';

export { loadPiano } from './piano';

export async function unlockAudio(): Promise<void> {
  await Tone.start();
}

export type TPlayer = {
  setSong: (
    arrangement: TArrangement,
    hum: THumAudio | null,
    piano: TPianoBuffers | null
  ) => Promise<void>;
  play: () => Promise<void>;
  stop: () => void;
  setTrack: (track: TTrackId, on: boolean) => void;
  beat: () => number;
  dispose: () => void;
};

export function createMaster(output: Tone.InputNode) {
  const compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.25 });
  const limiter = new Tone.Limiter(-1);
  compressor.chain(limiter, output);
  return { input: compressor, nodes: [compressor, limiter] };
}

export function createPlayer(enabled: Record<TTrackId, boolean>): TPlayer {
  const master = createMaster(Tone.getDestination());
  const buses: TBuses = createBuses(enabled, master.input);
  const transport = Tone.getTransport();
  let voices: TVoices | null = null;
  let unschedule: (() => void) | null = null;
  let current: TArrangement | null = null;

  const clear = () => {
    unschedule?.();
    unschedule = null;
    voices?.dispose();
    voices = null;
  };

  return {
    async setSong(arrangement, hum, piano) {
      clear();
      current = arrangement;
      transport.bpm.value = arrangement.bpm;
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = songSeconds(arrangement);
      const next = createVoices(arrangement, piano, buses);
      voices = next;
      await next.ready;
      if (voices !== next) return;
      unschedule = scheduleSong(arrangement, next, buses, hum);
    },
    async play() {
      await Tone.start();
      if (transport.state !== 'started') transport.start('+0.05', 0);
    },
    stop() {
      transport.stop();
      transport.seconds = 0;
    },
    setTrack(track, on) {
      buses[track].gain.rampTo(on ? 1 : 0, 0.03);
    },
    beat() {
      if (!current || transport.state !== 'started') return 0;
      return (transport.seconds * current.bpm) / 60;
    },
    dispose() {
      transport.stop();
      clear();
      Object.values(buses).forEach((bus) => bus.dispose());
      master.nodes.forEach((node) => node.dispose());
    },
  };
}
