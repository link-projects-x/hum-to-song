import type { TScoreNote } from './melodies';
import type { TRandom } from './random';

export type THumVoice = {
  vibratoRate: number;
  vibratoCents: number;
  driftCents: number;
  tuningCents: number;
  jitterSeconds: number;
  scoopChance: number;
  fallChance: number;
  detachChance: number;
  breathChance: number;
  noiseDb: number;
  peakDb: number;
  mainsHz: number;
  nasalHz: number;
  nasalQ: number;
  highHz: number;
  highGain: number;
  tilt: number;
  breathiness: number;
};

export type TSungNote = { midi: number; on: number; off: number; legato: boolean };

export type THumTake = { samples: Float32Array; rate: number; sung: TSungNote[]; duration: number };

const CONTROL_BLOCK = 32;
const MAX_HARMONIC_HZ = 5200;

export function randomVoice(random: TRandom): THumVoice {
  return {
    vibratoRate: random.range(5, 6),
    vibratoCents: random.range(20, 40),
    driftCents: random.range(8, 25),
    tuningCents: random.range(-25, 25),
    jitterSeconds: 0.04,
    scoopChance: random.range(0.35, 0.7),
    fallChance: random.range(0.2, 0.45),
    detachChance: random.range(0.08, 0.25),
    breathChance: random.range(0.5, 0.9),
    noiseDb: random.range(-64, -50),
    peakDb: random.range(-14, -5),
    mainsHz: random.chance(0.25) ? random.pick([50, 60]) : 0,
    nasalHz: random.range(230, 290),
    nasalQ: random.range(2.4, 3.6),
    highHz: random.range(2350, 2650),
    highGain: random.range(0.03, 0.07),
    tilt: random.range(0.9, 1.3),
    breathiness: random.range(0.01, 0.04),
  };
}

const smoothstep = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

const resonance = (f: number, centre: number, q: number) => {
  const ratio = f / centre;
  return 1 / Math.sqrt((1 - ratio * ratio) ** 2 + (ratio / q) ** 2) / q;
};

function nasalEnvelope(f: number, voice: THumVoice): number {
  return resonance(f, voice.nasalHz, voice.nasalQ) + voice.highGain * resonance(f, voice.highHz, 8);
}

function makeBiquadBandpass(rate: number, centre: number, q: number) {
  const w = (2 * Math.PI * centre) / rate;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w)) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x: number) => {
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

function makePink(random: TRandom) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  return () => {
    const white = random.next() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    return (b0 + b1 + b2 + white * 0.1848) * 0.2;
  };
}

function makeSlowNoise(random: TRandom, rate: number, cutoff: number) {
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let a = 0;
  let b = 0;
  const step = () => {
    a += k * (random.normal() - a);
    b += k * (a - b);
    return b;
  };
  const warmup = Math.ceil((8 * rate) / cutoff);
  let sum = 0;
  for (let i = 0; i < warmup; i++) {
    const v = step();
    if (i >= warmup / 2) sum += v * v;
  }
  const scale = 1 / Math.sqrt(sum / (warmup / 2) || 1);
  return () => step() * scale;
}

function performNotes(
  score: TScoreNote[],
  bpm: number,
  leadIn: number,
  voice: THumVoice,
  random: TRandom
): TSungNote[] {
  const beat = 60 / bpm;
  const jitter = () =>
    Math.max(
      -voice.jitterSeconds,
      Math.min(voice.jitterSeconds, random.normal() * voice.jitterSeconds * 0.5)
    );
  const ons = score.map((note) => leadIn + note.beat * beat + jitter());
  return score.map((note, i) => {
    const next = score[i + 1];
    const touching = next !== undefined && Math.abs(next.beat - (note.beat + note.beats)) < 1e-6;
    const nominalOff = leadIn + (note.beat + note.beats) * beat;
    let off: number;
    let legato = false;
    if (touching && !random.chance(voice.detachChance)) {
      off = ons[i + 1];
      legato = true;
    } else if (touching) {
      off = ons[i + 1] - random.range(0.06, 0.16);
    } else {
      off = nominalOff + jitter() - random.range(0, 0.08);
    }
    off = Math.max(ons[i] + 0.08, off);
    return { midi: note.midi, on: ons[i], off, legato };
  });
}

type TNotePlan = TSungNote & {
  level: number;
  scoop: number;
  scoopTau: number;
  glide: number;
  overshoot: number;
  fall: number;
  attack: number;
  release: number;
  dip: number;
  vibratoPhase: number;
  vibratoRate: number;
  vibratoDelay: number;
};

