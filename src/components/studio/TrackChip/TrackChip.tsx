import { cx } from '@/components/ui';
import type { TTrackId } from '@/types/song';

import styles from './TrackChip.module.scss';

type TTrackChipProps = {
  id: TTrackId;
  label: string;
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
};

export function TrackChip({ id, label, on, disabled = false, onChange }: TTrackChipProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      className={cx(styles.chip, styles[id], on && styles.on)}
      onClick={() => onChange(!on)}
    >
      <span className={styles.led} aria-hidden="true" />
      {label}
    </button>
  );
}
