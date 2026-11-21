import { LEAD_CENTRE, STYLES } from '@/constants/styles';
import type { TChordSpan, TKey, TNote } from '@/types/music';
import type { TArrangement, TDrumHit, TLeadId, TLeadSound, TStyleId } from '@/types/song';

import { bassNote, chordTones, voiceChord } from './voicing';

export type TArrangeInput = {
  style: TStyleId;
  lead: TLeadId;
  melody: TNote[];
  spans: TChordSpan[];
  key: TKey;
  bpm: number;
  bars: number;
  beatsPerBar: number;
};

const note = (start: number, duration: number, midi: number, velocity: number): TNote => ({
  start,
  duration,
  midi,
  pitch: midi,
  velocity,
});

export function leadOctaveShift(melody: TNote[], lead: TLeadSound): number {
  if (!melody.length) return 0;
  const sorted = melody.map((n) => n.midi).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return 12 * Math.round((LEAD_CENTRE[lead] - median) / 12);
}

function voicings(
  spans: TChordSpan[],
  key: TKey,
  sevenths: boolean,
  low: number,
  high: number,
  centre: number
) {
  let previous: number[] | null = null;
  return spans.map((span) => {
    const voiced = voiceChord(chordTones(span.chord, key, sevenths), previous, low, high, centre);
    previous = voiced;
    return voiced;
  });
}

function swung(position: number, swing: number): number {
  const beat = Math.floor(position + 1e-9);
  const frac = position - beat;
  return Math.abs(frac - 0.5) < 1e-6 ? beat + swing : position;
}

export function danceParts(spans: TChordSpan[], key: TKey, bars: number, beatsPerBar: number) {
  const chords: TNote[] = [];
  const bass: TNote[] = [];
  const drums: TDrumHit[] = [];
  voicings(spans, key, false, 55, 79, 66).forEach((voiced, i) => {
    const span = spans[i];
    voiced.forEach((midi) => chords.push(note(span.start, span.duration, midi, 70)));
    const root = bassNote(span.chord.root, 36);
    for (let b = 0; b < span.duration; b++) {
      bass.push(note(span.start + b + 0.5, 0.42, root, b % 2 ? 96 : 104));
    }
  });
  for (let beat = 0; beat < bars * beatsPerBar; beat++) {
    drums.push({ drum: 'kick', time: beat, velocity: 118 });
    if (beat % 2 === 1) drums.push({ drum: 'clap', time: beat, velocity: 102 });
    drums.push({ drum: 'openHat', time: beat + 0.5, velocity: 72 });
    drums.push({ drum: 'hat', time: beat + 0.25, velocity: 38 });
    drums.push({ drum: 'hat', time: beat + 0.75, velocity: 44 });
  }
  return { chords, bass, drums };
}

export function lofiParts(
  spans: TChordSpan[],
  key: TKey,
  bars: number,
  beatsPerBar: number,
  swing: number
) {
  const chords: TNote[] = [];
  const bass: TNote[] = [];
  const drums: TDrumHit[] = [];
  voicings(spans, key, true, 52, 76, 63).forEach((voiced, i) => {
    const span = spans[i];
    const full = span.duration >= beatsPerBar;
    voiced.forEach((midi) => {
      chords.push(note(span.start, full ? 2.4 : span.duration - 0.1, midi, 62));
      if (full) chords.push(note(span.start + 2 + swing, beatsPerBar - 2 - swing - 0.05, midi, 50));
    });
    const root = bassNote(span.chord.root, 36);
    bass.push(note(span.start, full ? 1.8 : span.duration - 0.15, root, 92));
    if (full) bass.push(note(span.start + 2 + swing, 1.1, root, 80));
  });
  for (let bar = 0; bar < bars; bar++) {
    const start = bar * beatsPerBar;
    drums.push({ drum: 'kick', time: start, velocity: 96 });
    drums.push({ drum: 'kick', time: start + 1 + swing, velocity: 66 });
    drums.push({ drum: 'kick', time: start + 2 + swing, velocity: 78 });
    drums.push({ drum: 'snare', time: start + 1, velocity: 84 });
    drums.push({ drum: 'snare', time: start + 3, velocity: 88 });
    for (let eighth = 0; eighth < beatsPerBar * 2; eighth++) {
      const position = swung(start + eighth / 2, swing);
      drums.push({ drum: 'hat', time: position, velocity: eighth % 2 ? 46 : 66 });
    }
  }
  return { chords, bass, drums };
}

export function balladParts(spans: TChordSpan[], key: TKey, bars: number, beatsPerBar: number) {
  const chords: TNote[] = [];
  const bass: TNote[] = [];
  const drums: TDrumHit[] = [];
  voicings(spans, key, false, 55, 76, 64).forEach((voiced, i) => {
    const span = spans[i];
    const low = bassNote(span.chord.root, 43);
    for (let half = 0; half < span.duration; half += 2) {
      const start = span.start + half;
      const length = Math.min(2, span.duration - half);
      const pattern = [low, voiced[1] ?? voiced[0], voiced[voiced.length - 1], voiced[0]];
      pattern.forEach((midi, k) => {
        const at = k * 0.5;
        if (at < length) chords.push(note(start + at, length - at, midi, k === 0 ? 66 : 54));
      });
    }
    bass.push(note(span.start, span.duration - 0.05, bassNote(span.chord.root, 31), 74));
  });
  for (let bar = 0; bar < bars; bar++) {
    const start = bar * beatsPerBar;
    drums.push({ drum: 'kick', time: start, velocity: 74 });
    drums.push({ drum: 'kick', time: start + 2.5, velocity: 52 });
    drums.push({ drum: 'rim', time: start + 1, velocity: 58 });
    drums.push({ drum: 'rim', time: start + 3, velocity: 62 });
    for (let beat = 0; beat < beatsPerBar; beat++) {
      drums.push({ drum: 'hat', time: start + beat, velocity: 34 });
    }
  }
  return { chords, bass, drums };
}

export function arrange(input: TArrangeInput): TArrangement {
  const spec = STYLES[input.style];
  const lead = input.lead === 'auto' ? spec.lead : input.lead;
  const shift = leadOctaveShift(input.melody, lead);
  const melody = input.melody.map((n) => ({ ...n, midi: n.midi + shift, pitch: n.pitch + shift }));
  const parts =
    input.style === 'dance'
      ? danceParts(input.spans, input.key, input.bars, input.beatsPerBar)
      : input.style === 'lofi'
        ? lofiParts(input.spans, input.key, input.bars, input.beatsPerBar, spec.swing)
        : balladParts(input.spans, input.key, input.bars, input.beatsPerBar);
  return {
    style: input.style,
    bpm: input.bpm,
    bars: input.bars,
    beatsPerBar: input.beatsPerBar,
    lead,
    chordSound: spec.chordSound,
    bassSound: spec.bassSound,
    kit: spec.kit,
    melody,
    ...parts,
  };
}
