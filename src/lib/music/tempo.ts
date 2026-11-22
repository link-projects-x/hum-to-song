export type TOnset = { time: number; weight: number };

export type TTempoOptions = {
  minBpm: number;
  maxBpm: number;
  bpmStep: number;
  sigma: number;
  offbeatWeight: number;
  priorBpm: number;
  priorOctaves: number;
  priorWeight: number;
  beatsPerBar: number;
};

const DEFAULT_TEMPO: TTempoOptions = {
  minBpm: 70,
  maxBpm: 140,
  bpmStep: 0.25,
  sigma: 0.035,
  offbeatWeight: 0.5,
  priorBpm: 105,
  priorOctaves: 0.6,
  priorWeight: 0.15,
  beatsPerBar: 4,
};

const PHASES = 48;

function gridScore(onsets: TOnset[], period: number, phase: number, options: TTempoOptions) {
  const half = period / 2;
  const inv = 1 / (2 * options.sigma * options.sigma);
  let score = 0;
  for (const onset of onsets) {
    const position = (onset.time - phase) / half;
    const nearest = Math.round(position);
    const distance = (position - nearest) * half;
    const onBeat = nearest % 2 === 0;
    score +=
      onset.weight * Math.exp(-distance * distance * inv) * (onBeat ? 1 : options.offbeatWeight);
  }
  return score;
}

function expectedScore(total: number, period: number, options: TTempoOptions) {
  const half = period / 2;
  const coverage = Math.min(1, (options.sigma * Math.sqrt(2 * Math.PI)) / half);
  return total * coverage * ((1 + options.offbeatWeight) / 2);
}

function fitGrid(onsets: TOnset[], period: number, phase: number) {
  const half = period / 2;
  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const onset of onsets) {
    const index = Math.round((onset.time - phase) / half);
    const residual = onset.time - (phase + index * half);
    if (Math.abs(residual) > half * 0.3) continue;
    const w = onset.weight;
    n += w;
    sumX += w * index;
    sumY += w * onset.time;
    sumXX += w * index * index;
    sumXY += w * index * onset.time;
  }
  const den = n * sumXX - sumX * sumX;
  if (n <= 0 || Math.abs(den) < 1e-9) return { period, phase };
  const slope = (n * sumXY - sumX * sumY) / den;
  const intercept = (sumY - slope * sumX) / n;
  if (slope <= 0) return { period, phase };
  return { period: slope * 2, phase: intercept };
}

export type TBeatEstimate = { bpm: number; phase: number; confidence: number };

export function estimateBeat(
  onsets: TOnset[],
  overrides: Partial<TTempoOptions> = {}
): TBeatEstimate | null {
  const options = { ...DEFAULT_TEMPO, ...overrides };
  if (onsets.length < 3) return null;
  const total = onsets.reduce((sum, onset) => sum + onset.weight, 0);
  let best = { bpm: options.minBpm, phase: 0, score: -Infinity };
  for (let bpm = options.minBpm; bpm <= options.maxBpm + 1e-9; bpm += options.bpmStep) {
    const period = 60 / bpm;
    let bestPhase = 0;
    let bestPhaseScore = -Infinity;
    for (let k = 0; k < PHASES; k++) {
      const phase = (k / PHASES) * period;
      const score = gridScore(onsets, period, phase, options);
      if (score > bestPhaseScore) {
        bestPhaseScore = score;
        bestPhase = phase;
      }
    }
    const prior =
      -options.priorWeight *
      total *
      (Math.log2(bpm / options.priorBpm) / options.priorOctaves) ** 2;
    const score = bestPhaseScore - expectedScore(total, period, options) + prior;
    if (score > best.score) best = { bpm, phase: bestPhase, score };
  }
  const fitted = fitGrid(onsets, 60 / best.bpm, best.phase);
  const usable = Math.abs(60 / fitted.period - best.bpm) < best.bpm * 0.05;
  const period = usable ? fitted.period : 60 / best.bpm;
  return {
    bpm: Math.round((60 / period) * 10) / 10,
    phase: usable ? fitted.phase : best.phase,
    confidence: Math.max(0, Math.min(1, best.score / Math.max(1e-9, total))),
  };
}

export function barStarts(
  phase: number,
  bpm: number,
  beatsPerBar: number,
  firstOnset: number,
  slack = 0.07
): number[] {
  const period = 60 / bpm;
  const bar = period * beatsPerBar;
  return Array.from({ length: beatsPerBar }, (_, shift) => {
    const start = phase + shift * period;
    return start + Math.floor((firstOnset - start + slack) / bar) * bar;
  });
}
