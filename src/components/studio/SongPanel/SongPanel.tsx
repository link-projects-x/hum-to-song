import { Panel } from '@/components/ui';
import type { TExportKind } from '@/hooks/useExport';
import type { TSongSettings } from '@/lib/song/build';
import type { TSong, TTrackId } from '@/types/song';
import type { TPitchPoint } from '@/types/take';
import type { TContour } from '@/types/transcription';

import { EmptySong } from '../EmptySong/EmptySong';
import { ExportBar } from '../ExportBar/ExportBar';
import { LiveRoll } from '../LiveRoll/LiveRoll';
import { NoteList } from '../NoteList/NoteList';
import { PianoRoll } from '../PianoRoll/PianoRoll';
import { SongControls } from '../SongControls/SongControls';
import { SongSummary } from '../SongSummary/SongSummary';
import { Transport } from '../Transport/Transport';

export type TLiveTake = { trace: TPitchPoint[]; bars: number; position: number | null };

type TSongPanelProps = {
  song: TSong | null;
  contour: TContour | null;
  live: TLiveTake | null;
  humAvailable: boolean;
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
  onShare: () => Promise<boolean>;
};

export function SongPanel(props: TSongPanelProps) {
  const { song, contour, live } = props;
  const showSong = !live && song && contour;
  return (
    <Panel
      title="Your song"
      titleId="song-title"
      className={props.className}
      actions={
        showSong && <SongSummary song={song} editableBpm={props.editableBpm} onBpm={props.onBpm} />
      }
    >
      {live && <LiveRoll trace={live.trace} bars={live.bars} position={live.position} />}
      {showSong && (
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
            mode={song.key.mode}
            alternatives={song.progressions.length}
            onChange={props.onSettings}
          />
          <Transport
            playing={props.playing}
            loading={props.loadingSounds}
            tracks={props.tracks}
            humAvailable={props.humAvailable}
            message={props.playerMessage}
            onToggle={props.onToggle}
            onTrack={props.onTrack}
          />
          <ExportBar
            busy={props.exportBusy}
            error={props.exportError}
            onExport={props.onExport}
            onShare={props.onShare}
          />
        </>
      )}
      {!live && !showSong && <EmptySong />}
    </Panel>
  );
}
