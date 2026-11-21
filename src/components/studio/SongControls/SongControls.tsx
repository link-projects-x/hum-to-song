import { Button, Field, SegmentedControl, Select, Toggle } from '@/components/ui';
import { LEAD_OPTIONS, STYLE_OPTIONS } from '@/constants/styles';
import type { TSongSettings } from '@/lib/song/build';
import type { TGridStep } from '@/types/music';
import type { TLeadId, TStyleId } from '@/types/song';

import styles from './SongControls.module.scss';

type TStep = '0.5' | '0.25';

type TSongControlsProps = {
  settings: TSongSettings;
  alternatives: number;
  onChange: (patch: Partial<TSongSettings>) => void;
};

const STEP_OPTIONS: { value: TStep; label: string }[] = [
  { value: '0.5', label: '1/8' },
  { value: '0.25', label: '1/16' },
];

export function SongControls({ settings, alternatives, onChange }: TSongControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.group}>
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
          size="sm"
          disabled={alternatives < 2}
          onClick={() => onChange({ alternative: settings.alternative + 1 })}
        >
          Try other chords
        </Button>
      </div>
    </div>
  );
}
