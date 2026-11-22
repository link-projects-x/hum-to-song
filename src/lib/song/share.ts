import type { TGridStep, TMode } from '@/types/music';
import type { TLeadId, TStyleId, TTrackId } from '@/types/song';
import type { TKnownGrid } from '@/types/take';
import type { TRawNote } from '@/types/transcription';

import { BEATS_PER_BAR, MAX_BARS, MAX_BPM, MIN_BPM } from './grid';

import type { TSongSettings } from './build';

export type TSharedSong = {
  notes: TRawNote[];
  grid: TKnownGrid;
  settings: TSongSettings;
  tracks: Record<TTrackId, boolean>;
};

const VERSION = 1;
const HEADER = 14;
const NOTE = 7;
const PREFIX = '#song=';
const STYLES: TStyleId[] = ['dance', 'lofi', 'ballad'];
const LEADS: TLeadId[] = ['auto', 'piano', 'pluck', 'keys', 'synth'];
const MODES: (TMode | null)[] = [null, 'major', 'minor'];
const STEPS: TGridStep[] = [0.5, 0.25];
const TRACKS: TTrackId[] = ['melody', 'chords', 'bass', 'drums', 'hum'];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function inWindow(note: TRawNote, grid: TKnownGrid): boolean {
  const beat = ((note.start - grid.offset) * grid.bpm) / 60;
  return beat >= -1 && beat < grid.bars * BEATS_PER_BAR + 1;
}

export function encodeSong({ notes, grid, settings, tracks }: TSharedSong): string {
  const kept = notes.filter((note) => inWindow(note, grid));
  const view = new DataView(new ArrayBuffer(HEADER + kept.length * NOTE));
  view.setUint8(0, VERSION);
  view.setUint16(1, clamp(grid.bpm * 10, MIN_BPM * 10, MAX_BPM * 10));
  view.setInt32(3, Math.round(grid.offset * 1000));
  view.setUint8(7, clamp(grid.bars, 1, MAX_BARS));
  view.setUint8(
    8,
    STEPS.indexOf(settings.step) |
      ((settings.snap ? 1 : 0) << 1) |
      (STYLES.indexOf(settings.style) << 2) |
      (LEADS.indexOf(settings.lead) << 4)
  );
  view.setUint8(9, clamp(settings.alternative, 0, 255));
  view.setUint8(10, MODES.indexOf(settings.mode));
  view.setUint8(
    11,
    TRACKS.reduce((mask, id, bit) => (tracks[id] ? mask | (1 << bit) : mask), 0)
  );
  view.setUint16(12, kept.length);
  kept.forEach((note, i) => {
    const at = HEADER + i * NOTE;
    view.setUint16(at, clamp(note.start * 1000, 0, 65535));
    view.setUint16(at + 2, clamp((note.end - note.start) * 1000, 1, 65535));
    view.setUint8(at + 4, clamp(note.midi, 0, 127));
    view.setInt8(at + 5, clamp((note.pitch - note.midi) * 100, -100, 100));
    view.setUint8(at + 6, clamp(note.amplitude * 255, 0, 255));
  });
  return toBase64Url(new Uint8Array(view.buffer));
}

export function decodeSong(text: string): TSharedSong | null {
  const bytes = fromBase64Url(text);
  if (!bytes || bytes.length < HEADER) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(0) !== VERSION) return null;
  const count = view.getUint16(12);
  if (bytes.length !== HEADER + count * NOTE) return null;

  const bpm = view.getUint16(1) / 10;
  const bars = view.getUint8(7);
  const packed = view.getUint8(8);
  const step = STEPS[packed & 1];
  const style = STYLES[(packed >> 2) & 3];
  const lead = LEADS[(packed >> 4) & 7];
  const modeIndex = view.getUint8(10);
  if (bpm < MIN_BPM || bpm > MAX_BPM || bars < 1 || bars > MAX_BARS) return null;
  if (!style || !lead || modeIndex >= MODES.length) return null;

  const mask = view.getUint8(11);
  const tracks = Object.fromEntries(
    TRACKS.map((id, bit) => [id, (mask & (1 << bit)) !== 0])
  ) as Record<TTrackId, boolean>;

  const notes: TRawNote[] = [];
  for (let i = 0; i < count; i++) {
    const at = HEADER + i * NOTE;
    const start = view.getUint16(at) / 1000;
    const midi = view.getUint8(at + 4);
    if (midi > 127) return null;
    notes.push({
      start,
      end: start + view.getUint16(at + 2) / 1000,
      midi,
      pitch: midi + view.getInt8(at + 5) / 100,
      amplitude: view.getUint8(at + 6) / 255,
    });
  }

  return {
    notes,
    grid: { bpm, offset: view.getInt32(3) / 1000, bars },
    settings: {
      step,
      snap: (packed & 2) !== 0,
      style,
      lead,
      alternative: view.getUint8(9),
      mode: MODES[modeIndex],
    },
    tracks,
  };
}

export function songLink(href: string, song: TSharedSong): string {
  return `${href.split('#')[0]}${PREFIX}${encodeSong(song)}`;
}

export function songFromHash(hash: string): TSharedSong | null {
  return hash.startsWith(PREFIX) ? decodeSong(hash.slice(PREFIX.length)) : null;
}
