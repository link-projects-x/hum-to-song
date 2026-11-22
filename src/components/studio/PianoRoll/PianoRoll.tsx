import { useEffect, useMemo, useRef } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
import { keyLabel } from '@/lib/music/describe';
import { secondsToBeats } from '@/lib/music/quantize';
import {
  ROLL_GUTTER,
  drawPlayhead,
  drawRoll,
  playheadX,
  readRollTheme,
  rollHeight,
  rollLayout,
  rollWidth,
} from '@/lib/render/roll';
import type { TRollData } from '@/lib/render/roll';
import type { TSong, TTrackId } from '@/types/song';
import type { TContour } from '@/types/transcription';

import styles from './PianoRoll.module.scss';

type TPianoRollProps = {
  song: TSong;
  contour: TContour;
  tracks: Record<TTrackId, boolean>;
  playing: boolean;
  beat: () => number;
};

function setup(canvas: HTMLCanvasElement, width: number, height: number) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

export function PianoRoll({ song, contour, tracks, playing, beat }: TPianoRollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(scrollerRef);

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

  const measured = size.width > 0;
  const width = rollWidth(size.width, data.bars);
  const height = rollHeight();
  const layout = useMemo(() => rollLayout(data, width, height), [data, width, height]);

  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas || !measured) return;
    const ctx = setup(canvas, width, height);
    if (ctx) drawRoll(ctx, data, layout, readRollTheme(canvas), tracks);
  }, [data, layout, width, height, tracks, measured]);

  useEffect(() => {
    const canvas = headRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !scroller || !measured) return;
    const ctx = setup(canvas, width, height);
    if (!ctx) return;
    const theme = readRollTheme(canvas);
    if (!playing) {
      drawPlayhead(ctx, data, layout, theme, null);
      return;
    }
    let frame = 0;
    const tick = () => {
      const position = beat();
      drawPlayhead(ctx, data, layout, theme, position);
      const x = playheadX(data, layout, position);
      if (scroller.scrollWidth > scroller.clientWidth) {
        const left = scroller.scrollLeft;
        if (x < left + ROLL_GUTTER || x > left + scroller.clientWidth - 40) {
          scroller.scrollLeft = Math.max(0, x - ROLL_GUTTER);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [playing, beat, data, layout, width, height, measured]);

  const label = `Piano roll: ${song.notes.length} notes over ${song.grid.bars} bars in ${keyLabel(song.key)}. The thin line is your voice and the blocks are the notes found. Chord names run along the top; the chords, bass and drums are drawn below the notes.`;

  return (
    <div ref={scrollerRef} className={styles.scroller}>
      <div
        className={styles.canvases}
        style={{ '--canvas-width': `${width}px`, '--canvas-height': `${height}px` }}
      >
        <canvas ref={baseRef} className={styles.canvas} role="img" aria-label={label} />
        <canvas ref={headRef} className={styles.canvas} aria-hidden="true" />
      </div>
    </div>
  );
}
