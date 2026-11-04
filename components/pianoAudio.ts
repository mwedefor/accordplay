import { AudioContext } from 'react-native-audio-api';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

// ── Piano sample modules ──────────────────────────────────────────────────────
// Real piano recordings copied from web app's public/assets/piano/.
// Coverage: octaves 1–5 (all 12 notes each) + C6.
// Same flat-name convention as web (Bb, Db, Eb, Gb, Ab).
const SOUND_MODULES: Record<string, any> = {
  // Octave 1
  'C1':  require('../assets/sounds/piano/C1.mp3'),
  'Db1': require('../assets/sounds/piano/Db1.mp3'),
  'D1':  require('../assets/sounds/piano/D1.mp3'),
  'Eb1': require('../assets/sounds/piano/Eb1.mp3'),
  'E1':  require('../assets/sounds/piano/E1.mp3'),
  'F1':  require('../assets/sounds/piano/F1.mp3'),
  'Gb1': require('../assets/sounds/piano/Gb1.mp3'),
  'G1':  require('../assets/sounds/piano/G1.mp3'),
  'Ab1': require('../assets/sounds/piano/Ab1.mp3'),
  'A1':  require('../assets/sounds/piano/A1.mp3'),
  'Bb1': require('../assets/sounds/piano/Bb1.mp3'),
  'B1':  require('../assets/sounds/piano/B1.mp3'),
  // Octave 2
  'C2':  require('../assets/sounds/piano/C2.mp3'),
  'Db2': require('../assets/sounds/piano/Db2.mp3'),
  'D2':  require('../assets/sounds/piano/D2.mp3'),
  'Eb2': require('../assets/sounds/piano/Eb2.mp3'),
  'E2':  require('../assets/sounds/piano/E2.mp3'),
  'F2':  require('../assets/sounds/piano/F2.mp3'),
  'Gb2': require('../assets/sounds/piano/Gb2.mp3'),
  'G2':  require('../assets/sounds/piano/G2.mp3'),
  'Ab2': require('../assets/sounds/piano/Ab2.mp3'),
  'A2':  require('../assets/sounds/piano/A2.mp3'),
  'Bb2': require('../assets/sounds/piano/Bb2.mp3'),
  'B2':  require('../assets/sounds/piano/B2.mp3'),
  // Octave 3
  'C3':  require('../assets/sounds/piano/C3.mp3'),
  'Db3': require('../assets/sounds/piano/Db3.mp3'),
  'D3':  require('../assets/sounds/piano/D3.mp3'),
  'Eb3': require('../assets/sounds/piano/Eb3.mp3'),
  'E3':  require('../assets/sounds/piano/E3.mp3'),
  'F3':  require('../assets/sounds/piano/F3.mp3'),
  'Gb3': require('../assets/sounds/piano/Gb3.mp3'),
  'G3':  require('../assets/sounds/piano/G3.mp3'),
  'Ab3': require('../assets/sounds/piano/Ab3.mp3'),
  'A3':  require('../assets/sounds/piano/A3.mp3'),
  'Bb3': require('../assets/sounds/piano/Bb3.mp3'),
  'B3':  require('../assets/sounds/piano/B3.mp3'),
  // Octave 4
  'C4':  require('../assets/sounds/piano/C4.mp3'),
  'Db4': require('../assets/sounds/piano/Db4.mp3'),
  'D4':  require('../assets/sounds/piano/D4.mp3'),
  'Eb4': require('../assets/sounds/piano/Eb4.mp3'),
  'E4':  require('../assets/sounds/piano/E4.mp3'),
  'F4':  require('../assets/sounds/piano/F4.mp3'),
  'Gb4': require('../assets/sounds/piano/Gb4.mp3'),
  'G4':  require('../assets/sounds/piano/G4.mp3'),
  'Ab4': require('../assets/sounds/piano/Ab4.mp3'),
  'A4':  require('../assets/sounds/piano/A4.mp3'),
  'Bb4': require('../assets/sounds/piano/Bb4.mp3'),
  'B4':  require('../assets/sounds/piano/B4.mp3'),
  // Octave 5
  'C5':  require('../assets/sounds/piano/C5.mp3'),
  'Db5': require('../assets/sounds/piano/Db5.mp3'),
  'D5':  require('../assets/sounds/piano/D5.mp3'),
  'Eb5': require('../assets/sounds/piano/Eb5.mp3'),
  'E5':  require('../assets/sounds/piano/E5.mp3'),
  'F5':  require('../assets/sounds/piano/F5.mp3'),
  'Gb5': require('../assets/sounds/piano/Gb5.mp3'),
  'G5':  require('../assets/sounds/piano/G5.mp3'),
  'Ab5': require('../assets/sounds/piano/Ab5.mp3'),
  'A5':  require('../assets/sounds/piano/A5.mp3'),
  'Bb5': require('../assets/sounds/piano/Bb5.mp3'),
  'B5':  require('../assets/sounds/piano/B5.mp3'),
  // C6 — ceiling
  'C6':  require('../assets/sounds/piano/C6.mp3'),
};

