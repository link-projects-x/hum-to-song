'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { Footer } from '@/components/common/Footer/Footer';
import { Header } from '@/components/common/Header/Header';
import { MicIcon, NotesIcon, Panel, SegmentedControl, UploadIcon } from '@/components/ui';
import { EXAMPLES } from '@/constants/examples';
import { TRACKS } from '@/constants/styles';
import { useExport } from '@/hooks/useExport';
import { usePlayer } from '@/hooks/usePlayer';
import { useRecorder } from '@/hooks/useRecorder';
import { useStudio } from '@/hooks/useStudio';
import { loadExampleTake, readUploadTake } from '@/lib/audio/takes';
import { BEATS_PER_BAR } from '@/lib/song/grid';
import { songFromHash, songLink } from '@/lib/song/share';
import { statusView } from '@/lib/song/status';
import { MODEL_RATE } from '@/lib/transcribe/frames';
import type { TTake } from '@/types/take';

import styles from './Studio.module.scss';
import { ExampleTab } from '../ExampleTab/ExampleTab';
import { RecordTab } from '../RecordTab/RecordTab';
import { SongPanel } from '../SongPanel/SongPanel';
import { StatusLine } from '../StatusLine/StatusLine';
import { UploadTab } from '../UploadTab/UploadTab';

import type { TLiveTake } from '../SongPanel/SongPanel';

type TInputMode = 'record' | 'upload' | 'example';

const SONG_HASH = '#song=';

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
  const { openShared } = studio;

  const hum = useMemo(
    () =>
      studio.take && studio.grid && studio.take.samples.length > 0
        ? { samples: studio.take.samples, rate: MODEL_RATE, offset: studio.grid.offset }
        : null,
    [studio.take, studio.grid]
  );
  const player = usePlayer(studio.song?.arrangement ?? null, hum);
  const exporter = useExport(studio.song, studio.take?.name ?? 'my hum', hum, player.tracks);
  const { setTrack } = player;

  useEffect(() => {
    const shared = songFromHash(window.location.hash);
    if (!shared) return;
    openShared(shared);
    TRACKS.forEach(({ id }) => setTrack(id, shared.tracks[id]));
  }, [openShared, setTrack]);

  const busy =
    recorder.state.phase !== 'idle' ||
    studio.status.phase === 'opening' ||
    studio.status.phase === 'notes' ||
    studio.status.phase === 'chords';

  const start = (load: () => Promise<TTake>, mic = false) => {
    player.stop();
    setFromMic(mic);
    if (window.location.hash.startsWith(SONG_HASH)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    void studio.process(load);
  };

  const share = async () => {
    if (!studio.song || !studio.transcription || !studio.grid) return false;
    const link = songLink(window.location.href, {
      notes: studio.transcription.notes,
      grid: studio.grid,
      settings: { ...studio.settings, alternative: studio.song.progressionIndex },
      tracks: { ...player.tracks, hum: false },
    });
    window.history.replaceState(null, '', link);
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  };

  const recording = ['countin', 'recording', 'saving'].includes(recorder.state.phase);
  const working = ['opening', 'notes', 'chords'].includes(studio.status.phase);
  const live: TLiveTake | null =
    recording || (fromMic && working)
      ? {
          trace: recorder.trace,
          bars,
          position:
            recorder.state.phase === 'recording'
              ? Math.min(recorder.state.progress, 0.999) * bars * BEATS_PER_BAR
              : null,
        }
      : null;

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
            humAvailable={hum !== null}
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
            onShare={share}
          />
        </main>
        <Footer />
      </div>
    </div>
  );
}
