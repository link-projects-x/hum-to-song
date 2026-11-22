import { useCallback, useMemo, useRef, useState } from 'react';

import { buildSong } from '@/lib/song/build';
import type { TSongSettings } from '@/lib/song/build';
import { BEATS_PER_BAR, gridFor, withBpm } from '@/lib/song/grid';
import type { TSharedSong } from '@/lib/song/share';
import type { TSong } from '@/types/song';
import type { TStudioStatus } from '@/types/status';
import type { TKnownGrid, TTake } from '@/types/take';
import type { TTranscription } from '@/types/transcription';

import { useNoteFinder } from './useNoteFinder';

export const DEFAULT_SETTINGS: TSongSettings = {
  step: 0.5,
  snap: true,
  style: 'dance',
  lead: 'auto',
  alternative: 0,
  mode: null,
};

const yieldToPaint = () => new Promise<void>((resolve) => setTimeout(resolve, 16));

const errorText = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Something went wrong. Try again.';

export function useStudio() {
  const { load, transcribe, status: noteFinderStatus } = useNoteFinder();
  const [take, setTake] = useState<TTake | null>(null);
  const [transcription, setTranscription] = useState<TTranscription | null>(null);
  const [grid, setGrid] = useState<TKnownGrid | null>(null);
  const [settings, setSettings] = useState<TSongSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<TStudioStatus>({ phase: 'idle' });
  const runRef = useRef(0);

  const prepare = useCallback(() => {
    load().catch(() => undefined);
  }, [load]);

  const process = useCallback(
    async (loadTake: () => Promise<TTake>) => {
      prepare();
      runRef.current += 1;
      const run = runRef.current;
      const current = () => run === runRef.current;
      setStatus({ phase: 'opening' });
      try {
        const next = await loadTake();
        if (!current()) return;
        setStatus({ phase: 'notes', fraction: 0 });
        const result = await transcribe(next.samples, (fraction) => {
          if (current()) setStatus({ phase: 'notes', fraction });
        });
        if (!current()) return;
        if (!result.voiced) {
          throw new Error(
            'We couldn’t hear a tune. Hum a bit louder or closer to the mic, or try another memo.'
          );
        }
        setStatus({ phase: 'chords' });
        await yieldToPaint();
        if (!current()) return;
        setTake(next);
        setTranscription(result);
        setGrid(gridFor(next, result.notes));
        setSettings((value) => ({ ...value, alternative: 0, mode: null }));
        setStatus({ phase: 'ready' });
      } catch (error) {
        if (!current()) return;
        if (error instanceof DOMException && error.name === 'AbortError')
          setStatus({ phase: 'idle' });
        else setStatus({ phase: 'error', message: errorText(error) });
      }
    },
    [prepare, transcribe]
  );

  const fail = useCallback((error: unknown) => {
    runRef.current += 1;
    setStatus({ phase: 'error', message: errorText(error) });
  }, []);

  const openShared = useCallback((shared: TSharedSong) => {
    runRef.current += 1;
    setTake({
      source: 'link',
      name: 'Shared song',
      samples: new Float32Array(0),
      grid: shared.grid,
    });
    setTranscription({
      notes: shared.notes,
      contour: { times: new Float32Array(0), pitches: new Float32Array(0) },
      duration: 0,
      tuning: 0,
      voiced: true,
    });
    setGrid(shared.grid);
    setSettings(shared.settings);
    setStatus({ phase: 'ready' });
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1;
    setStatus({ phase: 'idle' });
  }, []);

  const setBpm = useCallback(
    (bpm: number) => {
      if (!transcription || !grid || !Number.isFinite(bpm)) return;
      setGrid(withBpm(transcription.notes, grid, bpm));
    },
    [grid, transcription]
  );

  const update = useCallback((patch: Partial<TSongSettings>) => {
    setSettings((value) => ({ ...value, ...patch }));
  }, []);

  const song: TSong | null = useMemo(() => {
    if (!transcription || !grid) return null;
    return buildSong(
      transcription.notes,
      { bpm: grid.bpm, offset: grid.offset, bars: grid.bars, beatsPerBar: BEATS_PER_BAR },
      settings
    );
  }, [transcription, grid, settings]);

  return {
    take,
    transcription,
    grid,
    settings,
    song,
    status,
    noteFinderStatus,
    prepare,
    process,
    fail,
    openShared,
    reset,
    setBpm,
    update,
  };
}
