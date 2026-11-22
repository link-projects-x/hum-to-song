import { Button, DownloadIcon, Spinner, cx } from '@/components/ui';
import type { TExportKind } from '@/hooks/useExport';

import styles from './ExportBar.module.scss';

type TExportBarProps = {
  busy: TExportKind | null;
  error: string | null;
  onExport: (kind: TExportKind) => void;
};

const FILES: { kind: TExportKind; label: string }[] = [
  { kind: 'song', label: 'Song MIDI' },
  { kind: 'melody', label: 'Melody MIDI' },
  { kind: 'wav', label: 'WAV' },
];

export function ExportBar({ busy, error, onExport }: TExportBarProps) {
  return (
    <div className={styles.export}>
      <span className={styles.label}>Download</span>
      {FILES.map((file) => {
        const working = file.kind === 'wav' && busy === 'wav';
        return (
          <Button
            key={file.kind}
            size="sm"
            className={cx(working && styles.working)}
            onClick={() => onExport(file.kind)}
            disabled={busy !== null}
          >
            {working ? <Spinner size={15} /> : <DownloadIcon />}
            {working ? 'Making WAV…' : file.label}
          </Button>
        );
      })}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
