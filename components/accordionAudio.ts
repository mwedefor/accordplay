import { AudioContext } from 'react-native-audio-api';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

// ── Sound file map ────────────────────────────────────────────────────────────
// All samples are real accordion recordings from accordion-samples.zip
// (same source as the web app). playbackRate shifts pitch to the target note.
const SOUND_MODULES: Record<string, any> = {
  // Accordion treble samples (MIDI pitch + 'c' = file name)
  'treble_55': require('../assets/sounds/treble/55c.mp3'),
  'treble_56': require('../assets/sounds/treble/56c.mp3'),
  'treble_58': require('../assets/sounds/treble/58c.mp3'),
  'treble_60': require('../assets/sounds/treble/60c.mp3'),
  'treble_62': require('../assets/sounds/treble/62c.mp3'),
  'treble_63': require('../assets/sounds/treble/63c.mp3'),
  'treble_65': require('../assets/sounds/treble/65c.mp3'),
  'treble_66': require('../assets/sounds/treble/66c.mp3'),
  'treble_67': require('../assets/sounds/treble/67c.mp3'),
  'treble_69': require('../assets/sounds/treble/69c.mp3'),
  'treble_71': require('../assets/sounds/treble/71c.mp3'),
  'treble_72': require('../assets/sounds/treble/72c.mp3'),
  'treble_73': require('../assets/sounds/treble/73c.mp3'),
  'treble_75': require('../assets/sounds/treble/75c.mp3'),
  'treble_77': require('../assets/sounds/treble/77c.mp3'),
  'treble_78': require('../assets/sounds/treble/78c.mp3'),
  'treble_80': require('../assets/sounds/treble/80c.mp3'),
  'treble_82': require('../assets/sounds/treble/82c.mp3'),
  'treble_83': require('../assets/sounds/treble/83c.mp3'),
  'treble_85': require('../assets/sounds/treble/85c.mp3'),
  'treble_87': require('../assets/sounds/treble/87c.mp3'),
  'treble_89': require('../assets/sounds/treble/89c.mp3'),
  'treble_91': require('../assets/sounds/treble/91c.mp3'),
  // Accordion bass samples (MIDI pitch = file number)
  'bass_48': require('../assets/sounds/bass/48.mp3'),
  'bass_50': require('../assets/sounds/bass/50.mp3'),
  'bass_52': require('../assets/sounds/bass/52.mp3'),
  'bass_53': require('../assets/sounds/bass/53.mp3'),
  'bass_55': require('../assets/sounds/bass/55.mp3'),
  'bass_57': require('../assets/sounds/bass/57.mp3'),
  'bass_59': require('../assets/sounds/bass/59.mp3'),
  // Accordion chord samples
  'chord_3':  require('../assets/sounds/chords/3.mp3'),
  'chord_5':  require('../assets/sounds/chords/5.mp3'),
  'chord_9':  require('../assets/sounds/chords/9.mp3'),
  'chord_15': require('../assets/sounds/chords/15.mp3'),
  'chord_22': require('../assets/sounds/chords/22.mp3'),
  'chord_24': require('../assets/sounds/chords/24.mp3'),
  'chord_26': require('../assets/sounds/chords/26.mp3'),
  'chord_35': require('../assets/sounds/chords/35.mp3'),
  'chord_41': require('../assets/sounds/chords/41.mp3'),
};

