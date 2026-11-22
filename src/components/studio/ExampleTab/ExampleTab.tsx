import { ChevronIcon, WaveIcon, cx } from '@/components/ui';
import type { TExample } from '@/constants/examples';

import styles from './ExampleTab.module.scss';

type TExampleTabProps = {
  examples: TExample[];
  current: string | null;
  busy: boolean;
  onPick: (example: TExample) => void;
};

export function ExampleTab({ examples, current, busy, onPick }: TExampleTabProps) {
  return (
    <div className={styles.tab}>
      <p className={styles.note}>
        Three hums made by a voice synthesizer from public-domain tunes. No real voice is used.
      </p>
      <div className={styles.list}>
        {examples.map((example) => (
          <button
            key={example.id}
            type="button"
            className={cx(styles.example, example.title === current && styles.current)}
            onClick={() => onPick(example)}
            disabled={busy}
            aria-current={example.title === current ? 'true' : undefined}
          >
            <span className={styles.wave}>
              <WaveIcon />
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{example.title}</span>
              <span className={styles.meta}>
                {example.credit} · {example.bars} bars
              </span>
            </span>
            <span className={styles.chevron}>
              <ChevronIcon />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