// ── Note map: code → [sampleKey, playbackRate] ────────────────────────────────
// Same 1:1 mapping as web's pianoSoundLocationMapper.
// rate = 1 for direct matches; calculated for notes outside octaves 1–5.
// MIDI C4=60. rate = 2^((targetMidi − sampleMidi) / 12)
const r = (target: number, sample: number) => Math.pow(2, (target - sample) / 12);

const PIANO_NOTE_MAP: Record<string, [string, number]> = {
  // ── Octave 0 (pitch down from octave 1) ──────────────────────────────────
  pA0:  ['A1',  r(21,33)],  pBb0: ['Bb1', r(22,34)], pAs0: ['Bb1', r(22,34)],
  pB0:  ['B1',  r(23,35)],
  // ── Octave 1 (direct) ─────────────────────────────────────────────────────
  pC1:  ['C1',  1], pDb1: ['Db1', 1], pCs1: ['Db1', 1],
  pD1:  ['D1',  1], pEb1: ['Eb1', 1], pDs1: ['Eb1', 1],
  pE1:  ['E1',  1], pF1:  ['F1',  1],
  pGb1: ['Gb1', 1], pFs1: ['Gb1', 1],
  pG1:  ['G1',  1], pAb1: ['Ab1', 1], pGs1: ['Ab1', 1],
  pA1:  ['A1',  1], pBb1: ['Bb1', 1], pAs1: ['Bb1', 1],
  pB1:  ['B1',  1],
  // ── Octave 2 (direct) ─────────────────────────────────────────────────────
  pC2:  ['C2',  1], pDb2: ['Db2', 1], pCs2: ['Db2', 1],
  pD2:  ['D2',  1], pEb2: ['Eb2', 1], pDs2: ['Eb2', 1],
  pE2:  ['E2',  1], pF2:  ['F2',  1],
  pGb2: ['Gb2', 1], pFs2: ['Gb2', 1],
  pG2:  ['G2',  1], pAb2: ['Ab2', 1], pGs2: ['Ab2', 1],
  pA2:  ['A2',  1], pBb2: ['Bb2', 1], pAs2: ['Bb2', 1],
  pB2:  ['B2',  1],
  // ── Octave 3 (direct) ─────────────────────────────────────────────────────
  pC3:  ['C3',  1], pDb3: ['Db3', 1], pCs3: ['Db3', 1],
  pD3:  ['D3',  1], pEb3: ['Eb3', 1], pDs3: ['Eb3', 1],
  pE3:  ['E3',  1], pF3:  ['F3',  1],
  pGb3: ['Gb3', 1], pFs3: ['Gb3', 1],
  pG3:  ['G3',  1], pAb3: ['Ab3', 1], pGs3: ['Ab3', 1],
  pA3:  ['A3',  1], pBb3: ['Bb3', 1], pAs3: ['Bb3', 1],
  pB3:  ['B3',  1],
  // ── Octave 4 (direct) ─────────────────────────────────────────────────────
  pC4:  ['C4',  1], pDb4: ['Db4', 1], pCs4: ['Db4', 1],
  pD4:  ['D4',  1], pEb4: ['Eb4', 1], pDs4: ['Eb4', 1],
  pE4:  ['E4',  1], pF4:  ['F4',  1],
  pGb4: ['Gb4', 1], pFs4: ['Gb4', 1],
  pG4:  ['G4',  1], pAb4: ['Ab4', 1], pGs4: ['Ab4', 1],
  pA4:  ['A4',  1], pBb4: ['Bb4', 1], pAs4: ['Bb4', 1],
  pB4:  ['B4',  1],
  // ── Octave 5 (direct) ─────────────────────────────────────────────────────
  pC5:  ['C5',  1], pDb5: ['Db5', 1], pCs5: ['Db5', 1],
  pD5:  ['D5',  1], pEb5: ['Eb5', 1], pDs5: ['Eb5', 1],
  pE5:  ['E5',  1], pF5:  ['F5',  1],
  pGb5: ['Gb5', 1], pFs5: ['Gb5', 1],
  pG5:  ['G5',  1], pAb5: ['Ab5', 1], pGs5: ['Ab5', 1],
  pA5:  ['A5',  1], pBb5: ['Bb5', 1], pAs5: ['Bb5', 1],
  pB5:  ['B5',  1],
  // ── C6 direct + octave 6 shifted ─────────────────────────────────────────
  pC6:  ['C6',  1],
  pDb6: ['C6',  r(85,84)], pCs6: ['C6',  r(85,84)],
  pD6:  ['C6',  r(86,84)], pEb6: ['C6',  r(87,84)], pDs6: ['C6',  r(87,84)],
  pE6:  ['C6',  r(88,84)], pF6:  ['C6',  r(89,84)],
  pGb6: ['C6',  r(90,84)], pFs6: ['C6',  r(90,84)],
  pG6:  ['C6',  r(91,84)], pAb6: ['C6',  r(92,84)], pGs6: ['C6',  r(92,84)],
  pA6:  ['A5',  r(93,81)], pBb6: ['Bb5', r(94,82)], pAs6: ['Bb5', r(94,82)],
  pB6:  ['B5',  r(95,83)],
  // ── Octave 7+ shifted from octave 5–6 ────────────────────────────────────
  pC7:  ['C6',  r(96,84)],  pDb7: ['C6',  r(97,84)],  pCs7: ['C6',  r(97,84)],
  pD7:  ['C6',  r(98,84)],  pEb7: ['C6',  r(99,84)],  pDs7: ['C6',  r(99,84)],
  pE7:  ['C6',  r(100,84)], pF7:  ['C6',  r(101,84)],
  pGb7: ['C6',  r(102,84)], pFs7: ['C6',  r(102,84)],
  pG7:  ['C6',  r(103,84)], pAb7: ['C6',  r(104,84)], pGs7: ['C6',  r(104,84)],
  pA7:  ['A5',  r(105,81)], pBb7: ['Bb5', r(106,82)], pAs7: ['Bb5', r(106,82)],
  pB7:  ['B5',  r(107,83)],
  pC8:  ['C6',  r(108,84)],
  // ── Enharmonic equivalents (same as web) ─────────────────────────────────
  pEs1: ['F1',  1], pFb1: ['E1',  1], pBs1: ['C2',  1], pCb2: ['B1',  1],
  pEs2: ['F2',  1], pFb2: ['E2',  1], pBs2: ['C3',  1], pCb3: ['B2',  1],
  pEs3: ['F3',  1], pFb3: ['E3',  1], pBs3: ['C4',  1], pCb4: ['B3',  1],
  pEs4: ['F4',  1], pFb4: ['E4',  1], pBs4: ['C5',  1], pCb5: ['B4',  1],
  pEs5: ['F5',  1], pFb5: ['E5',  1], pBs5: ['C6',  1], pCb6: ['B5',  1],
};

