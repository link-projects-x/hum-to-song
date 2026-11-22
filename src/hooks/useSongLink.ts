import { useCallback, useEffect } from 'react';

import { isSongHash, songFromHash, songLink } from '@/lib/song/share';
import type { TSharedSong } from '@/types/song';

export function useSongLink(onOpen: (song: TSharedSong) => void) {
  useEffect(() => {
    const song = songFromHash(window.location.hash);
    if (song) onOpen(song);
  }, [onOpen]);

  const share = useCallback(async (song: TSharedSong | null) => {
    if (!song) return false;
    const link = songLink(window.location.href, song);
    window.history.replaceState(null, '', link);
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  }, []);

  const forget = useCallback(() => {
    if (!isSongHash(window.location.hash)) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  return { share, forget };
}
