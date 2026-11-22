import type {
  TNoteFinderStatus,
  TRecorderPhase,
  TRecorderState,
  TStatusView,
  TStudioStatus,
} from '@/types/status';
import type { TLiveTake, TPitchPoint } from '@/types/take';

import { BEATS_PER_BAR } from './grid';

const WORKING: TStudioStatus['phase'][] = ['opening', 'notes', 'chords'];
const TAKING: TRecorderPhase[] = ['countin', 'recording', 'saving'];

export const studioBusy = (recorder: TRecorderState, studio: TStudioStatus) =>
  recorder.phase !== 'idle' || WORKING.includes(studio.phase);

export function liveTake(
  recorder: TRecorderState,
  studio: TStudioStatus,
  trace: TPitchPoint[],
  bars: number,
  fromMic: boolean
): TLiveTake | null {
  const taking = TAKING.includes(recorder.phase);
  if (!taking && !(fromMic && WORKING.includes(studio.phase))) return null;
  const position =
    recorder.phase === 'recording'
      ? Math.min(recorder.progress, 0.999) * bars * BEATS_PER_BAR
      : null;
  return { trace, bars, position };
}

const percent = (fraction: number) => `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;

export function statusView(
  studio: TStudioStatus,
  model: TNoteFinderStatus,
  recorder: TRecorderState,
  bars: number
): TStatusView | null {
  if (recorder.phase === 'asking') {
    return { text: 'Allow the microphone to start.', progress: null, tone: 'live' };
  }
  if (recorder.phase === 'countin') {
    return { text: `Get ready… ${4 - recorder.beat}`, progress: null, tone: 'live' };
  }
  if (recorder.phase === 'recording') {
    return {
      text: `Listening… bar ${recorder.bar + 1} of ${bars}`,
      progress: recorder.progress,
      tone: 'live',
    };
  }
  if (recorder.phase === 'saving')
    return { text: 'Saving your take…', progress: null, tone: 'busy' };
  switch (studio.phase) {
    case 'opening':
      return { text: 'Opening your tune…', progress: null, tone: 'busy' };
    case 'notes':
      if (model.phase === 'downloading') {
        const fraction = model.total > 0 ? model.loaded / model.total : 0;
        return {
          text: `Getting the note finder ready… ${percent(fraction)}`,
          progress: fraction,
          tone: 'busy',
        };
      }
      if (model.phase === 'warming') {
        return { text: 'Starting the note finder…', progress: null, tone: 'busy' };
      }
      return {
        text: `Finding notes… ${percent(studio.fraction)}`,
        progress: studio.fraction,
        tone: 'busy',
      };
    case 'chords':
      return { text: 'Writing chords…', progress: null, tone: 'busy' };
    case 'error':
      return { text: studio.message, progress: null, tone: 'error' };
    default:
      return null;
  }
}
