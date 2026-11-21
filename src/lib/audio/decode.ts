import { MODEL_RATE } from '@/lib/transcribe/frames';

export function mixToMono(buffer: AudioBuffer): Float32Array<ArrayBuffer> {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

export async function decodeAtModelRate(data: ArrayBuffer): Promise<Float32Array<ArrayBuffer>> {
  const context = new OfflineAudioContext(1, 1, MODEL_RATE);
  const decoded = await context.decodeAudioData(data);
  return mixToMono(decoded);
}

export async function resampleToModelRate(
  samples: Float32Array,
  rate: number
): Promise<Float32Array<ArrayBuffer>> {
  if (rate === MODEL_RATE) return Float32Array.from(samples);
  const length = Math.max(1, Math.ceil((samples.length * MODEL_RATE) / rate));
  const context = new OfflineAudioContext(1, length, MODEL_RATE);
  const buffer = context.createBuffer(1, samples.length, rate);
  buffer.copyToChannel(Float32Array.from(samples), 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  return Float32Array.from(rendered.getChannelData(0));
}

export function formatClock(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
