const MIN_HZ = 65;
const MAX_HZ = 1000;
const TARGET_RATE = 16000;
const SILENCE_RMS = 0.01;
const THRESHOLD = 0.15;

function decimate(samples: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return samples;
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = 0; j < factor; j++) sum += samples[i * factor + j];
    out[i] = sum / factor;
  }
  return out;
}

export function detectPitch(samples: Float32Array, rate: number): number | null {
  const factor = Math.max(1, Math.floor(rate / TARGET_RATE));
  const x = decimate(samples, factor);
  const sr = rate / factor;
  let energy = 0;
  for (let i = 0; i < x.length; i++) energy += x[i] * x[i];
  if (!x.length || Math.sqrt(energy / x.length) < SILENCE_RMS) return null;

  const minLag = Math.max(2, Math.floor(sr / MAX_HZ));
  const maxLag = Math.min(Math.ceil(sr / MIN_HZ), Math.floor(x.length / 2));
  const width = x.length - maxLag;
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let diff = 0;
    for (let i = 0; i < width; i++) {
      const d = x[i] - x[i + lag];
      diff += d * d;
    }
    running += diff;
    cmnd[lag] = running > 0 ? (diff * lag) / running : 1;
  }

  let lag = minLag;
  while (lag <= maxLag && cmnd[lag] >= THRESHOLD) lag++;
  if (lag > maxLag) return null;
  while (lag < maxLag && cmnd[lag + 1] < cmnd[lag]) lag++;

  let refined = lag;
  if (lag < maxLag) {
    const before = cmnd[lag - 1];
    const after = cmnd[lag + 1];
    const curve = before - 2 * cmnd[lag] + after;
    if (curve > 0) refined = lag + (before - after) / (2 * curve);
  }
  return sr / refined;
}
