# Hum to Song

A web app that turns a hummed melody into a short song. A small neural network in the browser finds the notes; the app then detects the key, writes chords, bass and drums in one of three styles, plays the result alongside the original hum and exports MIDI and WAV.

Everything runs in the browser. Audio is not uploaded anywhere.

Demo: not deployed yet.

## How it works

```
mic (count-in, 4 or 8 bars) │ voice memo (up to 60 s) │ built-in example
  ─► mono audio at 22,050 Hz                                      src/lib/audio
  ─► Basic Pitch in a Web Worker (TensorFlow.js, WebGL or CPU)     src/workers, src/lib/transcribe
  ─► note, onset and pitch-contour activations ─► notes in seconds
  ─► grid: the recording tempo, or tempo and downbeat from onsets  src/lib/song/grid.ts
  ─► notes on a 1/8 or 1/16 grid ─► key ─► snap to key ─► chords   src/lib/music
  ─► style patterns: melody, chords, bass, drums                   src/lib/arrange
  ─► Tone.js playback, with the original hum as its own track      src/lib/playback
  ─► song MIDI, melody MIDI, WAV                                   src/lib/midi, src/lib/playback/render.ts
```

1. Input. Recording uses `getUserMedia` with echo cancellation, noise suppression and auto gain off, a separate `AudioContext` and an `AudioWorklet` that copies raw samples. One bar of clicks plays first; recording then runs for the chosen number of bars plus the measured audio latency and a 0.3 s tail, and the latency becomes the grid offset. Uploads and examples are decoded with an `OfflineAudioContext` at 22,050 Hz. Uploads are limited to 60 seconds and 30 MB.
2. Note finder. The worker is created on first use. It downloads `model.json` and the weights from `public/model/basic-pitch/` with byte progress, loads the graph from memory, runs one second of silence to compile the WebGL kernels, then runs Basic Pitch in 2-second windows.
3. Notes. For every model frame (11.6 ms) the strongest semitone between MIDI 36 and 84 is taken from the note activations. A frame counts as voiced when that activation is at least 0.15 and the frame energy is above the gate. The fine pitch comes from the contour output (3 bins per semitone) with parabolic peak interpolation. The contour peak sits one bin, a third of a semitone, above the bin that the Basic Pitch JS code assigns to a pitch; this offset was measured on the synthetic hums and is corrected in `src/lib/transcribe/frames.ts`. A global tuning offset (circular mean of the deviation from the nearest semitone) is removed before snapping to semitones.
4. Clean-up. Runs of one semitone become notes. Gaps of up to 3 frames inside a run are bridged. A run splits at an onset activation peak of 0.8 or more, or at an energy dip of 6 dB or more, which separates repeated notes. Notes shorter than 130 ms join a neighbour within 30 ms and 2 semitones (a scoop into the next note, or the end of the previous one) or are dropped. A note's pitch is the median of the contour over its middle 60 %. The line stays monophonic.
5. Silence gate. Energy is measured over 25 ms windows. The gate is the lower of the 3rd-percentile energy plus 10 dB and the 95th percentile minus 25 dB, never below −60 dBFS. A take with fewer than 3 notes or less than 1 second of notes is reported as "no tune".
6. Grid. Recordings and examples have a known tempo and downbeat. For uploads, tempo candidates from 70 to 140 BPM are scored by how close the onsets fall to an eighth-note grid (Gaussian, σ = 35 ms, on-beat 1, off-beat 0.5) at the best of 48 phases, minus the score expected by chance, with a mild prior around 105 BPM; the winner is refined by a least-squares fit. The downbeat is the beat of the bar that maximises duration-weighted metric weight (beats 1–4: 1, 0.25, 0.5, 0.25; off-beats 0.1), plus 0.1 when the first note lands on it. The BPM field accepts 40–240 and has ½× and 2× buttons.
7. Quantising. Onsets round to the nearest grid step. When two notes land on one step, the later one moves to the next step if it lasts past it; otherwise the longer note stays. Note ends round to the grid, stretch to the next onset when the gap is shorter than a step, and last at least one step.
8. Key. Krumhansl–Schmuckler: the pitch-class profile (note duration times beat weight) is correlated with the major and minor profiles in all 24 rotations. The profiles are Temperley's, not Krumhansl–Kessler's (see Accuracy). Snap to key, on by default, moves out-of-key notes to the nearest scale tone (major, or natural minor plus the raised seventh), on the side the sung pitch leans to.
9. Chords. A Viterbi search runs over half bars. States are the diatonic triads, plus V and V7 in minor. A note scores overlap × beat weight × fit (root 1, third or fifth 0.9, seventh 0.7, other −0.8). Moves come from a table of common progressions (V→I, ii→V, IV→V, vi→IV and so on); staying on a chord costs 1, changing inside a bar costs another 0.8, and the tonic gets a bonus at the start (0.8) and the end (1). The search keeps the 8 best paths per state; Try other chords steps through them.
10. Styles. Dance: kick on every beat, clap on 2 and 4, open hats on the off-beats with quiet closed hats between, bass on the off-beat eighths, sustained saw-pad chords, a filtered-saw pluck doubling the melody. Lo-fi: eighth-note hats swung to 0.62 of a beat, soft kick and snare, electric-piano chords with sevenths, warm triangle bass. Ballad: piano chords broken into eighths, soft kick, rim clicks on 2 and 4, quiet hats, sine bass, piano lead. The lead can be changed; the melody moves by whole octaves into the lead's range.
11. Playback and export. The Tone.js transport loops the song, and every track has its own gain for the on/off toggles. The "Your hum" track plays the original recording from the grid offset, so its first beat lines up with the song. It is off by default. Song MIDI is format 1: a tempo track, then melody, chords, bass, and drums on channel 10. Melody MIDI is format 0 with one track. The WAV is rendered with `Tone.Offline` at 44.1 kHz, 16-bit stereo, with the current track toggles and a 2-second tail, and its peak is scaled down to −1 dBFS when it goes above.

