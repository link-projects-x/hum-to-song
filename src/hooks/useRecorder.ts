import { useCallback, useEffect, useRef, useState } from 'react';

import { resampleToModelRate } from '@/lib/audio/decode';
import {
  captureTake,
  openMicrophone,
  recordingTiming,
  scheduleClicks,
  streamLatency,
} from '@/lib/audio/recorder';
import type { TRecordPlan, TRecordTiming } from '@/lib/audio/recorder';
import type { TRecorderState } from '@/types/status';
import type { TTake } from '@/types/take';

const IDLE: TRecorderState = { phase: 'idle', beat: 0, bar: 0, progress: 0 };

function stateAt(now: number, timing: TRecordTiming, plan: TRecordPlan): TRecorderState {
  if (now < timing.startAt) {
    const beat = Math.max(0, Math.floor((now - timing.countInAt) / timing.beat));
    return { phase: 'countin', beat, bar: 0, progress: 0 };
  }
  const elapsed = now - timing.startAt;
  const total = plan.bars * plan.beatsPerBar * timing.beat;
  const beats = Math.floor(elapsed / timing.beat);
  return {
    phase: 'recording',
    beat: beats % plan.beatsPerBar,
    bar: Math.min(plan.bars - 1, Math.floor(beats / plan.beatsPerBar)),
    progress: Math.min(1, elapsed / total),
  };
}

export function useRecorder() {
  const [state, setState] = useState<TRecorderState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const frameRef = useRef(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const record = useCallback(async (plan: TRecordPlan): Promise<TTake> => {
    const context = new AudioContext({ latencyHint: 'interactive' });
    const controller = new AbortController();
    abortRef.current = controller;
    let stream: MediaStream | null = null;
    try {
      await context.resume();
      setState({ ...IDLE, phase: 'asking' });
      stream = await openMicrophone();
      if (controller.signal.aborted) throw new DOMException('Recording stopped', 'AbortError');
      const timing = recordingTiming(context.currentTime, plan, streamLatency(context, stream));
      scheduleClicks(context, timing, plan.beatsPerBar);
      const tick = () => {
        const next = stateAt(context.currentTime, timing, plan);
        setState((prev) =>
          prev.phase === next.phase &&
          prev.beat === next.beat &&
          prev.bar === next.bar &&
          Math.abs(prev.progress - next.progress) < 0.005
            ? prev
            : next
        );
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
      const captured = await captureTake(context, stream, timing, controller.signal);
      cancelAnimationFrame(frameRef.current);
      setState({ ...IDLE, phase: 'saving' });
      const samples = await resampleToModelRate(captured, context.sampleRate);
      return {
        source: 'mic',
        name: 'My hum',
        samples,
        grid: { bpm: plan.bpm, offset: timing.latency, bars: plan.bars },
      };
    } finally {
      cancelAnimationFrame(frameRef.current);
      stream?.getTracks().forEach((track) => track.stop());
      void context.close();
      abortRef.current = null;
      setState(IDLE);
    }
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return { state, record, cancel };
}
