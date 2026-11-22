import { useState } from 'react';

import { Button } from '@/components/ui';
import { keyLabel } from '@/lib/music/describe';
import type { TSong } from '@/types/song';

import styles from './SongSummary.module.scss';

type TSongSummaryProps = {
  song: TSong;
  editableBpm: boolean;
  onBpm: (bpm: number) => void;
};

function BpmEditor({ bpm, onBpm }: { bpm: number; onBpm: (bpm: number) => void }) {
  const [draft, setDraft] = useState(String(bpm));
  const commit = () => {
    const value = Number(draft);
    if (Number.isFinite(value) && value > 0 && value !== bpm) onBpm(value);
    else setDraft(String(bpm));
  };
  return (
    <>
      <input
        className={styles.bpm}
        type="number"
        inputMode="decimal"
        min={40}
        max={240}
        step={0.5}
        aria-label="Tempo in BPM"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
      />
      <span className={styles.unit}>BPM</span>
      <Button
        size="xs"
        variant="ghost"
        className={styles.factor}
        onClick={() => onBpm(bpm / 2)}
        aria-label="Half the tempo"
      >
        ½×
      </Button>
      <Button
        size="xs"
        variant="ghost"
        className={styles.factor}
        onClick={() => onBpm(bpm * 2)}
        aria-label="Double the tempo"
      >
        2×
      </Button>
    </>
  );
}

export function SongSummary({ song, editableBpm, onBpm }: TSongSummaryProps) {
  return (
    <dl className={styles.summary}>
      <div className={styles.item}>
        <dt>Key</dt>
        <dd>{keyLabel(song.key)}</dd>
      </div>
      <div className={styles.item}>
        <dt>Tempo</dt>
        <dd className={styles.tempo}>
          {editableBpm ? (
            <BpmEditor key={song.grid.bpm} bpm={song.grid.bpm} onBpm={onBpm} />
          ) : (
            <span>{song.grid.bpm} BPM</span>
          )}
        </dd>
      </div>
      <div className={styles.item}>
        <dt>Length</dt>
        <dd>
          {song.grid.bars} bars · {song.notes.length} notes
        </dd>
      </div>
    </dl>
  );
}