## Accuracy

Measured with synthetic hums from `scripts/hum.ts` (vibrato, drift, scoops, portamento, timing jitter, breaths, nasal "mmm" timbre, noise floor, two registers, 80–130 BPM) on 12 public-domain melodies. There are four sets of 36 hums: tune and test (different seeds), and copies of both with reverb, pink noise at −50 to −40 dBFS, a 110 Hz high-pass and an AAC or MP3 64 kbps or Opus 32 kbps round trip. Thresholds were tuned on the two tune sets. The table shows the held-out test sets, before tuning and after.

| Metric (test set / degraded test set)                         | Before      | After       |
| ------------------------------------------------------------- | ----------- | ----------- |
| Note F1, raw onsets within 70 ms, exact semitone              | 63.7 / 54.6 | 99.1 / 84.2 |
| Note F1 after quantising and snap to key, onset within 1 step | 68.9 / 64.6 | 97.8 / 88.5 |
| Same, exact grid position                                     | 62.2 / 52.0 | 97.7 / 84.8 |
| Key, tonic and mode                                           | 58.3 / 52.8 | 91.7 / 91.7 |
| Upload tempo within 4 %                                       | 97.2 / 80.6 | 100 / 97.2  |
| Upload downbeat                                               | 52.8 / 47.2 | 91.7 / 77.8 |
| Chord fit: strong-beat melody notes that are chord tones      | 87.5 / 85.3 | 92.3 / 92.2 |

- Before: the first guesses for the note thresholds, Krumhansl–Kessler key profiles, downbeat by metric weight only, chord stay cost 0.4 and mid-bar cost 1.2. Before the contour offset was corrected, note F1 on the tune set was 53.6.
- Krumhansl–Kessler profiles gave 69.4 % / 58.3 % key accuracy on the clean tune and test sets, Temperley's profiles 83.3 % / 86.1 % with duration weights and 86.1 % / 91.7 % with duration times beat weight.
- Snap to key lowers note F1 on the test set from 99.1 to 97.8. All of the drop comes from the chromatic notes of In the Hall of the Mountain King. The synthetic voice drifts by at most 37.5 cents plus vibrato, so it leaves little for snapping to fix.
- A DSP pitch tracker (`pitchy`, McLeod method) with the same clean-up matched Basic Pitch on clean hums (raw note F1 99.2 against 99.1) and did much worse on the degraded set (65.4 against 84.2), so the app uses Basic Pitch alone.
- The sweeps ran Basic Pitch in Node with the TensorFlow.js CPU backend. The production build in Chrome (WebGL backend in the worker) produced the same key, tempo, notes and chords on 12 of 12 files checked.
- The synthetic voice is cleaner than real humming, so treat these numbers as an upper bound.

