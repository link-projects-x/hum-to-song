export type TMidiPartNote = { midi: number; start: number; beats: number; velocity?: number };

export type TMidiPart = { name: string; channel: number; program?: number; notes: TMidiPartNote[] };

export type TMidiSong = { title: string; bpm: number; ticksPerBeat?: number; parts: TMidiPart[] };

type TEvent = { tick: number; order: number; bytes: number[] };

const ascii = (text: string) => Array.from(text, (ch) => ch.charCodeAt(0) & 0x7f);

function vlq(value: number): number[] {
  let v = Math.max(0, Math.round(value));
  const bytes = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

const u16 = (v: number) => [(v >> 8) & 0xff, v & 0xff];
const u32 = (v: number) => [(v >>> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];

function chunk(events: TEvent[]): number[] {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const body: number[] = [];
  let last = 0;
  for (const event of sorted) {
    body.push(...vlq(event.tick - last), ...event.bytes);
    last = event.tick;
  }
  const end = sorted.length ? sorted[sorted.length - 1].tick : 0;
  body.push(...vlq(Math.max(0, end - last)), 0xff, 0x2f, 0x00);
  return [...ascii('MTrk'), ...u32(body.length), ...body];
}

const meta = (tick: number, type: number, data: number[]): TEvent => ({
  tick,
  order: 0,
  bytes: [0xff, type, ...vlq(data.length), ...data],
});

function conductorEvents(song: TMidiSong): TEvent[] {
  const microsPerBeat = Math.round(60_000_000 / song.bpm);
  return [
    meta(0, 0x03, ascii(song.title)),
    meta(0, 0x51, [
      (microsPerBeat >> 16) & 0xff,
      (microsPerBeat >> 8) & 0xff,
      microsPerBeat & 0xff,
    ]),
    meta(0, 0x58, [4, 2, 24, 8]),
  ];
}

function partEvents(part: TMidiPart, ppq: number, named: boolean): TEvent[] {
  const channel = part.channel & 0x0f;
  const events: TEvent[] = [
    ...(named ? [meta(0, 0x03, ascii(part.name))] : []),
    { tick: 0, order: 1, bytes: [0xc0 | channel, (part.program ?? 0) & 0x7f] },
  ];
  for (const note of part.notes) {
    const on = Math.round(note.start * ppq);
    const off = Math.max(on + 1, Math.round((note.start + note.beats) * ppq));
    const velocity = Math.max(1, Math.min(127, Math.round(note.velocity ?? 90)));
    events.push({ tick: on, order: 3, bytes: [0x90 | channel, note.midi & 0x7f, velocity] });
    events.push({ tick: off, order: 2, bytes: [0x80 | channel, note.midi & 0x7f, 0] });
  }
  return events;
}

export function writeMidi(song: TMidiSong): Uint8Array {
  const ppq = song.ticksPerBeat ?? 480;
  const conductor = chunk(conductorEvents(song));
  const tracks = song.parts.map((part) => chunk(partEvents(part, ppq, true)));
  const header = [...ascii('MThd'), ...u32(6), ...u16(1), ...u16(tracks.length + 1), ...u16(ppq)];
  return Uint8Array.from([...header, ...conductor, ...tracks.flat()]);
}

export function writeSingleTrackMidi(song: TMidiSong): Uint8Array {
  const ppq = song.ticksPerBeat ?? 480;
  const events = [
    ...conductorEvents(song),
    ...song.parts.flatMap((part) => partEvents(part, ppq, false)),
  ];
  const header = [...ascii('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(ppq)];
  return Uint8Array.from([...header, ...chunk(events)]);
}
