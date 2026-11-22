import { SongArt } from '@/components/ui';

import styles from './EmptySong.module.scss';

export function EmptySong() {
  return (
    <div className={styles.empty}>
      <SongArt />
      <p className={styles.text}>Your song shows up here once there is a tune to work with.</p>
    </div>
  );
}
