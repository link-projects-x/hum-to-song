import { Button, PlayIcon, Spinner, StopIcon } from '@/components/ui';
import { TRACKS } from '@/constants/styles';
import type { TTrackId } from '@/types/song';

import styles from './Transport.module.scss';
import { TrackChip } from '../TrackChip/TrackChip';

type TTransportProps = {
  playing: boolean;
  loading: boolean;
  tracks: Record<TTrackId, boolean>;
  message: string | null;
  onToggle: () => void;
  onTrack: (track: TTrackId, on: boolean) => void;
};

function PlayLabel({ playing, loading }: { playing: boolean; loading: boolean }) {
  if (loading) {
    return (
      <>
        <Spinner />
        Loading sounds…
      </>
    );
  }
  return playing ? (
    <>
      <StopIcon />
      Stop
    </>
  ) : (
    <>
      <PlayIcon />
      Play
    </>
  );
}

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
        <PlayLabel playing={playing} loading={loading} />
      </Button>
      <div className={styles.tracks} role="group" aria-label="Tracks">
        {TRACKS.map((track) => (
          <TrackChip
            key={track.id}
            id={track.id}
            label={track.label}
            on={tracks[track.id]}
            onChange={(on) => onTrack(track.id, on)}
          />
        ))}
      </div>
      {message && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
