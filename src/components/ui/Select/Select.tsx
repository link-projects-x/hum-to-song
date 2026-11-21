import type { SelectHTMLAttributes } from 'react';

import { cx } from '../cx';
import styles from './Select.module.scss';

export function Select({ className, ...selectProps }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(styles.select, className)} {...selectProps} />;
}
