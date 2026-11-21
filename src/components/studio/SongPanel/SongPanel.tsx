import { Panel } from '@/components/ui';
import type { TExportKind } from '@/hooks/useExport';
import type { TSongSettings } from '@/lib/song/build';
import type { TSong, TTrackId } from '@/types/song';
import type { TContour } from '@/types/transcription';

import styles from './SongPanel.module.scss';
import { ExportBar } from '../ExportBar/ExportBar';
import { NoteList } from '../NoteList/NoteList';
import { PianoRoll } from '../PianoRoll/PianoRoll';
import { SongControls } from '../SongControls/SongControls';
import { SongSummary } from '../SongSummary/SongSummary';
import { Transport } from '../Transport/Transport';

type TSongPanelProps = {
  song: TSong;
  contour: TContour;
  settings: TSongSettings;
  editableBpm: boolean;
  playing: boolean;
  loadingSounds: boolean;
  playerMessage: string | null;
  tracks: Record<TTrackId, boolean>;
  exportBusy: TExportKind | null;
  exportError: string | null;
  beat: () => number;
  onBpm: (bpm: number) => void;
  onSettings: (patch: Partial<TSongSettings>) => void;
  onToggle: () => void;
  onTrack: (track: TTrackId, on: boolean) => void;
  onExport: (kind: TExportKind) => void;
};

export function SongPanel(props: TSongPanelProps) {
  const { song } = props;
  return (
    <Panel title="Your song" titleId="song-title" className={styles.panel}>
      <SongSummary song={song} editableBpm={props.editableBpm} onBpm={props.onBpm} />
      <PianoRoll song={song} contour={props.contour} playing={props.playing} beat={props.beat} />
      <NoteList song={song} />
      <SongControls
        settings={props.settings}
        alternatives={song.progressions.length}
        onChange={props.onSettings}
      />
      <Transport
        playing={props.playing}
        loading={props.loadingSounds}
        tracks={props.tracks}
        message={props.playerMessage}
        onToggle={props.onToggle}
        onTrack={props.onTrack}
      />
      <ExportBar busy={props.exportBusy} error={props.exportError} onExport={props.onExport} />
    </Panel>
  );
}
