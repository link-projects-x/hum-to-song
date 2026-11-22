'use client';

import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { Footer } from '@/components/common/Footer/Footer';
import { Header } from '@/components/common/Header/Header';
import { MicIcon, NotesIcon, Panel, SegmentedControl, UploadIcon } from '@/components/ui';
import { EXAMPLES } from '@/constants/examples';
import { TRACKS } from '@/constants/styles';
import { useExport } from '@/hooks/useExport';
import { usePlayer } from '@/hooks/usePlayer';
import { useRecorder } from '@/hooks/useRecorder';
import { useSongLink } from '@/hooks/useSongLink';
import { useStudio } from '@/hooks/useStudio';
import { loadExampleTake, readUploadTake } from '@/lib/audio/takes';
import { BEATS_PER_BAR } from '@/lib/song/grid';
import { liveTake, statusView, studioBusy } from '@/lib/song/status';
import type { TSharedSong } from '@/types/song';
import type { TTake } from '@/types/take';

import styles from './Studio.module.scss';
import { ExampleTab } from '../ExampleTab/ExampleTab';
import { RecordTab } from '../RecordTab/RecordTab';
import { SongPanel } from '../SongPanel/SongPanel';
import { StatusLine } from '../StatusLine/StatusLine';
import { UploadTab } from '../UploadTab/UploadTab';

type TInputMode = 'record' | 'upload' | 'example';

const MODES: { value: TInputMode; label: string; icon: ReactNode }[] = [
  { value: 'record', label: 'Record', icon: <MicIcon /> },
  { value: 'upload', label: 'Upload', icon: <UploadIcon /> },
  { value: 'example', label: 'Examples', icon: <NotesIcon /> },
];

export function Studio() {
  const studio = useStudio();
  const recorder = useRecorder();
  const [mode, setMode] = useState<TInputMode>('record');
  const [bpm, setBpm] = useState(100);
  const [bars, setBars] = useState(4);
  const [fromMic, setFromMic] = useState(false);

  const player = usePlayer(studio.song?.arrangement ?? null, studio.hum);
  const exporter = useExport(studio.song, studio.take?.name ?? 'my hum', studio.hum, player.tracks);
  const { openShared } = studio;
  const { setTrack } = player;
  const open = useCallback(
    (song: TSharedSong) => {
      openShared(song);
      TRACKS.forEach(({ id }) => setTrack(id, song.tracks[id]));
    },
    [openShared, setTrack]
  );
  const link = useSongLink(open);

  const busy = studioBusy(recorder.state, studio.status);
  const live = liveTake(recorder.state, studio.status, recorder.trace, bars, fromMic);

  const start = (load: () => Promise<TTake>, mic = false) => {
    player.stop();
    setFromMic(mic);
    link.forget();
    void studio.process(load);
  };

  const choose = (next: TInputMode) => {
    setMode(next);
    if (next !== 'record') studio.prepare();
  };

  const view = statusView(studio.status, studio.noteFinderStatus, recorder.state, bars);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Header />
        <main className={styles.main}>
          <Panel title="Your tune" titleId="tune-title" className={styles.tune}>
            <SegmentedControl<TInputMode>
              label="How to add your tune"
              size="lg"
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
                onRecord={() =>
                  start(() => recorder.record({ bpm, bars, beatsPerBar: BEATS_PER_BAR }), true)
                }
                onStop={recorder.stop}
              />
            )}
            {mode === 'upload' && (
              <UploadTab busy={busy} onFile={(file) => start(() => readUploadTake(file))} />
            )}
            {mode === 'example' && (
              <ExampleTab
                examples={EXAMPLES}
                current={studio.take?.source === 'example' ? studio.take.name : null}
                busy={busy}
                onPick={(example) => start(() => loadExampleTake(example))}
              />
            )}
            <StatusLine view={view} />
          </Panel>
          <SongPanel
            className={styles.song}
            song={studio.song}
            contour={studio.transcription?.contour ?? null}
            live={live}
            humAvailable={studio.hum !== null}
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
            onShare={() => link.share(studio.shared(player.tracks))}
          />
        </main>
        <Footer />
      </div>
    </div>
  );
}
