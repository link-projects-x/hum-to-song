import { ProgressBar, cx } from '@/components/ui';
import type { TStatusView } from '@/lib/song/status';

import styles from './StatusLine.module.scss';

export function StatusLine({ view }: { view: TStatusView | null }) {
  return (
    <div className={styles.slot} aria-live="polite">
      {view && (
        <div
          className={cx(styles.status, styles[view.tone])}
          role={view.tone === 'error' ? 'alert' : 'status'}
        >
          <div className={styles.row}>
            <span className={styles.dot} aria-hidden="true" />
            <p className={styles.text}>{view.text}</p>
          </div>
          {view.progress !== null && <ProgressBar value={view.progress} label={view.text} />}
        </div>
      )}
    </div>
  );
}
