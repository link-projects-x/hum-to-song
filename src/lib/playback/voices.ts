import * as Tone from 'tone';

import { midiToHz } from '@/lib/music/pitch';
import type {
  TArrangement,
  TBassSound,
  TChordSound,
  TDrum,
  TKit,
  TLeadSound,
  TTrackId,
} from '@/types/song';

import type { TPianoBuffers } from './piano';

export type TBuses = Record<TTrackId, Tone.Gain>;

type TPlayNote = (time: number, midi: number, duration: number, velocity: number) => void;

export type TVoices = {
  lead: TPlayNote;
  chords: TPlayNote;
  bass: TPlayNote;
  drum: (time: number, drum: TDrum, velocity: number) => void;
  ready: Promise<void>;
  dispose: () => void;
};

type TBuilt = { play: TPlayNote; nodes: Tone.ToneAudioNode[]; ready?: Promise<void> };

const velocityOf = (velocity: number) => Math.max(0.05, Math.min(1, velocity / 127));

function sampledPiano(piano: TPianoBuffers, output: Tone.InputNode, volume: number): TBuilt {
  const sampler = new Tone.Sampler({ urls: piano, release: 1.2, volume }).connect(output);
  return {
    play: (time, midi, duration, velocity) =>
      sampler.triggerAttackRelease(midiToHz(midi), duration, time, velocityOf(velocity)),
    nodes: [sampler],
  };
}

function electricPiano(output: Tone.InputNode, volume: number): TBuilt {
  const tremolo = new Tone.Tremolo({ frequency: 4.5, depth: 0.25, spread: 60 }).start();
  const synth = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1,
    modulationIndex: 3.2,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.004, decay: 1.4, sustain: 0.25, release: 0.9 },
    modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.12, release: 0.6 },
    volume,
  });
  synth.chain(tremolo, output);
  return {
    play: (time, midi, duration, velocity) =>
      synth.triggerAttackRelease(midiToHz(midi), duration, time, velocityOf(velocity)),
    nodes: [synth, tremolo],
  };
}

function buildLead(
  lead: TLeadSound,
  piano: TPianoBuffers | null,
  output: Tone.InputNode,
  bpm: number
): TBuilt {
  if (lead === 'piano' && piano) return sampledPiano(piano, output, -4);
  if (lead === 'keys' || (lead === 'piano' && !piano)) return electricPiano(output, -8);
  if (lead === 'pluck') {
    const delay = new Tone.FeedbackDelay({
      delayTime: (0.75 * 60) / bpm,
      feedback: 0.22,
      wet: 0.18,
    });
    const synth = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'sawtooth' },
      filter: { type: 'lowpass', Q: 2, rolloff: -24 },
      filterEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0.2,
        release: 0.25,
        baseFrequency: 320,
        octaves: 3.6,
      },
      envelope: { attack: 0.003, decay: 0.28, sustain: 0.3, release: 0.25 },
      volume: -13,
    });
    synth.chain(delay, output);
    return {
      play: (time, midi, duration, velocity) =>
        synth.triggerAttackRelease(midiToHz(midi), duration, time, velocityOf(velocity)),
      nodes: [synth, delay],
    };
  }
  const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.06 });
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.75, release: 0.35 },
    volume: -9,
  });
  synth.chain(vibrato, output);
  return {
    play: (time, midi, duration, velocity) =>
      synth.triggerAttackRelease(midiToHz(midi), duration, time, velocityOf(velocity)),
    nodes: [synth, vibrato],
  };
}

function buildChords(
  sound: TChordSound,
  piano: TPianoBuffers | null,
  output: Tone.InputNode
): TBuilt {
  if (sound === 'piano' && piano) return sampledPiano(piano, output, -9);
  if (sound === 'keys' || sound === 'piano') return electricPiano(output, -14);
  const filter = new Tone.Filter({ frequency: 1700, type: 'lowpass', rolloff: -12 });
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 28 },
    envelope: { attack: 0.18, decay: 0.4, sustain: 0.75, release: 0.9 },
    volume: -22,
  });
  synth.chain(filter, output);
  return {
    play: (time, midi, duration, velocity) =>
      synth.triggerAttackRelease(midiToHz(midi), duration, time, velocityOf(velocity)),
    nodes: [synth, filter],
  };
}

function buildBass(sound: TBassSound, output: Tone.InputNode): TBuilt {
  const settings: Record<TBassSound, ConstructorParameters<typeof Tone.MonoSynth>[0]> = {
    offbeat: {
      oscillator: { type: 'square' },
      filter: { type: 'lowpass', Q: 1, rolloff: -24 },
      filterEnvelope: {
        attack: 0.002,
        decay: 0.12,
        sustain: 0.25,
        release: 0.08,
        baseFrequency: 110,
        octaves: 2.6,
      },
      envelope: { attack: 0.002, decay: 0.16, sustain: 0.55, release: 0.06 },
      volume: -12,
    },
    warm: {
      oscillator: { type: 'triangle' },
      filter: { type: 'lowpass', Q: 0.5, rolloff: -24 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.6,
        release: 0.3,
        baseFrequency: 240,
        octaves: 1.2,
      },
      envelope: { attack: 0.012, decay: 0.35, sustain: 0.7, release: 0.25 },
      volume: -5,
    },
    soft: {
      oscillator: { type: 'sine' },
      filter: { type: 'lowpass', Q: 0.5, rolloff: -12 },
      filterEnvelope: {
        attack: 0.02,
        decay: 0.4,
        sustain: 0.8,
        release: 0.5,
        baseFrequency: 300,
        octaves: 1,
      },
      envelope: { attack: 0.02, decay: 0.5, sustain: 0.8, release: 0.45 },
      volume: -6,
    },
  };
  const synth = new Tone.MonoSynth(settings[sound]).connect(output);
  return {
    play: (time, midi, duration, velocity) =>
      synth.triggerAttackRelease(midiToHz(midi), duration, time, velocityOf(velocity)),
    nodes: [synth],
  };
}