// ── Treble key map (identical to web app's TREBLE_KEY_MAP) ────────────────────
// Format: [sampleKey, sampleMidi, targetMidi]
// playbackRate = 2^((targetMidi − sampleMidi) / 12)
type TrebleEntry = [string, number, number];
const TREBLE_KEY_MAP: Record<string, TrebleEntry> = {
  // Opening bellows — Left row (aab*)
  aab0:  ['treble_63', 63,  63],  aab2:  ['treble_56', 56,  57],  aab3:  ['treble_60', 60,  60],
  aab4:  ['treble_63', 63,  64],  aab5:  ['treble_66', 66,  66],  aab8:  ['treble_69', 69,  69],
  aab12: ['treble_72', 72,  72],  aab16: ['treble_75', 75,  76],  aab20: ['treble_78', 78,  78],
  aab18: ['treble_80', 80,  81],
  // Opening bellows — Center row (aam*)
  aam0:  ['treble_67', 67,  68],  aam01: ['treble_58', 58,  59],  aam2:  ['treble_62', 62,  62],
  aam3:  ['treble_65', 65,  65],  aam4:  ['treble_69', 69,  69],  aam5:  ['treble_71', 71,  71],
  aam8:  ['treble_73', 73,  74],  aam12: ['treble_77', 77,  77],  aam16: ['treble_80', 80,  81],
  aam20: ['treble_83', 83,  83],  aam18: ['treble_85', 85,  86],
  // Opening bellows — Right row (aaa*)
  aaa0:  ['treble_73', 73,  73],  aaa01: ['treble_63', 63,  64],  aaa2:  ['treble_67', 67,  67],
  aaa3:  ['treble_69', 69,  70],  aaa4:  ['treble_73', 73,  74],  aaa5:  ['treble_75', 75,  76],
  aaa8:  ['treble_78', 78,  79],  aaa12: ['treble_82', 82,  82],  aaa16: ['treble_85', 85,  86],
  aaa20: ['treble_87', 87,  88],
  // Closing bellows — Left row (acb*)
  acb0:  ['treble_60', 60,  61],  acb2:  ['treble_55', 55,  55],  acb3:  ['treble_58', 58,  59],
  acb4:  ['treble_62', 62,  62],  acb8:  ['treble_67', 67,  67],  acb12: ['treble_71', 71,  71],
  acb16: ['treble_73', 73,  74],  acb18: ['treble_78', 78,  79],  acb27: ['treble_83', 83,  83],
  acb36: ['treble_85', 85,  86],
  // Closing bellows — Center row (acm*)
  acm0:  ['treble_66', 66,  66],  acm01: ['treble_55', 55,  55],  acm2:  ['treble_60', 60,  60],
  acm3:  ['treble_63', 63,  64],  acm4:  ['treble_67', 67,  67],  acm8:  ['treble_72', 72,  72],
  acm12: ['treble_75', 75,  76],  acm16: ['treble_78', 78,  79],  acm18: ['treble_83', 83,  84],
  acm27: ['treble_87', 87,  88],  acm36: ['treble_91', 91,  91],
  // Closing bellows — Right row (aca*)
  aca0:  ['treble_75', 75,  75],  aca01: ['treble_60', 60,  60],  aca2:  ['treble_65', 65,  65],
  aca3:  ['treble_69', 69,  69],  aca4:  ['treble_72', 72,  72],  aca8:  ['treble_77', 77,  77],
  aca12: ['treble_80', 80,  81],  aca16: ['treble_83', 83,  84],  aca18: ['treble_89', 89,  89],
  aca27: ['treble_91', 91,  93],
};

// Maps a bass note name to its accordion sample key and playback rate.
const BASS_SAMPLE_MAP: Record<string, { sampleKey: string; rate: number }> = {
  'C3':  { sampleKey: 'bass_48', rate: 1 },
  'D3':  { sampleKey: 'bass_50', rate: 1 },
  'E3':  { sampleKey: 'bass_52', rate: 1 },
  'F3':  { sampleKey: 'bass_53', rate: 1 },
  'G3':  { sampleKey: 'bass_55', rate: 1 },
  'A3':  { sampleKey: 'bass_57', rate: 1 },
  'Bb3': { sampleKey: 'bass_59', rate: Math.pow(2, -1 / 12) },
};

// ── Audio engine state ────────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
const _buffers: Record<string, any> = {};
let audioReady = false;

// Each entry tracks the source node and the audio-clock time it is guaranteed to be done.
// onEnded may not fire reliably on all Android versions, so we also sweep by endTimeSec.
type SourceEntry = { source: any; endTimeSec: number };
let _allSources: SourceEntry[] = [];

function _getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

// Removes sources whose scheduled end time has passed and disconnects them.
// Call periodically (e.g. every scheduler tick) to prevent accumulation.
export function sweepEndedSources(): void {
  const now = _getCtx().currentTime;
  _allSources = _allSources.filter(({ source, endTimeSec }) => {
    if (endTimeSec > now) return true;
    try { source.disconnect(); } catch {}
    return false;
  });
}

function _playAt(sampleKey: string, startTime: number, durationSec?: number, rate = 1): any | null {
  const ctx    = _getCtx();
  const buffer = _buffers[sampleKey];
  if (!buffer) return null;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  if (rate !== 1) source.playbackRate.value = rate;
  source.connect(ctx.destination);

  try {
    if (durationSec !== undefined && durationSec > 0) {
      source.start(startTime, 0, durationSec);
    } else {
      source.start(startTime);
    }
  } catch (e) {
    console.warn(`[audio] start failed sampleKey=${sampleKey}`, e);
    return null;
  }

  // endTimeSec: add 200ms buffer so a slightly late onEnded never leaves a dangling entry.
  const endTimeSec = startTime + (durationSec ?? 0) + 0.2;
  const entry: SourceEntry = { source, endTimeSec };
  _allSources.push(entry);
  source.onEnded = () => {
    const idx = _allSources.indexOf(entry);
    if (idx >= 0) { _allSources.splice(idx, 1); try { source.disconnect(); } catch {} }
  };

  return source;
}

