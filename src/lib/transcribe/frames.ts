export const MODEL_RATE = 22050;
export const FFT_HOP = 256;
const WINDOW_HOP = 36164;
const FRAMES_PER_WINDOW = 142;
export const NOTE_BINS = 88;
export const CONTOUR_BINS = 264;
export const MIDI_OFFSET = 21;
export const CONTOUR_BINS_PER_SEMITONE = 3;
export const CONTOUR_PEAK_SHIFT = 1;

export function frameTime(frame: number, offset = 0): number {
  const window = Math.floor(frame / FRAMES_PER_WINDOW);
  const local = frame - window * FRAMES_PER_WINDOW;
  return (window * WINDOW_HOP + local * FFT_HOP) / MODEL_RATE + offset;
}

export function frameTimes(count: number, offset = 0): Float32Array {
  const times = new Float32Array(count);
  for (let i = 0; i < count; i++) times[i] = frameTime(i, offset);
  return times;
}
