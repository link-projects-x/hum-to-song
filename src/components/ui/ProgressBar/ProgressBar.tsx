import styles from './ProgressBar.module.scss';

type TProgressBarProps = {
  value: number;
  label: string;
};

export function ProgressBar({ value, label }: TProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return <progress className={styles.bar} aria-label={label} max={100} value={percent} />;
}
