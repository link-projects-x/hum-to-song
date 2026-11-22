import type { TGrid, TNote } from '@/types/music';
import type { TRawNote } from '@/types/transcription';

export const secondsToBeats = (seconds: number, grid: Pick<TGrid, 'bpm' | 'offset'>) =>
  ((seconds - grid.offset) * grid.bpm) / 60;

export const beatsToSeconds = (beats: number, grid: Pick<TGrid, 'bpm' | 'offset'>) =>
  grid.offset + (beats * 60) / grid.bpm;

function velocityFor(amplitude: number): number {
  return Math.round(Math.max(56, Math.min(112, 40 + amplitude * 90)));
}

export function barsSpanned(raw: TRawNote[], grid: Pick<TGrid, 'bpm' | 'offset' | 'beatsPerBar'>) {
  const last = raw.reduce((max, note) => Math.max(max, note.end), 0);
  return Math.max(1, Math.ceil(secondsToBeats(last, grid) / grid.beatsPerBar - 0.05));
}

export function quantizeNotes(raw: TRawNote[], grid: TGrid): TNote[] {
  const step = grid.step;
  const total = grid.bars * grid.beatsPerBar;
  const placed = raw
    .map((note) => {
      const start = secondsToBeats(note.start, grid);
      const end = secondsToBeats(note.end, grid);
      return { note, start: Math.round(start / step) * step, rawStart: start, rawEnd: end };
    })
    .filter((item) => item.start >= 0 && item.start < total)
    .sort((a, b) => a.start - b.start || a.rawStart - b.rawStart);

  const kept: typeof placed = [];
  for (const item of placed) {
    const last = kept[kept.length - 1];
    if (last && last.start === item.start) {
      const nextSlot = item.start + step;
      const lastLength = last.rawEnd - last.rawStart;
      const itemLength = item.rawEnd - item.rawStart;
      if (item.rawStart > last.rawStart && nextSlot < total && item.rawEnd > nextSlot) {
        kept.push({ ...item, start: nextSlot });
      } else if (itemLength > lastLength) {
        kept[kept.length - 1] = item;
      }
      continue;
    }
    kept.push(item);
  }

  return kept.map((item, index) => {
    const next = kept[index + 1];
    const limit = next ? next.start : total;
    let end = Math.round(item.rawEnd / step) * step;
    if (next && next.start - end < step) end = next.start;
    end = Math.min(limit, Math.max(item.start + step, end));
    return {
      start: item.start,
      duration: end - item.start,
      midi: item.note.midi,
      pitch: item.note.pitch,
      velocity: velocityFor(item.note.amplitude),
    };
  });
}
