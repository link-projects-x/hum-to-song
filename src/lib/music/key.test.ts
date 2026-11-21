import { describe, expect, it } from 'vitest';

import { detectKey, pitchClassProfile } from './key';

const melody = (midis: number[], beats = 1) =>
  midis.map((midi, i) => ({ midi, duration: beats, start: i * beats }));

describe('detectKey', () => {
  it('builds a duration-weighted pitch-class profile', () => {
    const profile = pitchClassProfile([
      { midi: 60, duration: 2 },
      { midi: 72, duration: 1 },
      { midi: 67, duration: 0.5 },
    ]);
    expect(profile[0]).toBe(3);
    expect(profile[7]).toBe(0.5);
  });

  it('finds C major for a C major tune', () => {
    const ode = melody([64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60, 60]);
    expect(detectKey(ode)).toMatchObject({ tonic: 0, mode: 'major' });
  });

  it('finds A minor for an A minor tune', () => {
    const tune = melody([
      76, 71, 72, 74, 72, 71, 69, 69, 72, 76, 74, 72, 71, 72, 74, 76, 72, 69, 69,
    ]);
    expect(detectKey(tune)).toMatchObject({ tonic: 9, mode: 'minor' });
  });

  it('follows a transposition', () => {
    const ode = melody([64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60, 60]);
    const up = ode.map((n) => ({ ...n, midi: n.midi + 5 }));
    expect(detectKey(up)).toMatchObject({ tonic: 5, mode: 'major' });
  });

  it('reports a runner-up key', () => {
    const result = detectKey(melody([60, 62, 64, 65, 67, 69, 71, 72]));
    expect(result.score).toBeGreaterThanOrEqual(result.runnerUp.score);
  });
});
