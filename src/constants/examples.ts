export type TExample = {
  id: string;
  title: string;
  credit: string;
  file: string;
  bpm: number;
  bars: number;
  offset: number;
};

export const EXAMPLES: TExample[] = [
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    credit: 'Beethoven',
    file: '/examples/ode-to-joy.wav',
    bpm: 96,
    bars: 8,
    offset: 0.6,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    credit: 'French folk song',
    file: '/examples/frere-jacques.wav',
    bpm: 104,
    bars: 8,
    offset: 0.6,
  },
  {
    id: 'korobeiniki',
    title: 'Korobeiniki',
    credit: 'Russian folk song',
    file: '/examples/korobeiniki.wav',
    bpm: 112,
    bars: 8,
    offset: 0.6,
  },
];
