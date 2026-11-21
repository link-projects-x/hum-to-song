import { cx } from '@/components/ui';

import styles from './BeatPulse.module.scss';

type TBeatPulseProps = { beats: number; active: number | null; counting: boolean };

export function BeatPulse({ beats, active, counting }: TBeatPulseProps) {
  return (
    <div className={styles.pulse} aria-hidden="true">
      {Array.from({ length: beats }, (_, beat) => (
        <span
          key={beat}
          className={cx(styles.dot, beat === active && (counting ? styles.count : styles.on))}
        />
      ))}
    </div>
  );
}
