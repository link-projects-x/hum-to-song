import { Button } from '@/components/ui';
import type { TExample } from '@/constants/examples';

import styles from './ExampleTab.module.scss';

type TExampleTabProps = {
  examples: TExample[];
  busy: boolean;
  onPick: (example: TExample) => void;
};

export function ExampleTab({ examples, busy, onPick }: TExampleTabProps) {
  return (
    <div className={styles.tab}>
      <p className={styles.note}>
        Three hums made by a voice synthesizer from public-domain tunes. No real voice is used.
      </p>
      <div className={styles.list}>
        {examples.map((example) => (
          <Button key={example.id} onClick={() => onPick(example)} disabled={busy}>
            {example.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