// ── Audio engine (same pattern as accordionAudio.ts) ─────────────────────────
let _ctx: AudioContext | null = null;
const _buffers: Record<string, any> = {};
let audioReady = false;

type SourceEntry = { source: any; endTimeSec: number };
let _allSources: SourceEntry[] = [];
let _manualSource: { source: any } | null = null;

function _getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

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
  if (Math.abs(rate - 1) > 0.0001) source.playbackRate.value = rate;
  source.connect(ctx.destination);

  try {
    if (durationSec !== undefined && durationSec > 0) {
      source.start(startTime, 0, durationSec);
    } else {
      source.start(startTime);
    }
  } catch (e) {
    console.warn(`[piano] start failed sampleKey=${sampleKey}`, e);
    return null;
  }

  const endTimeSec = startTime + (durationSec ?? 0) + 0.2;
  const entry: SourceEntry = { source, endTimeSec };
  _allSources.push(entry);
  source.onEnded = () => {
    const idx = _allSources.indexOf(entry);
    if (idx >= 0) { _allSources.splice(idx, 1); try { source.disconnect(); } catch {} }
  };
  return source;
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
        console.warn(`[piano] failed to decode ${key}`, e);
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

export function isPianoNote(code: string): boolean {
  return code in PIANO_NOTE_MAP;
}

export function playPianoNote(code: string): void {
  const entry = PIANO_NOTE_MAP[code];
  if (!entry) return;
  _playAt(entry[0], _getCtx().currentTime, undefined, entry[1]);
}

export function playPianoNoteManual(code: string): void {
  stopActivePiano();
  const entry = PIANO_NOTE_MAP[code];
  if (!entry) return;
  const ctx    = _getCtx();
  const buffer = _buffers[entry[0]];
  if (!buffer) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  if (Math.abs(entry[1] - 1) > 0.0001) source.playbackRate.value = entry[1];
  source.connect(ctx.destination);
  try { source.start(ctx.currentTime); } catch (e) {
    console.warn(`[piano] manual start failed code=${code}`, e);
    return;
  }
  _manualSource = { source };
}

export function stopActivePiano(): void {
  if (!_manualSource) return;
  try { _manualSource.source.stop(0); } catch {}
  try { _manualSource.source.disconnect(); } catch {}
  _manualSource = null;
}

export function schedulePianoAt(code: string, startTime: number, durationSec: number): void {
  const entry = PIANO_NOTE_MAP[code];
  if (!entry) return;
  _playAt(entry[0], startTime, durationSec, entry[1]);
}

export function cancelAllScheduled(): void {
  for (const { source } of _allSources) {
    try { source.stop(0); } catch {}
    try { source.disconnect(); } catch {}
  }
  _allSources = [];
  stopActivePiano();
}
