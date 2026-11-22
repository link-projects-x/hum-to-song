import { useEffect, useMemo, useRef } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
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
import type { TTrackId } from '@/types/song';

import styles from './RollCanvas.module.scss';

type TRollCanvasProps = {
  data: TRollData;
  tracks: Record<TTrackId, boolean>;
  label: string;
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

export function RollCanvas({ data, tracks, label, playing, beat }: TRollCanvasProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(scrollerRef);

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
