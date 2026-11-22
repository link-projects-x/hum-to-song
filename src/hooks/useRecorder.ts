import { useCallback, useEffect, useRef, useState } from 'react';

import { resampleToModelRate } from '@/lib/audio/decode';
import {
  barsHeard,
  captureTake,
  keepsTake,
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
  const stopRef = useRef<AbortController | null>(null);
  const frameRef = useRef(0);

  const stop = useCallback(() => {
    stopRef.current?.abort();
  }, []);

  const record = useCallback(async (plan: TRecordPlan): Promise<TTake> => {
    const context = new AudioContext({ latencyHint: 'interactive' });
    const controller = new AbortController();
    stopRef.current = controller;
    let stream: MediaStream | null = null;
    try {
      await context.resume();
      setState({ ...IDLE, phase: 'asking' });
      stream = await openMicrophone();
      if (controller.signal.aborted) throw new DOMException('Recording stopped', 'AbortError');
      const timing = recordingTiming(context.currentTime, plan, streamLatency(context, stream));
      scheduleClicks(context, timing, plan.beatsPerBar);
      const tick = () => {
        if (controller.signal.aborted) {
          if (keepsTake(context.currentTime, timing)) setState({ ...IDLE, phase: 'saving' });
          return;
        }
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
      const bars = barsHeard(captured.length, context.sampleRate, timing, plan);
      const samples = await resampleToModelRate(captured, context.sampleRate);
      return {
        source: 'mic',
        name: 'My hum',
        samples,
        grid: { bpm: plan.bpm, offset: timing.latency, bars },
      };
    } finally {
      cancelAnimationFrame(frameRef.current);
      stream?.getTracks().forEach((track) => track.stop());
      void context.close();
      stopRef.current = null;
      setState(IDLE);
    }
  }, []);

  useEffect(
    () => () => {
      stopRef.current?.abort();
      cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return { state, record, stop };
}
