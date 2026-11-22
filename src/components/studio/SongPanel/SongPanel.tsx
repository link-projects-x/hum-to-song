import { Panel } from '@/components/ui';
import type { TExportKind } from '@/hooks/useExport';
import type { TSongSettings } from '@/lib/song/build';
import type { TSong, TTrackId } from '@/types/song';
import type { TContour } from '@/types/transcription';

import { EmptySong } from '../EmptySong/EmptySong';
import { ExportBar } from '../ExportBar/ExportBar';
import { NoteList } from '../NoteList/NoteList';
import { PianoRoll } from '../PianoRoll/PianoRoll';
import { SongControls } from '../SongControls/SongControls';
import { SongSummary } from '../SongSummary/SongSummary';
import { Transport } from '../Transport/Transport';

type TSongPanelProps = {
  song: TSong | null;
  contour: TContour | null;
  className?: string;
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
  const { song, contour } = props;
  return (
    <Panel
      title="Your song"
      titleId="song-title"
      className={props.className}
      actions={
        song && <SongSummary song={song} editableBpm={props.editableBpm} onBpm={props.onBpm} />
      }
    >
      {song && contour ? (
        <>
          <PianoRoll
            song={song}
            contour={contour}
            tracks={props.tracks}
            playing={props.playing}
            beat={props.beat}
          />
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
        </>
      ) : (
        <EmptySong />
      )}
    </Panel>
  );
}