function planNotes(sung: TSungNote[], voice: THumVoice, random: TRandom): TNotePlan[] {
  return sung.map((note, i) => {
    const prev = sung[i - 1];
    const next = sung[i + 1];
    const fromLegato = prev?.legato === true;
    const beforeRest = !note.legato && (!next || next.on - note.off > 0.2);
    return {
      ...note,
      level: 10 ** (random.range(-2.5, 2.5) / 20),
      scoop: !fromLegato && random.chance(voice.scoopChance) ? random.range(0.5, 1.5) : 0,
      scoopTau: random.range(0.022, 0.045),
      glide: random.range(0.04, 0.09),
      overshoot: fromLegato && random.chance(0.3) ? random.range(0.1, 0.25) : 0,
      fall: beforeRest && random.chance(voice.fallChance) ? random.range(0.3, 1) : 0,
      attack: random.range(0.025, 0.06),
      release: random.range(0.04, 0.09),
      dip: fromLegato
        ? prev.midi === note.midi
          ? random.range(0.12, 0.35)
          : random.range(0.75, 0.95)
        : 1,
      vibratoPhase: random.range(0, 2 * Math.PI),
      vibratoRate: voice.vibratoRate * random.range(0.95, 1.05),
      vibratoDelay: random.range(0.15, 0.3),
    };
  });
}

function pitchAt(t: number, plans: TNotePlan[], index: number, voice: THumVoice, drift: number) {
  const note = plans[index];
  const prev = plans[index - 1];
  let pitch = note.midi;
  if (prev?.legato) {
    const x = (t - (note.on - note.glide * 0.35)) / note.glide;
    if (x < 1) pitch = prev.midi + (note.midi - prev.midi) * smoothstep(x);
    if (note.overshoot && x >= 1) {
      const after = t - (note.on + note.glide * 0.65);
      pitch +=
        Math.sign(note.midi - prev.midi) *
        note.overshoot *
        Math.exp(-after / 0.04) *
        Math.sin(after * 30);
    }
  }
  if (note.scoop) pitch -= note.scoop * Math.exp(-Math.max(0, t - note.on) / note.scoopTau);
  if (note.fall) pitch -= note.fall * smoothstep((t - (note.off - 0.1)) / 0.1);
  const length = note.off - note.on;
  if (length > 0.35) {
    const since = t - note.on - note.vibratoDelay;
    const depth = (voice.vibratoCents / 100) * smoothstep(since / 0.2);
    pitch += depth * Math.sin(2 * Math.PI * note.vibratoRate * (t - note.on) + note.vibratoPhase);
  }
  return pitch + (voice.tuningCents + drift) / 100;
}

function regionStart(plans: TNotePlan[], index: number) {
  const note = plans[index];
  return plans[index - 1]?.legato ? note.on - note.glide * 0.35 : note.on;
}

function dipAround(t: number, onset: number, dip: number) {
  const width = 0.035;
  const d = Math.abs(t - onset);
  return d < width ? 1 - (1 - dip) * (1 - smoothstep(d / width)) : 1;
}

function amplitudeAt(t: number, plans: TNotePlan[], index: number) {
  const note = plans[index];
  const prev = plans[index - 1];
  const next = plans[index + 1];
  if (!prev?.legato && t < note.on) return 0;
  if (!note.legato && t >= note.off) return 0;
  let gain = note.level;
  if (prev?.legato) {
    gain = prev.level + (note.level - prev.level) * smoothstep((t - note.on + 0.015) / 0.03);
    gain *= dipAround(t, note.on, note.dip);
  } else {
    gain *= smoothstep((t - note.on) / note.attack);
  }
  if (note.legato && next) gain *= dipAround(t, next.on, next.dip);
  if (!note.legato) gain *= 1 - smoothstep((t - (note.off - note.release)) / note.release);
  return gain;
}