Model download: `model.json` 174,537 bytes and weights 742,392 bytes (434 KB gzipped). The worker script with TensorFlow.js is 1,142,786 bytes (282 KB gzipped). On the production build with a cold cache in headless Chrome, the note finder was ready 0.48 s after the first upload on localhost, 2.6 s at 10 Mbit/s with 40 ms latency and 7.5 s at 3 Mbit/s with 150 ms latency (uncompressed files). Finding the notes of a 21-second hum took 0.53 s with WebGL.

## Stack

- Next.js 16 (App Router, static export), React 19, TypeScript in strict mode
- SCSS modules with design tokens in CSS custom properties
- Basic Pitch (`@spotify/basic-pitch`) on TensorFlow.js 4 in a Web Worker
- Tone.js for synthesis, sampled piano, transport and offline rendering
- Canvas 2D, Web Audio API, `AudioWorklet`
- Vitest, ESLint, Prettier, Husky and lint-staged

## Getting started

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:4900. No environment variables are needed. The microphone needs a secure context, so open the app on localhost or over HTTPS.

`npm run build` writes a static site to `out/`. `npm start` serves it on http://localhost:4901 with Python's built-in server.

## Scripts

| Script               | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Development server on port 4900                       |
| `npm run build`      | Static export to `out/`                               |
| `npm start`          | Serves `out/` on port 4901 (`python3 -m http.server`) |
| `npm run lint`       | ESLint on `src` and `scripts`, zero warnings allowed  |
| `npm run lint:fix`   | ESLint with autofix                                   |
| `npm run type-check` | TypeScript check without emitting                     |
| `npm test`           | Unit tests (Vitest)                                   |
| `npm run format`     | Prettier over the whole project                       |
| `npm run hum`        | Renders a synthetic hum to WAV, see below             |
| `npm run examples`   | Renders the three example hums into `public/examples` |

```bash
npm run hum -- --list
npm run hum -- --melody=korobeiniki --bpm=112 --bars=8 --register=low --seed=4 --truth --out=hums/k.wav
```

`--register` is `low` (around A2–A3) or `high` (around A3–A4). `--truth` also writes a JSON file with the score, the sung timings, the key and the voice settings.

## Project structure

```
public/
  examples/           three synthetic example hums (22,050 Hz WAV)
  model/basic-pitch/  Basic Pitch model (TensorFlow.js graph model)
  samples/piano/      Salamander Grand Piano notes, A2 to C6
scripts/
  hum.ts              renders one synthetic hum
  make-examples.ts    renders the example hums
  lib/                melody library, hum synthesizer, seeded random
src/
  app/                layout and the single page
  components/
    common/           header and footer
    studio/           input tabs, status line, piano roll, controls, transport, export
    ui/               button, field, panel, segmented control, select, toggle, progress bar
  constants/          audio settings, examples, styles and General MIDI numbers
  hooks/              useStudio (state), useNoteFinder (worker), useRecorder, usePlayer, useExport
  lib/
    audio/            decoding, energy, recorder, WAV codec
    transcribe/       model loading and inference, frame timing, note decoding
    music/            key, scale, chords, tempo, meter, quantising, names
    song/             song building, grid estimate, status texts
    arrange/          style patterns and chord voicing
    playback/         Tone.js voices, scheduling, player, offline render, piano samples
    midi/             MIDI writer, parser and song export
    render/           piano-roll drawing
  styles/             tokens, typography, breakpoints, global styles
  types/              shared types
  workers/            note finder worker
```

## Credits

- Note transcription: [Basic Pitch](https://github.com/spotify/basic-pitch-ts) by Spotify, Apache License 2.0. The model files in `public/model/basic-pitch` come unchanged from the `@spotify/basic-pitch` npm package. See `NOTICE`.
- Piano: [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, CC BY 3.0, via the [Tone.js sample set](https://github.com/Tonejs/audio). 14 notes from A2 to C6, shortened and encoded to MP3. See `NOTICE`.
- Libraries: [TensorFlow.js](https://www.tensorflow.org/js) (Apache 2.0), [Tone.js](https://tonejs.github.io) (MIT), [Next.js](https://nextjs.org) (MIT), [React](https://react.dev) (MIT).
- Font: Inter from Google Fonts, SIL Open Font License.
- Melodies: public-domain tunes, note lists written for this project. The example hums are synthesized; no recorded voice is included.

## License

[MIT](LICENSE). Third-party files keep their own licenses, listed in `NOTICE`.
