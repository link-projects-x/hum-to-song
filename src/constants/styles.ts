import type {
  TBassSound,
  TChordSound,
  TKit,
  TLeadId,
  TLeadSound,
  TStyleId,
  TTrackId,
} from '@/types/song';

export type TStyleSpec = {
  id: TStyleId;
  label: string;
  lead: TLeadSound;
  chordSound: TChordSound;
  bassSound: TBassSound;
  kit: TKit;
  swing: number;
};

export const STYLES: Record<TStyleId, TStyleSpec> = {
  dance: {
    id: 'dance',
    label: 'Dance',
    lead: 'pluck',
    chordSound: 'pad',
    bassSound: 'offbeat',
    kit: 'dance',
    swing: 0.5,
  },
  lofi: {
    id: 'lofi',
    label: 'Lo-fi',
    lead: 'keys',
    chordSound: 'keys',
    bassSound: 'warm',
    kit: 'lofi',
    swing: 0.62,
  },
  ballad: {
    id: 'ballad',
    label: 'Ballad',
    lead: 'piano',
    chordSound: 'piano',
    bassSound: 'soft',
    kit: 'ballad',
    swing: 0.5,
  },
};

export const STYLE_OPTIONS = (Object.keys(STYLES) as TStyleId[]).map((id) => ({
  value: id,
  label: STYLES[id].label,
}));

export const LEAD_OPTIONS: { value: TLeadId; label: string }[] = [
  { value: 'auto', label: 'Style default' },
  { value: 'piano', label: 'Piano' },
  { value: 'pluck', label: 'Pluck' },
  { value: 'keys', label: 'Electric piano' },
  { value: 'synth', label: 'Soft synth' },
];

export const LEAD_CENTRE: Record<TLeadSound, number> = {
  piano: 67,
  pluck: 72,
  keys: 69,
  synth: 69,
};

export const TRACKS: { id: TTrackId; label: string }[] = [
  { id: 'melody', label: 'Melody' },
  { id: 'chords', label: 'Chords' },
  { id: 'bass', label: 'Bass' },
  { id: 'drums', label: 'Drums' },
  { id: 'hum', label: 'Your hum' },
];

export const GM_DRUMS = {
  kick: 36,
  rim: 37,
  snare: 38,
  clap: 39,
  hat: 42,
  openHat: 46,
} as const;

export const GM_PROGRAMS = {
  lead: { piano: 0, pluck: 81, keys: 4, synth: 80 },
  chords: { pad: 90, keys: 4, piano: 0 },
  bass: { offbeat: 38, warm: 33, soft: 32 },
} as const;
