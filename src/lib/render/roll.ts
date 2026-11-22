import { chordName } from '@/lib/music/chords';
import { noteName } from '@/lib/music/pitch';
import type { TChordSpan, TKey, TNote } from '@/types/music';
import type { TDrum, TDrumHit, TTrackId } from '@/types/song';

export type TRollTheme = {
  background: string;
  line: string;
  rowDark: string;
  beatLine: string;
  barLine: string;
  note: string;
  noteRing: string;
  hum: string;
  chords: string;
  chordText: string;
  bass: string;
  drums: string;
  text: string;
  label: string;
  laneText: string;
  playhead: string;
  playheadGlow: string;
  sans: string;
  mono: string;
};

export type TRollData = {
  notes: TNote[];
  spans: TChordSpan[];
  key: TKey;
  bars: number;
  beatsPerBar: number;
  contourBeats: Float32Array;
  contourPitches: Float32Array;
  bass: TNote[];
  drums: TDrumHit[];
};

export type TRollLayout = {
  width: number;
  height: number;
  gutter: number;
  strip: number;
  pitch: number;
  lane: number;
  low: number;
  high: number;
};

type TLaneId = Extract<TTrackId, 'chords' | 'bass' | 'drums'>;

type TDrumMark = { top: number; size: number; radius: number; alpha: number };

const LANES: { id: TLaneId; label: string }[] = [
  { id: 'chords', label: 'Chords' },
  { id: 'bass', label: 'Bass' },
  { id: 'drums', label: 'Drums' },
];

const GUTTER = 72;
const STRIP = 30;
const PITCH = 260;
const LANE = 34;
const MIN_WIDTH = 680;
const MIN_BAR = 84;
const MIN_SPAN = 14;
const LABEL_X = 12;
const DIMMED = 0.22;
const HUM_DIMMED = 0.6;
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

const KICK: TDrumMark = { top: 21, size: 9, radius: 4.5, alpha: 1 };
const CLAP: TDrumMark = { top: 11, size: 7, radius: 2, alpha: 0.85 };
const HAT: TDrumMark = { top: 3, size: 5, radius: 1, alpha: 0.55 };
const DRUM_MARKS: Record<TDrum, TDrumMark> = {
  kick: KICK,
  snare: CLAP,
  clap: CLAP,
  rim: CLAP,
  hat: HAT,
  openHat: HAT,
};

export const rollHeight = () => STRIP + PITCH + LANES.length * LANE;

export const rollWidth = (available: number, bars: number) =>
  Math.max(available, MIN_WIDTH, GUTTER + bars * MIN_BAR);

export const ROLL_GUTTER = GUTTER;

export function readRollTheme(element: Element): TRollTheme {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: read('--roll-bg'),
    line: read('--roll-line'),
    rowDark: read('--roll-row-dark'),
    beatLine: read('--roll-beat-line'),
    barLine: read('--roll-bar-line'),
    note: read('--track-melody'),
    noteRing: read('--roll-note-ring'),
    hum: read('--track-hum'),
    chords: read('--track-chords'),
    chordText: read('--roll-chord-text'),
    bass: read('--track-bass'),
    drums: read('--track-drums'),
    text: read('--text-primary'),
    label: read('--text-muted'),
    laneText: read('--text-secondary'),
    playhead: read('--text-primary'),
    playheadGlow: read('--roll-playhead-glow'),
    sans: read('--font-sans') || 'sans-serif',
    mono: read('--font-mono') || 'monospace',
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
  return { width, height, gutter: GUTTER, strip: STRIP, pitch: PITCH, lane: LANE, low, high };
}

const totalBeats = (data: TRollData) => data.bars * data.beatsPerBar;

const beatX = (layout: TRollLayout, data: TRollData, beat: number) =>
  layout.gutter + (beat / totalBeats(data)) * (layout.width - layout.gutter);

const rowHeight = (layout: TRollLayout) => layout.pitch / (layout.high - layout.low + 1);

