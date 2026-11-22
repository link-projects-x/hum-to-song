import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { TRollData } from '@/lib/render/roll';
import { BEATS_PER_BAR } from '@/lib/song/grid';
import type { TTrackId } from '@/types/song';
import type { TPitchPoint } from '@/types/take';

import { RollCanvas } from '../RollCanvas/RollCanvas';

type TLiveRollProps = {
  trace: TPitchPoint[];
  bars: number;
  position: number | null;
};

const LIVE_TRACKS: Record<TTrackId, boolean> = {
  melody: true,
  chords: false,
  bass: false,
  drums: false,
  hum: true,
};

export function LiveRoll({ trace, bars, position }: TLiveRollProps) {
  const positionRef = useRef(0);
  useEffect(() => {
    positionRef.current = position ?? 0;
  }, [position]);
  const beat = useCallback(() => positionRef.current, []);

  const data: TRollData = useMemo(
    () => ({
      notes: [],
      spans: [],
      key: { tonic: 0, mode: 'major' },
      bars,
      beatsPerBar: BEATS_PER_BAR,
      contourBeats: Float32Array.from(trace, (point) => point.beat),
      contourPitches: Float32Array.from(trace, (point) => point.midi ?? Number.NaN),
      bass: [],
      drums: [],
    }),
    [trace, bars]
  );

  return (
    <RollCanvas
      data={data}
      tracks={LIVE_TRACKS}
      label="Your voice, drawn as you hum. The notes, chords, bass and drums appear when the take ends."
      playing={position !== null}
      beat={beat}
    />
  );
}
