import { describe, expect, it } from 'vitest';

import type { TRecorderState, TStudioStatus } from '@/types/status';

import { liveTake, studioBusy } from './status';

const recorder = (phase: TRecorderState['phase'], progress = 0): TRecorderState => ({
  phase,
  beat: 0,
  bar: 0,
  progress,
});
const idle: TStudioStatus = { phase: 'idle' };
const notes: TStudioStatus = { phase: 'notes', fraction: 0.4 };
const trace = [{ beat: 1, midi: 62 }];

describe('studioBusy', () => {
  it('is busy while recording or working', () => {
    expect(studioBusy(recorder('recording'), idle)).toBe(true);
    expect(studioBusy(recorder('idle'), notes)).toBe(true);
  });

  it('is free once the song is ready', () => {
    expect(studioBusy(recorder('idle'), { phase: 'ready' })).toBe(false);
  });
});

describe('liveTake', () => {
  it('follows the take while recording', () => {
    expect(liveTake(recorder('recording', 0.5), idle, trace, 4, true)).toEqual({
      trace,
      bars: 4,
      position: 8,
    });
  });

  it('has no playhead during the count-in', () => {
    expect(liveTake(recorder('countin'), idle, [], 4, true)?.position).toBeNull();
  });

  it('stays while the notes of a recording are found', () => {
    expect(liveTake(recorder('idle'), notes, trace, 4, true)?.trace).toBe(trace);
  });

  it('is not shown for uploads or once the song is ready', () => {
    expect(liveTake(recorder('idle'), notes, trace, 4, false)).toBeNull();
    expect(liveTake(recorder('idle'), { phase: 'ready' }, trace, 4, true)).toBeNull();
  });
});
