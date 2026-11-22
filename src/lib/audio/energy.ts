const SILENCE_DB = -100;

const toDb = (rms: number) => (rms > 0 ? Math.max(SILENCE_DB, 20 * Math.log10(rms)) : SILENCE_DB);

function rmsAt(samples: Float32Array, center: number, half: number): number {
  const from = Math.max(0, center - half);
  const to = Math.min(samples.length, center + half);
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (to - from));
}

export function energyAtTimes(
  samples: Float32Array,
  rate: number,
  times: Float32Array,
  windowSeconds: number
): Float32Array {
  const half = Math.max(1, Math.round((windowSeconds * rate) / 2));
  const out = new Float32Array(times.length);
  for (let i = 0; i < times.length; i++) {
    out[i] = toDb(rmsAt(samples, Math.round(times[i] * rate), half));
  }
  return out;
}

function percentile(values: ArrayLike<number>, fraction: number): number {
  if (!values.length) return SILENCE_DB;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(fraction * sorted.length)));
  return sorted[index];
}

export type TGateOptions = {
  floorPercentile: number;
  floorMarginDb: number;
  headroomDb: number;
  minDb: number;
};

export function gateThreshold(energyDb: Float32Array, options: TGateOptions): number {
  const floor = percentile(energyDb, options.floorPercentile);
  const peak = percentile(energyDb, 0.95);
  return Math.max(
    options.minDb,
    Math.min(floor + options.floorMarginDb, peak - options.headroomDb)
  );
}