export function renderHum(
  score: TScoreNote[],
  bpm: number,
  leadIn: number,
  rate: number,
  voice: THumVoice,
  random: TRandom,
  tail = 0.7
): THumTake {
  const sung = performNotes(score, bpm, leadIn, voice, random);
  const plans = planNotes(sung, voice, random);
  const end = Math.max(...sung.map((note) => note.off)) + tail;
  const length = Math.ceil(end * rate);
  const blocks = Math.ceil(length / CONTROL_BLOCK) + 2;
  const controlRate = rate / CONTROL_BLOCK;
  const driftNoise = makeSlowNoise(random, controlRate, 0.25);
  const microNoise = makeSlowNoise(random, controlRate, 6);
  const shimmerNoise = makeSlowNoise(random, controlRate, 25);

  const pitches = new Float32Array(blocks);
  const gains = new Float32Array(blocks);
  let index = 0;
  for (let b = 0; b < blocks; b++) {
    const t = (b * CONTROL_BLOCK) / rate;
    const drift = Math.max(
      -voice.driftCents * 1.5,
      Math.min(voice.driftCents * 1.5, driftNoise() * voice.driftCents * 0.6)
    );
    const micro = microNoise() * 4;
    const shimmer = shimmerNoise() * 0.05;
    while (index + 1 < plans.length && t >= regionStart(plans, index + 1)) index++;
    pitches[b] = plans.length ? pitchAt(t, plans, index, voice, drift + micro) : 60;
    gains[b] = plans.length ? amplitudeAt(t, plans, index) * (1 + shimmer) : 0;
  }
  const smoothing = 1 - Math.exp(-1 / (0.005 * controlRate));
  for (let b = 1; b < blocks; b++) gains[b] = gains[b - 1] + smoothing * (gains[b] - gains[b - 1]);

  const hum = new Float32Array(length);
  const aspiration = makeBiquadBandpass(rate, 900, 0.5);
  let phase = 0;
  let amplitudes: number[] = [];
  for (let i = 0; i < length; i++) {
    const b = Math.floor(i / CONTROL_BLOCK);
    const frac = (i % CONTROL_BLOCK) / CONTROL_BLOCK;
    if (i % CONTROL_BLOCK === 0) {
      const f0 = 440 * 2 ** ((pitches[b] - 69) / 12);
      const count = Math.max(1, Math.floor(Math.min(MAX_HARMONIC_HZ, rate / 2 - 400) / f0));
      amplitudes = Array.from(
        { length: count },
        (_, k) => (k + 1) ** -voice.tilt * nasalEnvelope((k + 1) * f0, voice)
      );
    }
    const pitch = pitches[b] + (pitches[b + 1] - pitches[b]) * frac;
    const gain = gains[b] + (gains[b + 1] - gains[b]) * frac;
    phase += (440 * 2 ** ((pitch - 69) / 12)) / rate;
    phase -= Math.floor(phase);
    const noise = aspiration(random.next() * 2 - 1);
    if (gain <= 1e-5) continue;
    const theta = 2 * Math.PI * phase;
    const c2 = 2 * Math.cos(theta);
    let s1 = Math.sin(theta);
    let s0 = 0;
    let sum = amplitudes[0] * s1;
    for (let k = 1; k < amplitudes.length; k++) {
      const s = c2 * s1 - s0;
      s0 = s1;
      s1 = s;
      sum += amplitudes[k] * s;
    }
    hum[i] = gain * (sum + voice.breathiness * 4 * noise);
  }

  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(hum[i]));
  const scale = peak > 0 ? 10 ** (voice.peakDb / 20) / peak : 0;
  for (let i = 0; i < length; i++) hum[i] *= scale;

  addBreaths(hum, plans, rate, voice, random, scale);
  addRoom(hum, rate, voice, random);
  return { samples: hum, rate, sung, duration: end };
}

function addBreaths(
  out: Float32Array,
  plans: TNotePlan[],
  rate: number,
  voice: THumVoice,
  random: TRandom,
  scale: number
) {
  const level = scale * random.range(0.04, 0.09);
  plans.forEach((note, i) => {
    const gapStart = i === 0 ? 0 : plans[i - 1].off;
    if (note.on - gapStart < 0.45 || !random.chance(voice.breathChance)) return;
    const length = random.range(0.2, 0.38);
    const start = note.on - length - random.range(0.05, 0.12);
    if (start < gapStart + 0.02) return;
    const filter = makeBiquadBandpass(rate, random.range(1000, 2200), 0.8);
    const from = Math.floor(start * rate);
    const to = Math.min(out.length, Math.floor((start + length) * rate));
    for (let s = from; s < to; s++) {
      const x = (s - from) / (to - from);
      out[s] += level * Math.sin(Math.PI * x) ** 2 * filter(random.next() * 2 - 1) * 3;
    }
  });
}

function addRoom(out: Float32Array, rate: number, voice: THumVoice, random: TRandom) {
  const pink = makePink(random);
  const noiseLevel = 10 ** (voice.noiseDb / 20) * 1.6;
  const mains = voice.mainsHz ? 10 ** (random.range(-66, -58) / 20) : 0;
  for (let i = 0; i < out.length; i++) {
    let room = pink() * noiseLevel;
    if (mains) {
      const t = i / rate;
      room +=
        mains *
        (Math.sin(2 * Math.PI * voice.mainsHz * t) +
          0.4 * Math.sin(4 * Math.PI * voice.mainsHz * t));
    }
    out[i] += room;
  }
}
