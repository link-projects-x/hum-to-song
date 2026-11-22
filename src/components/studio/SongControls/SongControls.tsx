import { Button, Field, SegmentedControl, Select, ShuffleIcon, Toggle } from '@/components/ui';
import { LEAD_OPTIONS, STYLE_OPTIONS } from '@/constants/styles';
import type { TGridStep, TMode } from '@/types/music';
import type { TLeadId, TSongSettings, TStyleId } from '@/types/song';

import styles from './SongControls.module.scss';

type TStep = '0.5' | '0.25';

type TSongControlsProps = {
  settings: TSongSettings;
  mode: TMode;
  alternatives: number;
  onChange: (patch: Partial<TSongSettings>) => void;
};

const MOOD_OPTIONS: { value: TMode; label: string }[] = [
  { value: 'major', label: 'Happy' },
  { value: 'minor', label: 'Sad' },
];

const STEP_OPTIONS: { value: TStep; label: string }[] = [
  { value: '0.5', label: '1/8' },
  { value: '0.25', label: '1/16' },
];

export function SongControls({ settings, mode, alternatives, onChange }: TSongControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.group}>
        <span className={styles.label}>Mood</span>
        <SegmentedControl<TMode>
          label="Mood"
          className={styles.mood}
          options={MOOD_OPTIONS}
          value={mode}
          onChange={(next) => onChange({ mode: next })}
        />
      </div>
      <div className={styles.style}>
        <span className={styles.label}>Style</span>
        <SegmentedControl<TStyleId>
          label="Style"
          options={STYLE_OPTIONS}
          value={settings.style}
          onChange={(style) => onChange({ style })}
        />
      </div>
      <Field id="lead-sound" label="Lead">
        <Select
          id="lead-sound"
          value={settings.lead}
          onChange={(event) => onChange({ lead: event.target.value as TLeadId })}
        >
          {LEAD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className={styles.group}>
        <span className={styles.label}>Grid</span>
        <SegmentedControl<TStep>
          label="Grid"
          mono
          className={styles.grid}
          options={STEP_OPTIONS}
          value={settings.step === 0.25 ? '0.25' : '0.5'}
          onChange={(value) => onChange({ step: Number(value) as TGridStep })}
        />
      </div>
      <div className={styles.row}>
        <Toggle
          label="Snap to key"
          checked={settings.snap}
          onChange={(snap) => onChange({ snap })}
        />
        <Button
          variant="ghost"
          size="md"
          disabled={alternatives < 2}
          onClick={() => onChange({ alternative: settings.alternative + 1 })}
        >
          <ShuffleIcon />
          Try other chords
        </Button>
      </div>
    </div>
  );
}
