import { chordName } from '@/lib/music/chords';
import { noteName } from '@/lib/music/pitch';
import type { TChordSpan, TKey, TNote } from '@/types/music';

export type TRollTheme = {
  background: string;
  rowDark: string;
  line: string;
  barLine: string;
  note: string;
  noteEdge: string;
  contour: string;
  chordBand: string;
  chordText: string;
  label: string;
  playhead: string;
  font: string;
};

export type TRollData = {
  notes: TNote[];
  spans: TChordSpan[];
  key: TKey;
  bars: number;
  beatsPerBar: number;
  contourBeats: Float32Array;
  contourPitches: Float32Array;
};

export type TRollLayout = {
  width: number;
  height: number;
  gutter: number;
  band: number;
  low: number;
  high: number;
};

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
const GUTTER = 34;
const BAND = 26;
const MIN_SPAN = 14;

export function readRollTheme(element: Element): TRollTheme {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: read('--roll-bg'),
    rowDark: read('--roll-row-dark'),
    line: read('--roll-line'),
    barLine: read('--roll-bar-line'),
    note: read('--roll-note'),
    noteEdge: read('--roll-note-edge'),
    contour: read('--roll-contour'),
    chordBand: read('--roll-chord-band'),
    chordText: read('--roll-chord-text'),
    label: read('--roll-label'),
    playhead: read('--roll-playhead'),
    font: read('--font-sans') || 'sans-serif',
  };
}

export function pitchRange(data: TRollData): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (const note of data.notes) {
    low = Math.min(low, note.midi);
    high = Math.max(high, note.midi);
  }
  for (let i = 0; i < data.contourPitches.length; i++) {
    const pitch = data.contourPitches[i];
    const beat = data.contourBeats[i];
    if (!Number.isFinite(pitch) || beat < 0 || beat > data.bars * data.beatsPerBar) continue;
    low = Math.min(low, Math.floor(pitch));
    high = Math.max(high, Math.ceil(pitch));
  }
  if (!Number.isFinite(low)) return [55, 55 + MIN_SPAN];
  low -= 2;
  high += 2;
  if (high - low < MIN_SPAN) {
    const grow = MIN_SPAN - (high - low);
    low -= Math.floor(grow / 2);
    high += Math.ceil(grow / 2);
  }
  return [low, high];
}

export function rollLayout(data: TRollData, width: number, height: number): TRollLayout {
  const [low, high] = pitchRange(data);
  return { width, height, gutter: GUTTER, band: BAND, low, high };
}

const beatX = (layout: TRollLayout, data: TRollData, beat: number) =>
  layout.gutter + (beat / (data.bars * data.beatsPerBar)) * (layout.width - layout.gutter);

const rowHeight = (layout: TRollLayout) =>
  (layout.height - layout.band) / (layout.high - layout.low + 1);

const pitchY = (layout: TRollLayout, pitch: number) =>
  layout.band + (layout.high + 0.5 - pitch) * rowHeight(layout);

export function drawRoll(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme
) {
  const { width, height, gutter, band, low, high } = layout;
  const row = rowHeight(layout);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  for (let midi = low; midi <= high; midi++) {
    const top = pitchY(layout, midi) - row / 2;
    if (BLACK_KEYS.has(((midi % 12) + 12) % 12)) {
      ctx.fillStyle = theme.rowDark;
      ctx.fillRect(gutter, top, width - gutter, row);
    }
    if (midi % 12 === 0 && row >= 6) {
      ctx.fillStyle = theme.label;
      ctx.font = `600 10px ${theme.font}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(noteName(midi), 4, top + row / 2);
    }
  }

  const totalBeats = data.bars * data.beatsPerBar;
  for (let beat = 0; beat <= totalBeats; beat++) {
    const x = Math.round(beatX(layout, data, beat)) + 0.5;
    ctx.strokeStyle = beat % data.beatsPerBar === 0 ? theme.barLine : theme.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, beat % data.beatsPerBar === 0 ? 0 : band);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.fillStyle = theme.chordBand;
  ctx.fillRect(gutter, 0, width - gutter, band);
  ctx.font = `700 12px ${theme.font}`;
  ctx.textBaseline = 'middle';
  for (const span of data.spans) {
    const x0 = beatX(layout, data, span.start);
    const x1 = beatX(layout, data, span.start + span.duration);
    if (span.start % data.beatsPerBar !== 0) {
      ctx.strokeStyle = theme.barLine;
      ctx.beginPath();
      ctx.moveTo(Math.round(x0) + 0.5, 4);
      ctx.lineTo(Math.round(x0) + 0.5, band - 4);
      ctx.stroke();
    }
    const label = chordName(span.chord, data.key);
    const fits = ctx.measureText(label).width + 10 <= x1 - x0;
    ctx.fillStyle = theme.chordText;
    if (fits) ctx.fillText(label, x0 + 6, band / 2);
  }

  for (const note of data.notes) {
    if (note.midi < low || note.midi > high) continue;
    const x0 = beatX(layout, data, note.start) + 1;
    const x1 = beatX(layout, data, note.start + note.duration) - 1;
    const y = pitchY(layout, note.midi) - row / 2 + 1;
    const h = Math.max(2, row - 2);
    ctx.fillStyle = theme.note;
    ctx.beginPath();
    ctx.roundRect(x0, y, Math.max(2, x1 - x0), h, Math.min(4, h / 2));
    ctx.fill();
    ctx.fillStyle = theme.noteEdge;
    ctx.fillRect(x0, y, 2, h);
  }

  ctx.strokeStyle = theme.contour;
  ctx.lineWidth = 1.25;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let drawing = false;
  let lastBeat = -Infinity;
  for (let i = 0; i < data.contourPitches.length; i++) {
    const pitch = data.contourPitches[i];
    const beat = data.contourBeats[i];
    const visible =
      Number.isFinite(pitch) &&
      beat >= 0 &&
      beat <= totalBeats &&
      pitch >= low - 0.5 &&
      pitch <= high + 0.5;
    if (!visible) {
      drawing = false;
      continue;
    }
    const x = beatX(layout, data, beat);
    const y = pitchY(layout, pitch);
    if (!drawing || beat - lastBeat > 0.25) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    drawing = true;
    lastBeat = beat;
  }
  ctx.stroke();
}

export function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme,
  beat: number | null
) {
  ctx.clearRect(0, 0, layout.width, layout.height);
  if (beat === null) return;
  const total = data.bars * data.beatsPerBar;
  const x = Math.round(beatX(layout, data, ((beat % total) + total) % total)) + 0.5;
  ctx.strokeStyle = theme.playhead;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, layout.height);
  ctx.stroke();
}

export function playheadX(data: TRollData, layout: TRollLayout, beat: number): number {
  const total = data.bars * data.beatsPerBar;
  return beatX(layout, data, ((beat % total) + total) % total);
}
