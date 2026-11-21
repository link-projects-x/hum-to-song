export type TExample = {
  id: string;
  title: string;
  file: string;
  bpm: number;
  bars: number;
  offset: number;
};

export const EXAMPLES: TExample[] = [
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    file: '/examples/ode-to-joy.wav',
    bpm: 96,
    bars: 8,
    offset: 0.6,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    file: '/examples/frere-jacques.wav',
    bpm: 104,
    bars: 8,
    offset: 0.6,
  },
  {
    id: 'korobeiniki',
    title: 'Korobeiniki',
    file: '/examples/korobeiniki.wav',
    bpm: 112,
    bars: 8,
    offset: 0.6,
  },
];
