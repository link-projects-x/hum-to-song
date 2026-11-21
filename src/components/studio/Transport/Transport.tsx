import { Button, Toggle } from '@/components/ui';
import { TRACKS } from '@/constants/styles';
import type { TTrackId } from '@/types/song';

import styles from './Transport.module.scss';

type TTransportProps = {
  playing: boolean;
  loading: boolean;
  tracks: Record<TTrackId, boolean>;
  message: string | null;
  onToggle: () => void;
  onTrack: (track: TTrackId, on: boolean) => void;
};

export function Transport({
  playing,
  loading,
  tracks,
  message,
  onToggle,
  onTrack,
}: TTransportProps) {
  return (
    <div className={styles.transport}>
      <Button
        variant="primary"
        size="lg"
        onClick={onToggle}
        disabled={loading}
        aria-pressed={playing}
      >
        {loading ? 'Loading sounds…' : playing ? 'Stop' : 'Play'}
      </Button>
      <fieldset className={styles.tracks}>
        <legend className={styles.legend}>Tracks</legend>
        {TRACKS.map((track) => (
          <Toggle
            key={track.id}
            label={track.label}
            checked={tracks[track.id]}
            onChange={(on) => onTrack(track.id, on)}
          />
        ))}
      </fieldset>
      {message && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