type TKitVoices = {
  play: (time: number, drum: TDrum, velocity: number) => void;
  nodes: Tone.ToneAudioNode[];
};

function buildKit(kit: TKit, output: Tone.InputNode): TKitVoices {
  const soft = kit !== 'dance';
  const tone = new Tone.Filter({
    frequency: kit === 'lofi' ? 5200 : 9000,
    type: 'lowpass',
  }).connect(output);
  const kick = new Tone.MembraneSynth({
    pitchDecay: soft ? 0.03 : 0.045,
    octaves: soft ? 5 : 7,
    envelope: { attack: 0.001, decay: soft ? 0.28 : 0.38, sustain: 0, release: 0.05 },
    volume: soft ? -6 : -2,
  }).connect(tone);
  const snareNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: soft ? 0.14 : 0.18, sustain: 0 },
    volume: soft ? -16 : -12,
  });
  const snareFilter = new Tone.Filter({ frequency: 1400, type: 'highpass' }).connect(tone);
  snareNoise.connect(snareFilter);
  const snareBody = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
    volume: soft ? -16 : -12,
  }).connect(tone);
  const clap = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.11, sustain: 0 },
    volume: -9,
  });
  const clapFilter = new Tone.Filter({ frequency: 1300, type: 'bandpass', Q: 1.2 }).connect(tone);
  clap.connect(clapFilter);
  const hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
    volume: soft ? -24 : -22,
  });
  const openHat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.002, decay: 0.24, sustain: 0 },
    volume: -24,
  });
  const hatFilter = new Tone.Filter({ frequency: soft ? 6500 : 7500, type: 'highpass' }).connect(
    tone
  );
  hat.connect(hatFilter);
  openHat.connect(hatFilter);
  const rim = new Tone.MembraneSynth({
    pitchDecay: 0.006,
    octaves: 1.5,
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
    volume: -14,
  }).connect(tone);
  const play = (time: number, drum: TDrum, velocity: number) => {
    const v = velocityOf(velocity);
    if (drum === 'kick') kick.triggerAttackRelease(soft ? 'B0' : 'A0', 0.2, time, v);
    else if (drum === 'snare') {
      snareNoise.triggerAttackRelease(0.14, time, v);
      snareBody.triggerAttackRelease('A3', 0.08, time, v);
    } else if (drum === 'clap') {
      clap.triggerAttackRelease(0.03, time, v * 0.8);
      clap.triggerAttackRelease(0.03, time + 0.011, v * 0.85);
      clap.triggerAttackRelease(0.11, time + 0.023, v);
    } else if (drum === 'hat') hat.triggerAttackRelease(0.03, time, v);
    else if (drum === 'openHat') openHat.triggerAttackRelease(0.2, time, v);
    else rim.triggerAttackRelease('E5', 0.04, time, v);
  };
  return {
    play,
    nodes: [
      tone,
      kick,
      snareNoise,
      snareFilter,
      snareBody,
      clap,
      clapFilter,
      hat,
      openHat,
      hatFilter,
      rim,
    ],
  };
}

function withReverb(bus: Tone.InputNode, decay: number, amount: number) {
  const input = new Tone.Gain(1);
  const send = new Tone.Gain(amount);
  const reverb = new Tone.Reverb({ decay, wet: 1 });
  input.connect(bus);
  input.connect(send);
  send.connect(reverb);
  reverb.connect(bus);
  return { input, nodes: [input, send, reverb], ready: reverb.ready };
}

export function createVoices(
  arrangement: TArrangement,
  piano: TPianoBuffers | null,
  buses: TBuses
): TVoices {
  const decay = arrangement.style === 'ballad' ? 2.8 : 2;
  const amount = arrangement.style === 'dance' ? 0.22 : 0.3;
  const leadFx = withReverb(buses.melody, decay, amount);
  const chordFx = withReverb(buses.chords, decay, amount);
  const lead = buildLead(arrangement.lead, piano, leadFx.input, arrangement.bpm);
  const chords = buildChords(arrangement.chordSound, piano, chordFx.input);
  const bass = buildBass(arrangement.bassSound, buses.bass);
  const kit = buildKit(arrangement.kit, buses.drums);
  const nodes = [
    ...leadFx.nodes,
    ...chordFx.nodes,
    ...lead.nodes,
    ...chords.nodes,
    ...bass.nodes,
    ...kit.nodes,
  ];
  return {
    lead: lead.play,
    chords: chords.play,
    bass: bass.play,
    drum: kit.play,
    ready: Promise.all([leadFx.ready, chordFx.ready]).then(() => undefined),
    dispose: () => nodes.forEach((node) => node.dispose()),
  };
}
