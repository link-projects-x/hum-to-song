import { Button } from '@/components/ui';
import type { TExportKind } from '@/hooks/useExport';

import styles from './ExportBar.module.scss';

type TExportBarProps = {
  busy: TExportKind | null;
  error: string | null;
  onExport: (kind: TExportKind) => void;
};

export function ExportBar({ busy, error, onExport }: TExportBarProps) {
  return (
    <div className={styles.export}>
      <span className={styles.label}>Download</span>
      <div className={styles.buttons}>
        <Button size="sm" onClick={() => onExport('song')} disabled={busy !== null}>
          Song MIDI
        </Button>
        <Button size="sm" onClick={() => onExport('melody')} disabled={busy !== null}>
          Melody MIDI
        </Button>
        <Button size="sm" onClick={() => onExport('wav')} disabled={busy !== null}>
          {busy === 'wav' ? 'Making WAV…' : 'WAV'}
        </Button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
