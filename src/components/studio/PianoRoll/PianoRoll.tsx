import { useMemo } from 'react';

import { keyLabel } from '@/lib/music/describe';
import { secondsToBeats } from '@/lib/music/quantize';
import type { TRollData } from '@/lib/render/roll';
import type { TSong, TTrackId } from '@/types/song';
import type { TContour } from '@/types/transcription';

import { RollCanvas } from '../RollCanvas/RollCanvas';

type TPianoRollProps = {
  song: TSong;
  contour: TContour;
  tracks: Record<TTrackId, boolean>;
  playing: boolean;
  beat: () => number;
};

export function PianoRoll({ song, contour, tracks, playing, beat }: TPianoRollProps) {
  const data: TRollData = useMemo(() => {
    const contourBeats = new Float32Array(contour.times.length);
    contour.times.forEach((time, i) => {
      contourBeats[i] = secondsToBeats(time, song.grid);
    });
    return {
      notes: song.notes,
      spans: song.spans,
      key: song.key,
      bars: song.grid.bars,
      beatsPerBar: song.grid.beatsPerBar,
      contourBeats,
      contourPitches: contour.pitches,
      bass: song.arrangement.bass,
      drums: song.arrangement.drums,
    };
  }, [song, contour]);

  const label = `Piano roll: ${song.notes.length} notes over ${song.grid.bars} bars in ${keyLabel(song.key)}. The thin line is your voice and the blocks are the notes found. Chord names run along the top; the chords, bass and drums are drawn below the notes.`;

  return <RollCanvas data={data} tracks={tracks} label={label} playing={playing} beat={beat} />;
}
