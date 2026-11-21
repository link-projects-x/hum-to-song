import type { HTMLAttributes } from 'react';

import styles from './VisuallyHidden.module.scss';

export function VisuallyHidden(props: HTMLAttributes<HTMLDivElement>) {
  return <div className={styles.hidden} {...props} />;
}
