import { useState } from 'react';
import type { DragEvent } from 'react';

import { cx } from '@/components/ui';
import { UPLOAD_ACCEPT } from '@/constants/audio';

import styles from './UploadTab.module.scss';

type TUploadTabProps = { busy: boolean; onFile: (file: File) => void };

export function UploadTab({ busy, onFile }: TUploadTabProps) {
  const [over, setOver] = useState(false);
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) onFile(file);
  };
  return (
    <div className={styles.tab}>
      <label
        className={cx(styles.drop, over && styles.over, busy && styles.disabled)}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input
          className={styles.input}
          type="file"
          accept={UPLOAD_ACCEPT}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onFile(file);
          }}
        />
        <span className={styles.button}>Choose a voice memo</span>
        <span className={styles.hint}>
          or drop it here · WAV, MP3, M4A, WebM or OGG, up to 60 seconds
        </span>
      </label>
      <p className={styles.note}>
        The tempo is worked out from your notes. You can change it after.
      </p>
    </div>
  );
}
