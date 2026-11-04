import { AudioContext } from 'react-native-audio-api';
import { Asset } from 'expo-asset';

// Flute MP3 samples — one per recorder note key
// Files copied from web public/assets/recorder/
const SOUND_MODULES: Record<string, any> = {
  'rn_c4':  require('../assets/sounds/recorder/flute_C4_1_mezzo-forte_normal.mp3'),
  'rn_cs4': require('../assets/sounds/recorder/flute_Cs4_1_mezzo-forte_normal.mp3'),
  'rn_d4':  require('../assets/sounds/recorder/flute_D4_1_mezzo-forte_normal.mp3'),
  'rn_eb4': require('../assets/sounds/recorder/flute_Ds4_1_mezzo-forte_normal.mp3'),
  'rn_e4':  require('../assets/sounds/recorder/flute_E4_1_mezzo-forte_normal.mp3'),
  'rn_f4':  require('../assets/sounds/recorder/flute_F4_1_mezzo-forte_normal.mp3'),
  'rn_fs4': require('../assets/sounds/recorder/flute_Fs4_1_mezzo-forte_normal.mp3'),
  'rn_g4':  require('../assets/sounds/recorder/flute_G4_1_mezzo-forte_normal.mp3'),
  'rn_ab4': require('../assets/sounds/recorder/flute_Gs4_1_mezzo-forte_normal.mp3'),
  'rn_a4':  require('../assets/sounds/recorder/flute_A4_1_mezzo-forte_normal.mp3'),
  'rn_bb4': require('../assets/sounds/recorder/flute_As4_1_mezzo-forte_normal.mp3'),
  'rn_b4':  require('../assets/sounds/recorder/flute_B4_1_mezzo-forte_normal.mp3'),
  'rn_c5':  require('../assets/sounds/recorder/flute_C5_1_mezzo-forte_normal.mp3'),
  'rn_cs5': require('../assets/sounds/recorder/flute_Cs5_1_mezzo-forte_normal.mp3'),
  'rn_d5':  require('../assets/sounds/recorder/flute_D5_1_mezzo-forte_normal.mp3'),
  'rn_eb5': require('../assets/sounds/recorder/flute_Ds5_1_mezzo-forte_normal.mp3'),
  'rn_e5':  require('../assets/sounds/recorder/flute_E5_1_mezzo-forte_normal.mp3'),
  'rn_f5':  require('../assets/sounds/recorder/flute_F5_1_mezzo-forte_normal.mp3'),
  'rn_fs5': require('../assets/sounds/recorder/flute_Fs5_1_mezzo-forte_normal.mp3'),
  'rn_g5':  require('../assets/sounds/recorder/flute_G5_1_mezzo-forte_normal.mp3'),
  'rn_ab5': require('../assets/sounds/recorder/flute_Gs5_1_mezzo-forte_normal.mp3'),
  'rn_a5':  require('../assets/sounds/recorder/flute_A5_1_mezzo-forte_normal.mp3'),
  'rn_bb5': require('../assets/sounds/recorder/flute_As5_1_mezzo-forte_normal.mp3'),
  'rn_b5':  require('../assets/sounds/recorder/flute_B5_1_mezzo-forte_normal.mp3'),
  'rn_c6':  require('../assets/sounds/recorder/flute_C6_1_mezzo-forte_normal.mp3'),
  'rn_cs6': require('../assets/sounds/recorder/flute_Cs6_1_mezzo-forte_normal.mp3'),
  'rn_d6':  require('../assets/sounds/recorder/flute_D6_1_mezzo-forte_normal.mp3'),
  'rn_eb6': require('../assets/sounds/recorder/flute_Ds6_1_mezzo-forte_normal.mp3'),
  'rn_e6':  require('../assets/sounds/recorder/flute_E6_1_mezzo-forte_normal.mp3'),
  'rn_f6':  require('../assets/sounds/recorder/flute_F6_1_mezzo-forte_normal.mp3'),
  'rn_fs6': require('../assets/sounds/recorder/flute_Fs6_1_mezzo-forte_normal.mp3'),
  'rn_g6':  require('../assets/sounds/recorder/flute_G6_1_mezzo-forte_normal.mp3'),
  'rn_ab6': require('../assets/sounds/recorder/flute_Gs6_1_mezzo-forte_normal.mp3'),
  'rn_a6':  require('../assets/sounds/recorder/flute_A6_1_mezzo-forte_normal.mp3'),
  'rn_bb6': require('../assets/sounds/recorder/flute_As6_1_mezzo-forte_normal.mp3'),
  'rn_b6':  require('../assets/sounds/recorder/flute_B6_1_mezzo-forte_normal.mp3'),
  'rn_c7':  require('../assets/sounds/recorder/flute_C7_1_mezzo-forte_normal.mp3'),
  'rn_cs7': require('../assets/sounds/recorder/flute_Cs7_1_mezzo-forte_normal.mp3'),
  'rn_d7':  require('../assets/sounds/recorder/flute_D7_1_mezzo-forte_normal.mp3'),
};

let _ctx: AudioContext | null = null;
const _buffers: Record<string, any> = {};
let audioReady = false;

let _activeSource: any | null = null;
let _activeGain:   any | null = null;

function _getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

function _stopActive(fadeSec = 0.04): void {
  if (!_activeSource || !_activeGain) return;
  const ctx = _getCtx();
  const now = ctx.currentTime;
  try {
    _activeGain.gain.cancelScheduledValues(now);
    _activeGain.gain.setValueAtTime(_activeGain.gain.value, now);
    _activeGain.gain.linearRampToValueAtTime(0, now + fadeSec);
    _activeSource.stop(now + fadeSec + 0.005);
  } catch {}
  _activeSource = null;
  _activeGain   = null;
}

export async function initRecorderAudio(): Promise<void> {
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
        console.warn(`[recorder] failed to decode ${key}`, e);
      }
    })
  );
  audioReady = true;
}

export function playRecorderNote(key: string): void {
  const buf = _buffers[key];
  if (!buf) return;
  _stopActive(0.04);
  const ctx   = _getCtx();
  const gain  = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(ctx.destination);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  try { src.start(ctx.currentTime); } catch { return; }
  _activeSource = src;
  _activeGain   = gain;
}

export function fadeRecorderNote(): void  { _stopActive(0.08); }
export function stopRecorderNote(): void  { _stopActive(0.005); }

export const recorderSleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