function _play(sampleKey: string, durationSec?: number, rate = 1): any | null {
  return _playAt(sampleKey, _getCtx().currentTime, durationSec, rate);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initAudio(): Promise<void> {
  if (audioReady) return;

  const ctx = _getCtx();
  if (ctx.state === 'suspended') await ctx.resume();

  await Promise.all(
    Object.entries(SOUND_MODULES).map(async ([key, mod]) => {
      try {
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        const uri      = asset.localUri ?? asset.uri;
        const response = await fetch(uri);
        const ab       = await response.arrayBuffer();
        _buffers[key]  = await ctx.decodeAudioData(ab);
      } catch (e) {
        console.warn(`[audio] failed to decode ${key}`, e);
      }
    })
  );

  audioReady = true;
}

export function getAudioCurrentTime(): number {
  return _getCtx().currentTime;
}

export function getAudioOutputLatencyMs(): number {
  const ctx = _getCtx() as any;
  const reported = ((ctx.outputLatency ?? 0) + (ctx.baseLatency ?? 0)) * 1000;
  if (reported > 5) return reported;
  return Platform.OS === 'android' ? 50 : 20;
}

// Returns true if the given accordion key is a valid treble key.
export function isTrebleKey(key: string): boolean {
  return key in TREBLE_KEY_MAP;
}

// Manual treble button press (immediate, fire-and-forget).
export function playTrebleKey(key: string): void {
  const entry = TREBLE_KEY_MAP[key];
  if (!entry) return;
  const [sampleKey, pc, midi] = entry;
  _play(sampleKey, undefined, Math.pow(2, (midi - pc) / 12));
}

// Manual bass note button press (immediate, fire-and-forget).
export function playNote(note: string): void {
  const bass = BASS_SAMPLE_MAP[note];
  if (bass) { _play(bass.sampleKey, undefined, bass.rate); return; }
  _play(note);
}

// Manual chord button press.
export function playChordSample(chordFile: string): void {
  _play(`chord_${chordFile}`);
}

// ── Lookahead scheduling API ──────────────────────────────────────────────────

// No-op — treble notes have an exact durationSec; they stop on their own.
export function stopActiveTreble(): void {}

// Pre-schedules a treble key at startTimeSec on the audio clock with an exact durationSec.
// The audio engine handles timing independently of the JS thread.
export function scheduleTrebleAt(key: string, startTimeSec: number, durationSec: number): void {
  const entry = TREBLE_KEY_MAP[key];
  if (!entry) return;
  const [sampleKey, pc, midi] = entry;
  _playAt(sampleKey, startTimeSec, durationSec, Math.pow(2, (midi - pc) / 12));
}

// note = bass note name ('G3', 'D3', etc.)
export function scheduleBassAt(note: string, startTimeSec: number, durationSec: number): void {
  const sample = BASS_SAMPLE_MAP[note];
  if (sample) {
    _playAt(sample.sampleKey, startTimeSec, durationSec, sample.rate);
    return;
  }
  _playAt(note, startTimeSec, durationSec);
}

// chordFile = chord sample number string ('35', '9', etc.)
export function scheduleChordAt(chordFile: string, startTimeSec: number, durationSec: number): void {
  _playAt(`chord_${chordFile}`, startTimeSec, durationSec);
}

export function cancelAllScheduled(): void {
  for (const { source } of _allSources) {
    try { source.stop(0); } catch {}
    try { source.disconnect(); } catch {}
  }
  _allSources = [];
}

// ── Legacy helpers (kept for compatibility) ───────────────────────────────────
// (stopActiveTreble is now real — exported above)
export function playTrebleNote(note: string, durationMs?: number): void {}
export function stopActiveBassNote(): void {}
export function stopActiveChord(): void {}
export function playBassNote(note: string): void   { playNote(note); }
export function playChordNote(note: string): void  {}
export function startBassNote(note: string, durationMs?: number): void { playNote(note); }
export function startChordNote(note: string, durationMs?: number): void {}