const rowTop = (layout: TRollLayout, midi: number) =>
  layout.strip + (layout.high - midi) * rowHeight(layout);

const pitchY = (layout: TRollLayout, pitch: number) =>
  layout.strip + (layout.high + 0.5 - pitch) * rowHeight(layout);

const laneTop = (layout: TRollLayout, index: number) =>
  layout.strip + layout.pitch + index * layout.lane;

function hLine(ctx: CanvasRenderingContext2D, y: number, x0: number, x1: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x0, Math.round(y), x1 - x0, 1);
}

function vLine(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), y0, 1, y1 - y0);
}

function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(1, w), h, Math.min(r, h / 2, Math.max(1, w) / 2));
}

function drawPitchArea(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme
) {
  const { width, gutter, low, high } = layout;
  const row = rowHeight(layout);
  for (let midi = low; midi <= high; midi++) {
    const top = rowTop(layout, midi);
    if (BLACK_KEYS.has(((midi % 12) + 12) % 12)) {
      ctx.fillStyle = theme.rowDark;
      ctx.fillRect(gutter, top, width - gutter, row);
    }
    if (midi % 12 === 0) {
      ctx.fillStyle = theme.label;
      ctx.font = `500 11px ${theme.mono}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(noteName(midi), LABEL_X, top + row / 2);
    }
  }
  const bottom = layout.strip + layout.pitch;
  for (let beat = 1; beat < totalBeats(data); beat++) {
    if (beat % data.beatsPerBar !== 0) {
      vLine(ctx, beatX(layout, data, beat), layout.strip, bottom, theme.beatLine);
    }
  }
}

function drawNotes(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme
) {
  const row = rowHeight(layout);
  const h = Math.max(4, row * 0.6);
  for (const note of data.notes) {
    if (note.midi < layout.low || note.midi > layout.high) continue;
    const x0 = beatX(layout, data, note.start) + 1;
    const x1 = beatX(layout, data, note.start + note.duration) - 2;
    const y = rowTop(layout, note.midi) + (row - h) / 2;
    ctx.fillStyle = theme.noteRing;
    block(ctx, x0 - 1, y - 1, x1 - x0 + 2, h + 2, 5);
    ctx.fill();
    ctx.fillStyle = theme.note;
    block(ctx, x0, y, x1 - x0, h, 4);
    ctx.fill();
  }
}

function drawContour(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme,
  alpha: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.gutter, layout.strip, layout.width - layout.gutter, layout.pitch);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = theme.hum;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let drawing = false;
  let lastBeat = -Infinity;
  const total = totalBeats(data);
  for (let i = 0; i < data.contourPitches.length; i++) {
    const pitch = data.contourPitches[i];
    const beat = data.contourBeats[i];
    const visible =
      Number.isFinite(pitch) &&
      beat >= 0 &&
      beat <= total &&
      pitch >= layout.low - 0.5 &&
      pitch <= layout.high + 0.5;
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
  ctx.restore();
}

function drawChordNames(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme
) {
  ctx.font = `600 12px ${theme.mono}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.text;
  for (const span of data.spans) {
    const x0 = beatX(layout, data, span.start);
    const x1 = beatX(layout, data, span.start + span.duration);
    const label = chordName(span.chord, data.key);
    if (ctx.measureText(label).width + 12 <= x1 - x0) ctx.fillText(label, x0 + 8, layout.strip / 2);
  }
}

function drawChordLane(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme,
  top: number,
  alpha: number
) {
  ctx.font = `600 11px ${theme.mono}`;
  ctx.textBaseline = 'middle';
  for (const span of data.spans) {
    const x0 = beatX(layout, data, span.start) + 2;
    const w = beatX(layout, data, span.start + span.duration) - x0 - 2;
    const y = top + 6;
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = theme.chords;
    block(ctx, x0, y, w, 22, 6);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = theme.chords;
    ctx.lineWidth = 1;
    block(ctx, x0 + 0.5, y + 0.5, w - 1, 21, 5.5);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y, Math.max(0, w - 4), 22);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.chordText;
    ctx.fillText(chordName(span.chord, data.key), x0 + 7, y + 11);
    ctx.restore();
  }
}

function drawBassLane(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme,
  top: number,
  alpha: number
) {
  const total = totalBeats(data);
  const notes = data.bass.filter((note) => note.start < total);
  if (!notes.length) return;
  const low = Math.min(...notes.map((note) => note.midi));
  const high = Math.max(...notes.map((note) => note.midi));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.bass;
  for (const note of notes) {
    const x0 = beatX(layout, data, note.start) + 1;
    const x1 = beatX(layout, data, Math.min(total, note.start + note.duration)) - 1;
    const y = top + (high === low ? 13 : 6 + ((high - note.midi) / (high - low)) * 14);
    block(ctx, x0, y, x1 - x0, 8, 3);
    ctx.fill();
  }
}

function drawDrumLane(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme,
  top: number,
  alpha: number
) {
  const total = totalBeats(data);
  ctx.fillStyle = theme.drums;
  for (const hit of data.drums) {
    if (hit.time < 0 || hit.time >= total) continue;
    const mark = DRUM_MARKS[hit.drum];
    ctx.globalAlpha = alpha * mark.alpha;
    block(
      ctx,
      beatX(layout, data, hit.time) + 2,
      top + mark.top,
      mark.size,
      mark.size,
      mark.radius
    );
    ctx.fill();
  }
}

function drawLaneLabel(
  ctx: CanvasRenderingContext2D,
  theme: TRollTheme,
  label: string,
  color: string,
  top: number,
  alpha: number
) {
  const middle = top + LANE / 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(LABEL_X + 3.5, middle, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.laneText;
  ctx.font = `600 11px ${theme.sans}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, LABEL_X + 14, middle);
}

export function drawRoll(
  ctx: CanvasRenderingContext2D,
  data: TRollData,
  layout: TRollLayout,
  theme: TRollTheme,
  tracks: Record<TTrackId, boolean>
) {
  const { width, height, gutter, strip } = layout;
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  drawPitchArea(ctx, data, layout, theme);
  for (let bar = 1; bar < data.bars; bar++) {
    vLine(ctx, beatX(layout, data, bar * data.beatsPerBar), strip, height, theme.barLine);
  }
  drawNotes(ctx, data, layout, theme);
  drawContour(ctx, data, layout, theme, tracks.hum ? 1 : HUM_DIMMED);
  drawChordNames(ctx, data, layout, theme);

  const colors: Record<TLaneId, string> = {
    chords: theme.chords,
    bass: theme.bass,
    drums: theme.drums,
  };
  LANES.forEach((lane, index) => {
    const top = laneTop(layout, index);
    const alpha = tracks[lane.id] ? 1 : DIMMED;
    if (lane.id === 'chords') drawChordLane(ctx, data, layout, theme, top, alpha);
    if (lane.id === 'bass') drawBassLane(ctx, data, layout, theme, top, alpha);
    if (lane.id === 'drums') drawDrumLane(ctx, data, layout, theme, top, alpha);
    drawLaneLabel(ctx, theme, lane.label, colors[lane.id], top, alpha);
    ctx.globalAlpha = 1;
    hLine(ctx, top, 0, width, theme.line);
  });

  ctx.globalAlpha = 1;
  hLine(ctx, strip - 1, 0, width, theme.line);
  vLine(ctx, gutter - 1, 0, height, theme.line);
}

export function playheadX(data: TRollData, layout: TRollLayout, beat: number): number {
  const total = totalBeats(data);
  return beatX(layout, data, ((beat % total) + total) % total);
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
  const x = playheadX(data, layout, beat);
  ctx.save();
  ctx.shadowColor = theme.playheadGlow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = theme.playhead;
  ctx.fillRect(x - 1, 0, 2, layout.height);
  ctx.beginPath();
  ctx.moveTo(x - 6, 0);
  ctx.lineTo(x + 6, 0);
  ctx.lineTo(x, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
