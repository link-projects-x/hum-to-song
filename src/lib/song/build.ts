import { arrange } from '@/lib/arrange/styles';
import { harmonize } from '@/lib/music/chords';
import { detectKey } from '@/lib/music/key';
import { changeMode } from '@/lib/music/mode';
import { quantizeNotes } from '@/lib/music/quantize';
import { snapToKey } from '@/lib/music/scale';
import type { TGrid } from '@/types/music';
import type { TSong, TSongSettings } from '@/types/song';
import type { TRawNote } from '@/types/transcription';

export function buildSong(
  raw: TRawNote[],
  base: Omit<TGrid, 'step'>,
  settings: TSongSettings
): TSong | null {
  const grid: TGrid = { ...base, step: settings.step };
  const quantized = quantizeNotes(raw, grid);
  if (!quantized.length) return null;
  const hummed = detectKey(quantized, grid.beatsPerBar);
  const snapped = settings.snap ? snapToKey(quantized, hummed) : quantized;
  const key = { ...hummed, mode: settings.mode ?? hummed.mode };
  const notes = changeMode(snapped, hummed, key.mode);
  const progressions = harmonize(notes, key, { bars: grid.bars, beatsPerBar: grid.beatsPerBar });
  const progressionIndex = progressions.length ? settings.alternative % progressions.length : 0;
  const spans = progressions[progressionIndex]?.spans ?? [];
  const arrangement = arrange({
    style: settings.style,
    lead: settings.lead,
    melody: notes,
    spans,
    key,
    bpm: grid.bpm,
    bars: grid.bars,
    beatsPerBar: grid.beatsPerBar,
  });
  return {
    grid,
    notes,
    key,
    hummedMode: hummed.mode,
    progressions: progressions.map((progression) => progression.spans),
    progressionIndex,
    spans,
    arrangement,
  };
}
