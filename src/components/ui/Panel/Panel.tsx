import type { ReactNode } from 'react';

import { cx } from '../cx';
import styles from './Panel.module.scss';

type TPanelProps = {
  title: string;
  titleId: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Panel({ title, titleId, actions, className, children }: TPanelProps) {
  return (
    <section className={cx(styles.panel, className)} aria-labelledby={titleId}>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {actions}
      </header>
      {children}
    </section>
  );
}
