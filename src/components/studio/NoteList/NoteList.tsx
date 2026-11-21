import { VisuallyHidden } from '@/components/ui';
import { chordsByBar, describeNote } from '@/lib/music/describe';
import type { TSong } from '@/types/song';

export function NoteList({ song }: { song: TSong }) {
  const bars = chordsByBar(song.spans, song.key, song.grid.beatsPerBar);
  return (
    <VisuallyHidden>
      <ol aria-label="Chords">
        {bars.map((names, bar) => (
          <li key={bar}>
            Bar {bar + 1}: {names.join(', then ')}
          </li>
        ))}
      </ol>
      <ol aria-label="Melody notes">
        {song.notes.map((note, index) => (
          <li key={index}>{describeNote(note, song.key, song.grid.beatsPerBar)}</li>
        ))}
      </ol>
    </VisuallyHidden>
  );
}
