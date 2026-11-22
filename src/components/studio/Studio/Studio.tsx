'use client';

import { useMemo, useState } from 'react';

import { Footer } from '@/components/common/Footer/Footer';
import { Header } from '@/components/common/Header/Header';
import { Panel, SegmentedControl } from '@/components/ui';
import { EXAMPLES } from '@/constants/examples';
import { useExport } from '@/hooks/useExport';
import { usePlayer } from '@/hooks/usePlayer';
import { useRecorder } from '@/hooks/useRecorder';
import { useStudio } from '@/hooks/useStudio';
import { loadExampleTake, readUploadTake } from '@/lib/audio/takes';
import { statusView } from '@/lib/song/status';
import { MODEL_RATE } from '@/lib/transcribe/frames';
import type { TTake } from '@/types/take';

import styles from './Studio.module.scss';
import { ExampleTab } from '../ExampleTab/ExampleTab';
import { RecordTab } from '../RecordTab/RecordTab';
import { SongPanel } from '../SongPanel/SongPanel';
import { StatusLine } from '../StatusLine/StatusLine';
import { UploadTab } from '../UploadTab/UploadTab';

type TInputMode = 'record' | 'upload' | 'example';

const MODES: { value: TInputMode; label: string }[] = [
  { value: 'record', label: 'Record' },
  { value: 'upload', label: 'Upload' },
  { value: 'example', label: 'Examples' },
];

export function Studio() {
  const studio = useStudio();
  const recorder = useRecorder();
  const [mode, setMode] = useState<TInputMode>('record');
  const [bpm, setBpm] = useState(100);
  const [bars, setBars] = useState(4);

  const hum = useMemo(
    () =>
      studio.take && studio.grid
        ? { samples: studio.take.samples, rate: MODEL_RATE, offset: studio.grid.offset }
        : null,
    [studio.take, studio.grid]
  );
  const player = usePlayer(studio.song?.arrangement ?? null, hum);
  const exporter = useExport(studio.song, studio.take?.name ?? 'my hum', hum, player.tracks);

  const busy =
    recorder.state.phase !== 'idle' ||
    studio.status.phase === 'opening' ||
    studio.status.phase === 'notes' ||
    studio.status.phase === 'chords';

  const start = (load: () => Promise<TTake>) => {
    player.stop();
    void studio.process(load);
  };

  const choose = (next: TInputMode) => {
    setMode(next);
    if (next !== 'record') studio.prepare();
  };

  const view = statusView(studio.status, studio.noteFinderStatus, recorder.state, bars);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Panel title="Your tune" titleId="tune-title">
          <SegmentedControl<TInputMode>
            label="How to add your tune"
            options={MODES}
            value={mode}
            disabled={busy}
            onChange={choose}
          />
          {mode === 'record' && (
            <RecordTab
              bpm={bpm}
              bars={bars}
              recorder={recorder.state}
              busy={busy}
              onBpm={setBpm}
              onBars={setBars}
              onRecord={() => start(() => recorder.record({ bpm, bars, beatsPerBar: 4 }))}
              onStop={recorder.cancel}
            />
          )}
          {mode === 'upload' && (
            <UploadTab busy={busy} onFile={(file) => start(() => readUploadTake(file))} />
          )}
          {mode === 'example' && (
            <ExampleTab
              examples={EXAMPLES}
              busy={busy}
              onPick={(example) => start(() => loadExampleTake(example))}
            />
          )}
        </Panel>
        <StatusLine view={view} />
        {studio.song && studio.transcription && (
          <SongPanel
            song={studio.song}
            contour={studio.transcription.contour}
            settings={studio.settings}
            editableBpm={studio.take?.source === 'upload'}
            playing={player.playing}
            loadingSounds={player.status === 'loading'}
            playerMessage={player.message}
            tracks={player.tracks}
            exportBusy={exporter.busy}
            exportError={exporter.error}
            beat={player.beat}
            onBpm={studio.setBpm}
            onSettings={studio.update}
            onToggle={() => void player.toggle()}
            onTrack={player.setTrack}
            onExport={(kind) => void exporter.run(kind)}
          />
        )}
        {!studio.song && studio.status.phase === 'idle' && recorder.state.phase === 'idle' && (
          <p className={styles.empty}>Your song shows up here once there is a tune to work with.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
