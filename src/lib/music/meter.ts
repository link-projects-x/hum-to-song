const METRIC_WEIGHTS = [1, 0.25, 0.5, 0.25];

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function positionInBar(position: number, beatsPerBar: number): number {
  return ((position % beatsPerBar) + beatsPerBar) % beatsPerBar;
}

export function beatStrength(position: number, beatsPerBar: number): number {
  const inBar = positionInBar(position, beatsPerBar);
  if (near(inBar, 0)) return 1;
  if (near(inBar, beatsPerBar / 2)) return 0.8;
  if (near(inBar, Math.round(inBar))) return 0.6;
  if (near(inBar * 2, Math.round(inBar * 2))) return 0.4;
  return 0.3;
}

export function metricWeight(position: number, beatsPerBar: number): number {
  const inBar = positionInBar(position, beatsPerBar);
  if (!near(inBar, Math.round(inBar))) return 0.1;
  return METRIC_WEIGHTS[Math.round(inBar) % beatsPerBar] ?? 0.25;
}
