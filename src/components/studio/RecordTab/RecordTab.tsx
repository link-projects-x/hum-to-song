import { Button, Field, ProgressBar, SegmentedControl } from '@/components/ui';
import type { TRecorderState } from '@/types/status';

import styles from './RecordTab.module.scss';
import { BeatPulse } from '../BeatPulse/BeatPulse';

type TBars = '4' | '8';

type TRecordTabProps = {
  bpm: number;
  bars: number;
  recorder: TRecorderState;
  busy: boolean;
  onBpm: (bpm: number) => void;
  onBars: (bars: number) => void;
  onRecord: () => void;
  onStop: () => void;
};

const BAR_OPTIONS: { value: TBars; label: string }[] = [
  { value: '4', label: '4 bars' },
  { value: '8', label: '8 bars' },
];

export function RecordTab({
  bpm,
  bars,
  recorder,
  busy,
  onBpm,
  onBars,
  onRecord,
  onStop,
}: TRecordTabProps) {
  const active = recorder.phase !== 'idle';
  const live = recorder.phase === 'countin' || recorder.phase === 'recording';
  return (
    <div className={styles.tab}>
      <div className={styles.settings}>
        <Field
          id="record-bpm"
          label="Tempo"
          aside={<span className={styles.value}>{bpm} BPM</span>}
        >
          <input
            id="record-bpm"
            className={styles.slider}
            type="range"
            min={70}
            max={140}
            step={1}
            value={bpm}
            disabled={active || busy}
            onChange={(event) => onBpm(Number(event.target.value))}
          />
        </Field>
        <div className={styles.bars}>
          <span className={styles.label}>Length</span>
          <SegmentedControl<TBars>
            label="Length"
            options={BAR_OPTIONS}
            value={bars === 8 ? '8' : '4'}
            disabled={active || busy}
            onChange={(value) => onBars(Number(value))}
          />
        </div>
      </div>
      <p className={styles.hint}>
        You hear one bar of clicks, then hum. Press Stop when you’re done, or it stops by itself
        after {bars} bars.
      </p>
      <div className={styles.actions}>
        {active ? (
          <Button variant="secondary" size="lg" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={onRecord} disabled={busy}>
            Record
          </Button>
        )}
        {live && (
          <BeatPulse beats={4} active={recorder.beat} counting={recorder.phase === 'countin'} />
        )}
      </div>
      {recorder.phase === 'recording' && (
        <ProgressBar value={recorder.progress} label="Recording progress" />
      )}
    </div>
  );
}
