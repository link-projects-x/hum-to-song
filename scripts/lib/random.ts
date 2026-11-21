export type TRandom = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  normal: () => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
};

export function createRandom(seed: number): TRandom {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + (max - min) * next();
  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    normal: () => {
      const u = Math.max(1e-12, next());
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length) % items.length],
  };
}
