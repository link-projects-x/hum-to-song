const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const FLAT_TONICS_MAJOR = new Set([5, 10, 3, 8, 1]);
const FLAT_TONICS_MINOR = new Set([2, 7, 0, 5, 10, 3]);

export const pitchClass = (midi: number) => ((Math.round(midi) % 12) + 12) % 12;

export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function prefersFlats(tonic: number, mode: 'major' | 'minor'): boolean {
  return (mode === 'major' ? FLAT_TONICS_MAJOR : FLAT_TONICS_MINOR).has(pitchClass(tonic));
}

export function pitchClassName(pc: number, flats = false): string {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[pitchClass(pc)];
}

export function noteName(midi: number, flats = false): string {
  const rounded = Math.round(midi);
  return `${pitchClassName(rounded, flats)}${Math.floor(rounded / 12) - 1}`;
}
