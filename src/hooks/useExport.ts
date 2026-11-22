import { useCallback, useState } from 'react';

import { downloadBytes, fileSlug } from '@/lib/download';
import { melodyMidi, songMidi } from '@/lib/midi/song';
import { loadRenderer } from '@/lib/playback/loader';
import type { THumAudio } from '@/lib/playback/schedule';
import type { TExportKind, TSong, TTrackId } from '@/types/song';

import { needsPiano } from './usePlayer';

export function useExport(
  song: TSong | null,
  name: string,
  hum: THumAudio | null,
  tracks: Record<TTrackId, boolean>
) {
  const [busy, setBusy] = useState<TExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (kind: TExportKind) => {
      if (!song) return;
      const base = `${fileSlug(name)}-${song.arrangement.style}`;
      setBusy(kind);
      setError(null);
      try {
        if (kind === 'song') {
          downloadBytes(songMidi(song.arrangement, 'Hum to Song'), `${base}.mid`, 'audio/midi');
        } else if (kind === 'melody') {
          downloadBytes(
            melodyMidi(song.arrangement, 'Hum to Song melody'),
            `${fileSlug(name)}-melody.mid`,
            'audio/midi'
          );
        } else {
          const { renderSongWav, loadPiano } = await loadRenderer();
          const piano = needsPiano(song.arrangement) ? await loadPiano() : null;
          const bytes = await renderSongWav(
            song.arrangement,
            piano,
            tracks.hum ? hum : null,
            tracks
          );
          downloadBytes(bytes, `${base}.wav`, 'audio/wav');
        }
      } catch {
        setError('Could not make the file. Try again.');
      } finally {
        setBusy(null);
      }
    },
    [hum, name, song, tracks]
  );

  return { busy, error, run };
}
