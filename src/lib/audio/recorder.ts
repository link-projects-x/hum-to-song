import type { TRecorderState } from '@/types/status';

import { detectPitch } from './livePitch';

export type TRecordPlan = { bpm: number; bars: number; beatsPerBar: number };

export type TRecordTiming = {
  beat: number;
  countInAt: number;
  startAt: number;
  endAt: number;
  latency: number;
};

const TAIL_SECONDS = 0.3;
const LEAD_SECONDS = 0.25;
const PROCESSOR = 'hum-capture';

const CAPTURE_WORKLET = `
class HumCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.filled = 0;
    this.start = 0;
  }
  flush() {
    if (this.filled > 0) this.port.postMessage({ frame: this.start, data: this.buffer.slice(0, this.filled) });
    this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) {
      this.flush();
      return true;
    }
    if (this.filled === 0) this.start = currentFrame;
    this.buffer.set(channel, this.filled);
    this.filled += channel.length;
    if (this.filled + channel.length > this.buffer.length) this.flush();
    return true;
  }
}
registerProcessor('${PROCESSOR}', HumCapture);
`;

const registered = new WeakSet<BaseAudioContext>();

async function ensureCaptureWorklet(context: AudioContext): Promise<void> {
  if (registered.has(context)) return;
  const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }));
  try {
    await context.audioWorklet.addModule(url);
    registered.add(context);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function recordingTiming(now: number, plan: TRecordPlan, latency: number): TRecordTiming {
  const beat = 60 / plan.bpm;
  const countInAt = now + LEAD_SECONDS;
  const startAt = countInAt + plan.beatsPerBar * beat;
  const endAt = startAt + plan.bars * plan.beatsPerBar * beat + latency + TAIL_SECONDS;
  return { beat, countInAt, startAt, endAt, latency };
}

export function recorderStateAt(
  now: number,
  timing: TRecordTiming,
  plan: TRecordPlan
): TRecorderState {
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

export const keepsTake = (now: number, timing: TRecordTiming) =>
  now >= timing.startAt + timing.beat;

export function barsHeard(
  frames: number,
  rate: number,
  timing: TRecordTiming,
  plan: TRecordPlan
): number {
  const heard = frames / rate - timing.latency - TAIL_SECONDS;
  const bars = Math.ceil(heard / (plan.beatsPerBar * timing.beat) - 0.01);
  return Math.max(1, Math.min(plan.bars, bars));
}

export function streamLatency(context: AudioContext, stream: MediaStream): number {
  const settings = stream.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & {
    latency?: number;
  };
  const input = typeof settings?.latency === 'number' ? settings.latency : 0;
  const output = context.outputLatency || context.baseLatency || 0;
  return Math.max(0, Math.min(0.5, input + output));
}

export function scheduleClicks(context: AudioContext, timing: TRecordTiming, count: number) {
  for (let i = 0; i < count; i++) {
    const at = timing.countInAt + i * timing.beat;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = i === 0 ? 1760 : 1320;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.35, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.08);
  }
}

export function pitchListener(context: AudioContext, stream: MediaStream) {
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const frame = new Float32Array(analyser.fftSize);
  return {
    lag: analyser.fftSize / 2 / context.sampleRate,
    read: () => {
      analyser.getFloatTimeDomainData(frame);
      return detectPitch(frame, context.sampleRate);
    },
    close: () => source.disconnect(),
  };
}

export async function openMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser can’t record audio. Upload a voice memo instead.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch {
    throw new Error(
      'The microphone is blocked. Allow it in the address bar, or upload a voice memo.'
    );
  }
}

export async function captureTake(
  context: AudioContext,
  stream: MediaStream,
  timing: TRecordTiming,
  stop: AbortSignal
): Promise<Float32Array<ArrayBuffer>> {
  await ensureCaptureWorklet(context);
  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, PROCESSOR);
  const silent = context.createGain();
  silent.gain.value = 0;
  source.connect(node);
  node.connect(silent).connect(context.destination);
  const rate = context.sampleRate;
  const startFrame = Math.round(timing.startAt * rate);
  let endFrame = Math.round(timing.endAt * rate);
  const out = new Float32Array(Math.max(1, endFrame - startFrame));

  return new Promise((resolve, reject) => {
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      silent.disconnect();
      stop.removeEventListener('abort', onStop);
      if (error) reject(error);
      else resolve(out.slice(0, Math.max(1, endFrame - startFrame)));
    };
    const waitForEnd = () => {
      clearTimeout(timer);
      const waitMs = Math.max(0, (endFrame / rate - context.currentTime) * 1000) + 1500;
      timer = setTimeout(() => finish(), waitMs);
    };
    const onStop = () => {
      const now = context.currentTime;
      if (!keepsTake(now, timing)) {
        finish(new DOMException('Recording stopped', 'AbortError'));
        return;
      }
      endFrame = Math.min(endFrame, Math.round((now + timing.latency + TAIL_SECONDS) * rate));
      waitForEnd();
    };
    stop.addEventListener('abort', onStop);
    waitForEnd();
    node.port.onmessage = (event: MessageEvent<{ frame: number; data: Float32Array }>) => {
      const { frame, data } = event.data;
      for (let i = 0; i < data.length; i++) {
        const index = frame + i - startFrame;
        if (index >= 0 && index < out.length) out[index] = data[i];
      }
      if (frame + data.length >= endFrame) finish();
    };
    if (stop.aborted) onStop();
  });
}
