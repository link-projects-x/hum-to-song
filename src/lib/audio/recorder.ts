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

export async function ensureCaptureWorklet(context: AudioContext): Promise<void> {
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
  signal: AbortSignal
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
  const endFrame = Math.round(timing.endAt * rate);
  const out = new Float32Array(Math.max(1, endFrame - startFrame));

  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      silent.disconnect();
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve(out);
    };
    const onAbort = () => finish(new DOMException('Recording stopped', 'AbortError'));
    signal.addEventListener('abort', onAbort);
    const waitMs = Math.max(0, (timing.endAt - context.currentTime) * 1000) + 1500;
    const timer = setTimeout(() => finish(), waitMs);
    node.port.onmessage = (event: MessageEvent<{ frame: number; data: Float32Array }>) => {
      const { frame, data } = event.data;
      for (let i = 0; i < data.length; i++) {
        const index = frame + i - startFrame;
        if (index >= 0 && index < out.length) out[index] = data[i];
      }
      if (frame + data.length >= endFrame) finish();
    };
  });
}
