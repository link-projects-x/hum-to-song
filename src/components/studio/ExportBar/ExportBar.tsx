import { useEffect, useState } from 'react';

import { Button, CheckIcon, DownloadIcon, LinkIcon, Spinner, cx } from '@/components/ui';
import type { TExportKind } from '@/types/song';

import styles from './ExportBar.module.scss';

type TExportBarProps = {
  busy: TExportKind | null;
  error: string | null;
  onExport: (kind: TExportKind) => void;
  onShare: () => Promise<boolean>;
};

type TShareState = 'idle' | 'copied' | 'failed';

const FILES: { kind: TExportKind; label: string }[] = [
  { kind: 'song', label: 'Song MIDI' },
  { kind: 'melody', label: 'Melody MIDI' },
  { kind: 'wav', label: 'WAV' },
];

export function ExportBar({ busy, error, onExport, onShare }: TExportBarProps) {
  const [share, setShare] = useState<TShareState>('idle');

  useEffect(() => {
    if (share !== 'copied') return;
    const timer = setTimeout(() => setShare('idle'), 2000);
    return () => clearTimeout(timer);
  }, [share]);

  const copy = async () => setShare((await onShare()) ? 'copied' : 'failed');

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
      <Button size="sm" className={styles.share} onClick={() => void copy()}>
        {share === 'copied' ? <CheckIcon /> : <LinkIcon />}
        {share === 'copied' ? 'Link copied' : 'Copy link'}
      </Button>
      {share === 'failed' && (
        <p className={styles.note} role="status">
          Copy the link from the address bar.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
