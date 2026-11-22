import { Button, Field, SegmentedControl } from '@/components/ui';
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
  const locked = recorder.phase !== 'idle' || busy;
  const live = recorder.phase === 'countin' || recorder.phase === 'recording';
  const stoppable = live || recorder.phase === 'asking';
  return (
    <div className={styles.tab}>
      <Field id="record-bpm" label="Tempo" aside={<span className={styles.value}>{bpm} BPM</span>}>
        <input
          id="record-bpm"
          className={styles.slider}
          type="range"
          min={70}
          max={140}
          step={1}
          value={bpm}
          disabled={locked}
          onChange={(event) => onBpm(Number(event.target.value))}
        />
      </Field>
      <div className={styles.length}>
        <span className={styles.label}>Length</span>
        <SegmentedControl<TBars>
          label="Length"
          options={BAR_OPTIONS}
          value={bars === 8 ? '8' : '4'}
          disabled={locked}
          onChange={(value) => onBars(Number(value))}
        />
      </div>
      <p className={styles.hint}>
        You hear one bar of clicks, then hum. Press Stop when you’re done, or it stops by itself
        after {bars} bars.
      </p>
      {stoppable ? (
        <div className={styles.live}>
          <Button variant="secondary" size="xl" className={styles.stop} onClick={onStop}>
            <span className={styles.stopMark} aria-hidden="true" />
            Stop
          </Button>
          {live && (
            <BeatPulse beats={4} active={recorder.beat} counting={recorder.phase === 'countin'} />
          )}
        </div>
      ) : (
        <Button variant="primary" size="xl" block onClick={onRecord} disabled={busy}>
          <span className={styles.recordMark} aria-hidden="true" />
          Record
        </Button>
      )}
    </div>
  );
}
