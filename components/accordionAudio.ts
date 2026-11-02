import { AudioContext } from 'react-native-audio-api';
import { Asset } from 'expo-asset';

// ── Sound file map ────────────────────────────────────────────────────────────
const SOUND_MODULES: Record<string, any> = {
  'C3':  require('../assets/sounds/C3.mp3'),
  'D3':  require('../assets/sounds/D3.mp3'),
  'E3':  require('../assets/sounds/E3.mp3'),
  'F3':  require('../assets/sounds/F3.mp3'),
  'G3':  require('../assets/sounds/G3.mp3'),
  'A3':  require('../assets/sounds/A3.mp3'),
  'Bb3': require('../assets/sounds/Bb3.mp3'),
  'B3':  require('../assets/sounds/B3.mp3'),
  'C4':  require('../assets/sounds/C4.mp3'),
  'Db4': require('../assets/sounds/Db4.mp3'),
  'D4':  require('../assets/sounds/D4.mp3'),
  'Eb4': require('../assets/sounds/Eb4.mp3'),
  'E4':  require('../assets/sounds/E4.mp3'),
  'F4':  require('../assets/sounds/F4.mp3'),
  'Gb4': require('../assets/sounds/Gb4.mp3'),
  'G4':  require('../assets/sounds/G4.mp3'),
  'Ab4': require('../assets/sounds/Ab4.mp3'),
  'A4':  require('../assets/sounds/A4.mp3'),
  'Bb4': require('../assets/sounds/Bb4.mp3'),
  'B4':  require('../assets/sounds/B4.mp3'),
  'C5':  require('../assets/sounds/C5.mp3'),
};

// ── Audio engine state ────────────────────────────────────────────────────────
// One AudioContext for the whole app.
// AudioBuffers are decoded once and reused — only the source nodes are created
// per-play (fire-and-forget, identical to the web WebAudio approach).
let _ctx: AudioContext | null = null;
const _buffers: Record<string, any> = {};   // AudioBuffer per note
let audioReady = false;

// Active source tracking — needed only for explicit stop calls
let _activeTreble: any[] = [];            // AudioBufferSourceNode[]
let _bassSource:   any | null = null;     // AudioBufferSourceNode
let _chordSource:  any | null = null;

function _getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

// Create a new source node from the pre-decoded buffer and start it immediately.
// This is exactly what the web does: new BufferSourceNode → connect → start().
// No seek, no reuse, no latency beyond hardware output (~5-10ms).
function _play(note: string, durationSec?: number): any | null {
  const ctx    = _getCtx();
  const buffer = _buffers[note];
  if (!buffer) return null;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);

  if (durationSec !== undefined && durationSec > 0) {
    // schedule auto-stop at the audio clock level (no JS timer needed)
    source.start(ctx.currentTime, 0, durationSec);
  } else {
    source.start(ctx.currentTime);
  }
  return source;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initAudio(): Promise<void> {
  if (audioReady) return;

  const ctx = _getCtx();
  if (ctx.state === 'suspended') await ctx.resume();

  // Decode all files in parallel — much faster than sequential
  await Promise.all(
    Object.entries(SOUND_MODULES).map(async ([note, mod]) => {
      try {
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        const uri      = asset.localUri ?? asset.uri;
        const response = await fetch(uri);
        const ab       = await response.arrayBuffer();
        _buffers[note] = await ctx.decodeAudioData(ab);
      } catch (e) {
        console.warn(`[audio] failed to decode ${note}`, e);
      }
    })
  );

  audioReady = true;
}

// Manual button press
export function playNote(note: string): void {
  _play(note);
}

// ── Treble ────────────────────────────────────────────────────────────────────
// Mirrors web: stopActiveTrebleNotes() at each step onset cuts previous notes.

export function stopActiveTreble(): void {
  for (const src of _activeTreble) {
    try { src.stop(); } catch {}
  }
  _activeTreble = [];
}

export function playTrebleNote(note: string, durationMs?: number): void {
  const durationSec = durationMs !== undefined ? durationMs / 1000 : undefined;
  const src = _play(note, durationSec);
  if (src) _activeTreble.push(src);
}

// ── Bass ──────────────────────────────────────────────────────────────────────

export function stopActiveBassNote(): void {
  if (_bassSource) { try { _bassSource.stop(); } catch {} _bassSource = null; }
}

export function playBassNote(note: string): void {
  stopActiveBassNote();
  startBassNote(note);
}

// play-only variant — caller must call stopActiveBassNote() first.
// durationMs: mirrors web min(1500, max(50, (noteDurUnits/6)*speed)).
// The source auto-stops at the audio clock level; no JS timer needed.
export function startBassNote(note: string, durationMs?: number): void {
  const durationSec = durationMs !== undefined ? durationMs / 1000 : undefined;
  const src = _play(note, durationSec);
  if (src) _bassSource = src;
}

// ── Chord ─────────────────────────────────────────────────────────────────────

export function stopActiveChord(): void {
  if (_chordSource) { try { _chordSource.stop(); } catch {} _chordSource = null; }
}

export function playChordNote(note: string): void {
  stopActiveChord();
  startChordNote(note);
}

export function startChordNote(note: string, durationMs?: number): void {
  const durationSec = durationMs !== undefined ? durationMs / 1000 : undefined;
  const src = _play(note, durationSec);
  if (src) _chordSource = src;
}
