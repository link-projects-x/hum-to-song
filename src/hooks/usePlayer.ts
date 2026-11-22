import { useCallback, useEffect, useRef, useState } from 'react';

import { loadPlayer } from '@/lib/playback/loader';
import type { TPlayer } from '@/lib/playback/player';
import type { THumAudio } from '@/lib/playback/schedule';
import type { TArrangement, TTrackId } from '@/types/song';

type TPlaybackModule = Awaited<ReturnType<typeof loadPlayer>>;

const DEFAULT_TRACKS: Record<TTrackId, boolean> = {
  melody: true,
  chords: true,
  bass: true,
  drums: true,
  hum: false,
};

export type TPlayerStatus = 'idle' | 'loading' | 'error';

export const needsPiano = (arrangement: TArrangement) =>
  arrangement.lead === 'piano' || arrangement.chordSound === 'piano';

export function usePlayer(arrangement: TArrangement | null, hum: THumAudio | null) {
  const moduleRef = useRef<TPlaybackModule | null>(null);
  const playerRef = useRef<TPlayer | null>(null);
  const syncRef = useRef(0);
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const tracksRef = useRef(tracks);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<TPlayerStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const loadModule = useCallback(async () => {
    if (!moduleRef.current) moduleRef.current = await loadPlayer();
    return moduleRef.current;
  }, []);

  const sync = useCallback(async () => {
    if (!arrangement) return;
    syncRef.current += 1;
    const id = syncRef.current;
    const mod = await loadModule();
    if (!playerRef.current) playerRef.current = mod.createPlayer(tracksRef.current);
    const piano = needsPiano(arrangement) ? await mod.loadPiano() : null;
    if (id !== syncRef.current) return;
    await playerRef.current.setSong(arrangement, hum, piano);
  }, [arrangement, hum, loadModule]);

  useEffect(() => {
    if (arrangement) void loadModule();
  }, [arrangement, loadModule]);

  useEffect(() => {
    if (!playerRef.current || !arrangement) return;
    sync().catch(() => {
      setStatus('error');
      setMessage('Could not load the instruments. Try again.');
    });
  }, [arrangement, sync]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    setPlaying(false);
  }, []);

  const toggle = useCallback(async () => {
    if (playing) {
      stop();
      return;
    }
    void moduleRef.current?.unlockAudio();
    setStatus('loading');
    setMessage(null);
    try {
      await sync();
      await playerRef.current?.play();
      setPlaying(true);
      setStatus('idle');
    } catch {
      setStatus('error');
      setMessage('Could not start the sound. Try again.');
    }
  }, [playing, stop, sync]);

  const setTrack = useCallback((track: TTrackId, on: boolean) => {
    setTracks((value) => {
      const next = { ...value, [track]: on };
      tracksRef.current = next;
      return next;
    });
    playerRef.current?.setTrack(track, on);
  }, []);

  const beat = useCallback(() => playerRef.current?.beat() ?? 0, []);

  useEffect(
    () => () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    },
    []
  );

  return { tracks, setTrack, playing, toggle, stop, beat, status, message };
}
