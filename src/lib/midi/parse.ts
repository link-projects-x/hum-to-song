import type { TMidiNote } from '@/types/midi';

export type TParsedMidi = {
  notes: TMidiNote[];
  trackCount: number;
  duration: number;
};

export function parseMidi(buf: ArrayBuffer): TParsedMidi {
  const d = new DataView(buf);
  let p = 0;
  const need = (n: number) => {
    if (p + n > d.byteLength) throw new Error('File ends unexpectedly');
  };
  const str = (n: number) => {
    need(n);
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i));
    p += n;
    return s;
  };
  const u8 = () => (need(1), d.getUint8(p++));
  const u16 = () => {
    need(2);
    const v = d.getUint16(p);
    p += 2;
    return v;
  };
  const u32 = () => {
    need(4);
    const v = d.getUint32(p);
    p += 4;
    return v;
  };
  const vlq = () => {
    let v = 0;
    let b: number;
    let guard = 0;
    do {
      b = u8();
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80 && ++guard < 4);
    return v;
  };

  if (str(4) !== 'MThd') throw new Error('Not a MIDI file (missing MThd header)');
  const headerLen = u32();
  u16();
  const ntrks = u16();
  const division = u16();
  p += headerLen - 6;
  if (division & 0x8000) throw new Error('SMPTE time division is not supported');

  const tempos: { tick: number; uspq: number }[] = [];
  const raw: {
    tick: number;
    endTick: number;
    midi: number;
    vel: number;
    track: number;
    channel: number;
  }[] = [];
  let trackIndex = 0;

  while (trackIndex < ntrks && p + 8 <= d.byteLength) {
    const id = str(4);
    const len = u32();
    const end = Math.min(p + len, d.byteLength);
    if (id !== 'MTrk') {
      p = end;
      continue;
    }
    const t = trackIndex++;
    let tick = 0;
    let status = 0;
    const open = new Map<number, { tick: number; vel: number }[]>();
    while (p < end) {
      tick += vlq();
      const b = u8();
      if (b === 0xff) {
        const type = u8();
        const l = vlq();
        if (type === 0x51 && l === 3) {
          tempos.push({
            tick,
            uspq: (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2),
          });
        }
        p += l;
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        p += vlq();
        continue;
      }
      let d1: number;
      if (b & 0x80) {
        status = b;
        d1 = u8();
      } else {
        if (!status) continue;
        d1 = b;
      }
      const hi = status & 0xf0;
      const ch = status & 0x0f;
      if (hi === 0xc0 || hi === 0xd0) continue;
      const d2 = u8();
      const key = ch * 128 + d1;
      if (hi === 0x90 && d2 > 0) {
        const pending = open.get(key);
        if (pending) pending.push({ tick, vel: d2 });
        else open.set(key, [{ tick, vel: d2 }]);
      } else if (hi === 0x80 || (hi === 0x90 && d2 === 0)) {
        const s = open.get(key)?.shift();
        if (s)
          raw.push({ tick: s.tick, endTick: tick, midi: d1, vel: s.vel, track: t, channel: ch });
      }
    }
    open.forEach((arr, key) =>
      arr.forEach((s) =>
        raw.push({
          tick: s.tick,
          endTick: tick,
          midi: key % 128,
          vel: s.vel,
          track: t,
          channel: Math.floor(key / 128),
        })
      )
    );
    p = end;
  }

  if (!raw.length) throw new Error('No notes found in this file');

  tempos.sort((a, b) => a.tick - b.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, uspq: 500000 });
  const map: { tick: number; sec: number; uspq: number }[] = [];
  for (const tp of tempos) {
    const prev = map[map.length - 1];
    const sec = prev ? prev.sec + ((tp.tick - prev.tick) * prev.uspq) / 1e6 / division : 0;
    map.push({ tick: tp.tick, sec, uspq: tp.uspq });
  }
  const toSec = (tick: number) => {
    let s = map[0];
    for (const q of map) {
      if (q.tick <= tick) s = q;
      else break;
    }
    return s.sec + ((tick - s.tick) * s.uspq) / 1e6 / division;
  };

  const notes = raw
    .map((r) => {
      const time = toSec(r.tick);
      return {
        time,
        dur: Math.max(0.02, toSec(r.endTick) - time),
        midi: r.midi,
        vel: r.vel,
        track: r.track,
        channel: r.channel,
      };
    })
    .sort((a, b) => a.time - b.time || b.midi - a.midi);
  const duration = notes.reduce((m, n) => Math.max(m, n.time + n.dur), 0);
  return { notes, trackCount: trackIndex, duration };
}
