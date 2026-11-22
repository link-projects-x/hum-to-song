import * as Tone from 'tone';

import type { TNote } from '@/types/music';
import type { TArrangement, TDrumHit, TTrackId } from '@/types/song';

import type { TBuses, TVoices } from './voices';

export type THumAudio = { samples: Float32Array; rate: number; offset: number };

const TRACK_IDS: TTrackId[] = ['melody', 'chords', 'bass', 'drums', 'hum'];

type TTimed<T> = T & { time: number };

export function songSeconds(arrangement: TArrangement): number {
  return (arrangement.bars * arrangement.beatsPerBar * 60) / arrangement.bpm;
}

export function createBuses(enabled: Record<TTrackId, boolean>, output: Tone.InputNode): TBuses {
  const entries = TRACK_IDS.map((id) => [id, new Tone.Gain(enabled[id] ? 1 : 0).connect(output)]);
  return Object.fromEntries(entries) as TBuses;
}

function humBuffer(hum: THumAudio): Tone.ToneAudioBuffer {
  const audio = new AudioBuffer({
    length: hum.samples.length,
    numberOfChannels: 1,
    sampleRate: hum.rate,
  });
  audio.copyToChannel(Float32Array.from(hum.samples), 0);
  return new Tone.ToneAudioBuffer(audio);
}

export function scheduleSong(
  arrangement: TArrangement,
  voices: TVoices,
  buses: TBuses,
  hum: THumAudio | null
): () => void {
  const spb = 60 / arrangement.bpm;
  const length = songSeconds(arrangement);
  const notePart = (notes: TNote[], play: TVoices['lead']) =>
    new Tone.Part<TTimed<TNote>>(
      (time, n) => play(time, n.midi, n.duration * spb, n.velocity),
      notes.map((n) => ({ ...n, time: n.start * spb }))
    ).start(0);
  const parts: Tone.Part[] = [
    notePart(arrangement.melody, voices.lead),
    notePart(arrangement.chords, voices.chords),
    notePart(arrangement.bass, voices.bass),
    new Tone.Part<TTimed<TDrumHit>>(
      (time, hit) => voices.drum(time, hit.drum, hit.velocity),
      arrangement.drums.map((hit) => ({ ...hit, time: hit.time * spb }))
    ).start(0),
  ];
  let player: Tone.Player | null = null;
  let eventId: number | null = null;
  if (hum) {
    const humPlayer = new Tone.Player(humBuffer(hum)).connect(buses.hum);
    const from = Math.max(0, hum.offset);
    const at = Math.max(0, -hum.offset);
    eventId = Tone.getTransport().schedule((time) => {
      humPlayer.start(time, from, Math.max(0.01, length - at));
    }, at);
    player = humPlayer;
  }
  return () => {
    parts.forEach((part) => part.dispose());
    if (eventId !== null) Tone.getTransport().clear(eventId);
    player?.dispose();
  };
}
