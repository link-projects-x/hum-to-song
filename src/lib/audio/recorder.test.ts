import { describe, expect, it } from 'vitest';

import { barsHeard, keepsTake, recorderStateAt, recordingTiming } from './recorder';

const plan = { bpm: 120, bars: 8, beatsPerBar: 4 };
const timing = recordingTiming(10, plan, 0.1);
const rate = 48000;
const tail =
  timing.endAt - timing.startAt - plan.bars * plan.beatsPerBar * timing.beat - timing.latency;
const stoppedAfter = (seconds: number) => Math.round((seconds + timing.latency + tail) * rate);

describe('keepsTake', () => {
  it('drops a take stopped before the first beat is over', () => {
    expect(keepsTake(timing.startAt - 1, timing)).toBe(false);
    expect(keepsTake(timing.startAt + 0.2, timing)).toBe(false);
  });

  it('keeps a take once a beat was hummed', () => {
    expect(keepsTake(timing.startAt + 0.6, timing)).toBe(true);
  });
});

describe('barsHeard', () => {
  it('gives the full length when the take runs out', () => {
    const frames = Math.round(timing.endAt * rate) - Math.round(timing.startAt * rate);
    expect(barsHeard(frames, rate, timing, plan)).toBe(8);
  });

  it('counts the bar in progress when stopped early', () => {
    expect(barsHeard(stoppedAfter(2 * 2 + 0.6), rate, timing, plan)).toBe(3);
    expect(barsHeard(stoppedAfter(4 * 2), rate, timing, plan)).toBe(4);
  });

  it('keeps at least one bar', () => {
    expect(barsHeard(stoppedAfter(0.6), rate, timing, plan)).toBe(1);
  });
});

describe('recorderStateAt', () => {
  it('counts in before the take', () => {
    expect(recorderStateAt(timing.countInAt + 1.1, timing, plan)).toEqual({
      phase: 'countin',
      beat: 2,
      bar: 0,
      progress: 0,
    });
  });

  it('tracks the bar, beat and progress while recording', () => {
    expect(recorderStateAt(timing.startAt + 5.25, timing, plan)).toEqual({
      phase: 'recording',
      beat: 2,
      bar: 2,
      progress: 5.25 / 16,
    });
  });

  it('stops at the last bar', () => {
    expect(recorderStateAt(timing.startAt + 20, timing, plan)).toMatchObject({
      bar: 7,
      progress: 1,
    });
  });
});
