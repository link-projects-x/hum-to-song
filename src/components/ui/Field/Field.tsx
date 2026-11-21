import type { ReactNode } from 'react';

import styles from './Field.module.scss';

type TFieldProps = {
  id: string;
  label: string;
  aside?: ReactNode;
  hint?: string;
  error?: string | null;
  children: ReactNode;
};

export function Field({ id, label, aside, hint, error, children }: TFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.top}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-message`} className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-message`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
