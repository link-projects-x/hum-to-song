import { cx } from '../cx';
import styles from './SegmentedControl.module.scss';

type TOption<TValue extends string> = {
  value: TValue;
  label: string;
};

type TSegmentedControlProps<TValue extends string> = {
  label: string;
  options: TOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  disabled?: boolean;
};

export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: TSegmentedControlProps<TValue>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cx(styles.option, option.value === value && styles.active)}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
