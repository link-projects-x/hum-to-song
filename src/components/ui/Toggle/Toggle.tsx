import styles from './Toggle.module.scss';

type TToggleProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function Toggle({ label, checked, disabled, onChange }: TToggleProps) {
  return (
    <label className={styles.toggle}>
      <input
        className={styles.input}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.track} aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
