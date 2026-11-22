import type { ReactNode } from 'react';

import { cx } from '../cx';
import styles from './SegmentedControl.module.scss';

type TOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: ReactNode;
};

type TSegmentedControlProps<TValue extends string> = {
  label: string;
  options: TOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  disabled?: boolean;
  size?: 'lg' | 'md';
  mono?: boolean;
  className?: string;
};

export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  size = 'md',
  mono = false,
  className,
}: TSegmentedControlProps<TValue>) {
  return (
    <div
      className={cx(styles.group, styles[size], className)}
      role="radiogroup"
      aria-label={label}
      style={{ '--options': options.length }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cx(
            styles.option,
            mono && styles.mono,
            option.value === value && styles.active
          )}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
