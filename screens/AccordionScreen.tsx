import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  initAudio, playNote,
  stopActiveTreble, playTrebleNote,
  stopActiveBassNote, startBassNote,
  stopActiveChord, startChordNote,
} from '../components/accordionAudio';
import AppHeader from '../components/AppHeader';
import SideDrawer from '../components/SideDrawer';
import { DEMO_NOTES, DEMO_NAME, DEMO_SPEED_MS } from '../data/accordionDemo';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Design tokens — from web src/styles/tokens.ts ────────────────────────────
const T = {
  trebleGrad: ['#8B0000', '#6B0000', '#4a0000', '#6B0000', '#8B0000'] as const,
  bassGrad:   ['#1a1a2e', '#0f0f1a', '#16213e', '#0f0f1a', '#1a1a2e'] as const,
  colHeaderT: 'rgba(255,200,150,0.75)',
  colHeaderB: 'rgba(180,200,255,0.7)',
  labelOpen:  '#ffd000',
  labelClose: '#38d4f5',
  btnWhite:  { bg: '#d1d5db', border: '#9ca3af' },
  btnYellow: { bg: '#f97316', border: '#ea580c' },
  btnBlue:   { bg: '#3b82f6', border: '#2563eb' },
};

// ── Button sizes — circular (w-8 sm / w-12 md, like web) ─────────────────────
const BODY_PAD  = 12;
const INNER_PAD = 18;
const COL_GAP   = 10;
const BTN_D  = Math.min(44, Math.floor((SCREEN_W - BODY_PAD * 2 - INNER_PAD * 2 - COL_GAP * 2) / 3));
const BASS_D = Math.min(44, Math.floor((SCREEN_W - BODY_PAD * 2 - INNER_PAD * 2 - COL_GAP) / 2));

// ── Note label tables (from web ACCORDION_BUTTON_LABELS / BASS_BUTTON_LABELS) ─
const TREBLE_LABELS: Record<number, { open: string; close: string }> = {
  0:  { open: 'B3',  close: 'E4'  }, 1:  { open: 'Ab3', close: 'Db4' },
  2:  { open: 'Gb3', close: 'A3'  }, 3:  { open: 'D3',  close: 'E3'  },
  4:  { open: 'B2',  close: 'Db3' }, 5:  { open: 'Gb2', close: 'A2'  },
  6:  { open: 'D2',  close: 'E2'  }, 7:  { open: 'Eb2', close: 'Db2' },
  8:  { open: 'E2',  close: 'A1'  }, 9:  { open: 'F2',  close: 'Eb2' },
  10: { open: 'E4',  close: 'A4'  }, 11: { open: 'Db4', close: 'Gb4' },
  12: { open: 'B3',  close: 'D4'  }, 13: { open: 'G3',  close: 'A3'  },
  14: { open: 'E3',  close: 'Gb3' }, 15: { open: 'Db3', close: 'D3'  },
  16: { open: 'B2',  close: 'A2'  }, 17: { open: 'G2',  close: 'Gb2' },
  18: { open: 'E2',  close: 'D2'  }, 19: { open: 'Db2', close: 'A1'  },
  20: { open: 'Bb2', close: 'Ab2' },
  21: { open: 'Gb4', close: 'B4'  }, 22: { open: 'E4',  close: 'G4'  },
  23: { open: 'C4',  close: 'D4'  }, 24: { open: 'A3',  close: 'B3'  },
  25: { open: 'Gb3', close: 'G3'  }, 26: { open: 'E3',  close: 'D3'  },
  27: { open: 'C3',  close: 'B2'  }, 28: { open: 'A2',  close: 'G2'  },
  29: { open: 'Gb2', close: 'D2'  }, 30: { open: 'Eb3', close: 'F3'  },
};
const BASS_LABELS: Record<number, { open: string; close: string }> = {
  1:  { open: 'A3',  close: 'A3'  }, 2:  { open: 'A3',  close: 'E3'  },
  3:  { open: 'D3',  close: 'D3'  }, 4:  { open: 'D3',  close: 'A3'  },
  5:  { open: 'Bb3', close: 'Bb3' }, 6:  { open: 'Bb3', close: 'Bb3' },
  7:  { open: 'G3',  close: 'G3'  }, 8:  { open: 'D3',  close: 'G3'  },
  9:  { open: 'C3',  close: 'C3'  }, 10: { open: 'G3',  close: 'C3'  },
  11: { open: 'F3',  close: 'F3'  }, 12: { open: 'C3',  close: 'F3'  },
};

// ── Key → button index maps (from web PITO_KEY) ───────────────────────────────
const PITO_KEY: Record<number, { open: string; close: string }> = {
  0:  { open: 'aab18', close: 'acb36' }, 1:  { open: 'aab20', close: 'acb27' },
  2:  { open: 'aab16', close: 'acb18' }, 3:  { open: 'aab12', close: 'acb16' },
  4:  { open: 'aab8',  close: 'acb12' }, 5:  { open: 'aab5',  close: 'acb8'  },
  6:  { open: 'aab4',  close: 'acb4'  }, 7:  { open: 'aab3',  close: 'acb3'  },
  8:  { open: 'aab2',  close: 'acb2'  }, 9:  { open: 'aab0',  close: 'acb0'  },
  10: { open: 'aam18', close: 'acm36' }, 11: { open: 'aam20', close: 'acm27' },
  12: { open: 'aam16', close: 'acm18' }, 13: { open: 'aam12', close: 'acm16' },
  14: { open: 'aam8',  close: 'acm12' }, 15: { open: 'aam5',  close: 'acm8'  },
  16: { open: 'aam4',  close: 'acm4'  }, 17: { open: 'aam3',  close: 'acm3'  },
  18: { open: 'aam2',  close: 'acm2'  }, 19: { open: 'aam01', close: 'acm01' },
  20: { open: 'aam0',  close: 'acm0'  },
  21: { open: 'aaa20', close: 'aca27' }, 22: { open: 'aaa16', close: 'aca18' },
  23: { open: 'aaa12', close: 'aca16' }, 24: { open: 'aaa8',  close: 'aca12' },
  25: { open: 'aaa5',  close: 'aca8'  }, 26: { open: 'aaa4',  close: 'aca4'  },
  27: { open: 'aaa3',  close: 'aca3'  }, 28: { open: 'aaa2',  close: 'aca2'  },
  29: { open: 'aaa01', close: 'aca01' }, 30: { open: 'aaa0',  close: 'aca0'  },
};
const KEY_TO_BTN: Record<string, number> = {};
const KEY_DIR: Record<string, 'open' | 'close'> = {};
for (const [idxStr, keys] of Object.entries(PITO_KEY)) {
  const idx = Number(idxStr);
  KEY_TO_BTN[keys.open] = idx;  KEY_DIR[keys.open] = 'open';
  KEY_TO_BTN[keys.close] = idx; KEY_DIR[keys.close] = 'close';
}

// ── Key → audio note (derived from web TREBLE_KEY_MAP MIDI values) ────────────
// Web uses WebAudio pitch-shifting; we fold notes down to available MP3 octaves.
// MIDI mapping: web targetMidi → nearest available file (max octave: A4,B4,C5,D4,E4,F4,G4,Gb4,Ab4,Bb4,Db4,Eb4)
const KEY_TO_SOUND: Record<string, string> = {
  // aab* — Col I open bellows
  'aab18': 'A4',  'aab20': 'Gb4', 'aab16': 'E4',
  'aab12': 'C5',  'aab8':  'A4',  'aab5':  'Gb4',
  'aab4':  'E4',  'aab3':  'C4',  'aab2':  'A3',
  'aab0':  'Eb4',
  // acb* — Col I close bellows
  'acb36': 'D4',  'acb27': 'B4',  'acb18': 'G4',
  'acb16': 'D4',  'acb12': 'B4',  'acb8':  'G4',
  'acb4':  'D4',  'acb3':  'B3',  'acb2':  'G3',
  'acb0':  'Db4',
  // aam* — Col II open bellows
  'aam18': 'D4',  'aam20': 'B4',  'aam16': 'A4',
  'aam12': 'F4',  'aam8':  'D4',  'aam5':  'B4',
  'aam4':  'A4',  'aam3':  'F4',  'aam2':  'D4',
  'aam01': 'B3',  'aam0':  'Ab4',
  // acm* — Col II close bellows
  'acm36': 'G4',  'acm27': 'E4',  'acm18': 'C5',
  'acm16': 'G4',  'acm12': 'E4',  'acm8':  'C5',
  'acm4':  'G4',  'acm3':  'E4',  'acm2':  'C4',
  'acm01': 'G3',  'acm0':  'Gb4',
  // aaa* — Col III open bellows
  'aaa20': 'E4',  'aaa16': 'D4',  'aaa12': 'Bb4',
  'aaa8':  'G4',  'aaa5':  'E4',  'aaa4':  'D4',
  'aaa3':  'Bb4', 'aaa2':  'G4',  'aaa01': 'E4',
  'aaa0':  'Db4',
  // aca* — Col III close bellows
  'aca27': 'A4',  'aca18': 'F4',  'aca16': 'C5',
  'aca12': 'A4',  'aca8':  'F4',  'aca4':  'C5',
  'aca3':  'A4',  'aca2':  'F4',  'aca01': 'C4',
  'aca0':  'Eb4',
};

// ── Bass key maps ─────────────────────────────────────────────────────────────
// Bass note: abn_XX key → { bass button value, note name }
const BASS_NOTE_KEY: Record<string, { value: number; note: string }> = {
  'abn_55': { value: 2,  note: 'A3'  }, 'abn_54': { value: 2,  note: 'E3'  },
  'abn_57': { value: 4,  note: 'D3'  }, 'abn_56': { value: 4,  note: 'A3'  },
  'abn_59': { value: 6,  note: 'Bb3' }, 'abn_58': { value: 6,  note: 'Bb3' },
  'abn_49': { value: 8,  note: 'D3'  }, 'abn_48': { value: 8,  note: 'G3'  },
  'abn_51': { value: 10, note: 'G3'  }, 'abn_50': { value: 10, note: 'C3'  },
  'abn_53': { value: 12, note: 'C3'  }, 'abn_52': { value: 12, note: 'F3'  },
};
// Bass chord: abc_N → acid index → { bass button value, note name }
const ACID_CHORD: Record<number, { value: number; note: string }> = {
  0: { value: 7,  note: 'G3'  }, 1: { value: 9,  note: 'C3'  },
  2: { value: 11, note: 'F3'  }, 3: { value: 1,  note: 'A3'  },
  4: { value: 3,  note: 'D3'  }, 5: { value: 5,  note: 'Bb3' },
  // Close-bellows chords (abc_6–abc_11) — same buttons, different bellows direction
  6: { value: 7,  note: 'G3'  }, 7: { value: 9,  note: 'C3'  },
  8: { value: 11, note: 'F3'  }, 9: { value: 1,  note: 'A3'  },
  10:{ value: 3,  note: 'D3'  }, 11:{ value: 5,  note: 'Bb3' },
};

// ── Column layouts ────────────────────────────────────────────────────────────
const COL_I   = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const COL_II  = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
const COL_III = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21];
const BASS_L  = [1, 2, 11, 4, 5, 6];
const BASS_R  = [7, 8, 9, 10, 3, 12];

type BtnColor = 'white' | 'yellow' | 'blue';
const BLANK: Record<number, BtnColor> = {};
for (let k = 0; k < 43; k++) BLANK[k] = 'white';

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AccordionScreen({ navigation }: any) {
  const [bellowOpen, setBellowOpen] = useState(true);
  const [colors, setColors] = useState<Record<number, BtnColor>>({ ...BLANK });
  const [isPlaying, setIsPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [speed, setSpeed] = useState(DEMO_SPEED_MS);
  const [audioReady, setAudioReady] = useState(false);

  const stopRef    = useRef(false);
  const sessionRef = useRef(0);
  const countRef   = useRef(0);
  const speedRef   = useRef(DEMO_SPEED_MS);

  useEffect(() => {
    initAudio().then(() => setAudioReady(true));
  }, []);

  // ── Manual button press ──
  const onPressBtn = useCallback((btnIdx: number) => {
    const pitoKey = bellowOpen ? PITO_KEY[btnIdx]?.open : PITO_KEY[btnIdx]?.close;
    const note    = pitoKey ? KEY_TO_SOUND[pitoKey] : undefined;
    if (note) playNote(note);
    const c: BtnColor = bellowOpen ? 'yellow' : 'blue';
    setColors(prev => ({ ...prev, [btnIdx]: c }));
    setTimeout(() => setColors(prev => ({ ...prev, [btnIdx]: 'white' })), 350);
  }, [bellowOpen]);

  const onPressBass = useCallback((value: number) => {
    const lbl  = BASS_LABELS[value];
    const note = bellowOpen ? lbl?.open : lbl?.close;
    if (note) playNote(note);
    const c: BtnColor = bellowOpen ? 'yellow' : 'blue';
    setColors(prev => ({ ...prev, [30 + value]: c }));
    setTimeout(() => setColors(prev => ({ ...prev, [30 + value]: 'white' })), 350);
  }, [bellowOpen]);

  // ── step() — faithful port of web Accordion.tsx step() ───────────────────────
  const step = useCallback((stepStr: string, sessionId: number): Promise<void> => {
    return new Promise<void>(resolve => {
      const tokens = stepStr.trim().split(' ');
      const newColors: Record<number, BtnColor> = { ...BLANK };
      const delayedUpdates: { delayMs: number; btnIdx: number; color: BtnColor }[] = [];
      const delayedIndices = new Set<number>();

      // ── Phase 1: collect — parse tokens, no native audio calls ──────────────
      const trebleThisStep = new Set<string>();
      let bassNote:     string | null = null;
      let bassDurMs:    number | undefined;
      let chordNote:    string | null = null;
      let chordDurMs:   number | undefined;

      for (let j = 0; j < tokens.length - 1; j++) {
        const tok     = tokens[j];
        const atIdx   = tok.indexOf('@');
        const body    = atIdx >= 0 ? tok.slice(0, atIdx) : tok;
        const delayMs = atIdx >= 0 ? parseFloat(tok.slice(atIdx + 1)) : 0;
        const colIdx  = body.indexOf(':');
        const key          = colIdx >= 0 ? body.slice(0, colIdx) : body;
        const noteDurUnits = colIdx >= 0 ? parseInt(body.slice(colIdx + 1)) : undefined;

        if (key.startsWith('abc')) {
          const m = key.match(/abc_?(\d+)/);
          if (m) {
            const c = ACID_CHORD[parseInt(m[1])];
            if (c) {
              chordNote  = c.note;
              // mirrors web: min(1500, max(50, (noteDurUnits/6)*speed))
              chordDurMs = noteDurUnits !== undefined
                ? Math.min(1500, Math.max(50, (noteDurUnits / 6) * speedRef.current))
                : 1500;
              const btnIdx = 30 + c.value;
              if (delayMs > 1) {
                delayedUpdates.push({ delayMs, btnIdx, color: 'yellow' });
                delayedIndices.add(btnIdx);
              } else {
                newColors[btnIdx] = 'yellow';
              }
            }
          }
        } else if (key.startsWith('abn')) {
          const entry = BASS_NOTE_KEY[key];
          if (entry) {
            bassNote  = entry.note;
            bassDurMs = noteDurUnits !== undefined
              ? Math.min(1500, Math.max(50, (noteDurUnits / 6) * speedRef.current))
              : 1500;
            const btnIdx = 30 + entry.value;
            if (delayMs > 1) {
              delayedUpdates.push({ delayMs, btnIdx, color: 'blue' });
              delayedIndices.add(btnIdx);
            } else {
              newColors[btnIdx] = 'blue';
            }
          }
        } else {
          const btnIdx = KEY_TO_BTN[key];
          if (btnIdx !== undefined) {
            const note   = KEY_TO_SOUND[key];
            const isOpen = KEY_DIR[key] === 'open';
            if (note) {
              newColors[btnIdx] = isOpen ? 'yellow' : 'blue';
              trebleThisStep.add(note);
            }
          }
        }
      }

      // Timing
      const lastTok    = tokens[tokens.length - 1];
      const units      = !isNaN(parseInt(lastTok)) ? Math.max(3, parseInt(lastTok)) : 6;
      const shadowTime = Math.min(600, Math.max(80, (units / 6) * speedRef.current * 0.5));
      // treble notes auto-stop at the audio clock (mirrors bass/chord durationMs approach)
      const trebleDurMs = (units / 6) * speedRef.current;

      // ── Phase 2: stop-all — queue all stop+seekTo calls together ────────────
      // All stops are batched before any play call reaches the native layer.
      stopActiveTreble();
      if (bassNote)  stopActiveBassNote();
      if (chordNote) stopActiveChord();

      // ── Phase 3: play-all — all play() calls land right after the stops ─────
      // Single play() per note (no seekTo at onset — slots pre-seeked during stop).
      for (const note of trebleThisStep) playTrebleNote(note, trebleDurMs);
      if (bassNote)  startBassNote(bassNote,  bassDurMs);
      if (chordNote) startChordNote(chordNote, chordDurMs);

      // ── Phase 4: visual ──────────────────────────────────────────────────────
      setColors(newColors);

      // Schedule delayed bass button illuminations (same as web)
      for (const { delayMs, btnIdx, color } of delayedUpdates) {
        setTimeout(() => {
          if (sessionRef.current !== sessionId) return;
          setColors(prev => ({ ...prev, [btnIdx]: color }));
        }, delayMs);
        setTimeout(() => {
          if (sessionRef.current !== sessionId) return;
          setColors(prev => ({ ...prev, [btnIdx]: 'white' }));
        }, delayMs + shadowTime);
      }

      setTimeout(() => {
        // Reset only immediate (non-delayed) buttons after shadowTime
        setColors(prev => {
          const next = { ...prev };
          for (let k = 0; k < 43; k++) {
            if (!delayedIndices.has(k)) next[k] = 'white';
          }
          return next;
        });
        resolve();
      }, shadowTime);
    });
  }, []);

  // ── onClickPlay — faithful port of web onClickPlay ────────────────────────────
  const startPlay = useCallback(async () => {
    if (isPlaying || !audioReady) return;
    stopRef.current = false;
    const mySession = ++sessionRef.current;
    setIsPlaying(true);

    // Drift-correcting loop: track expected wall-clock time and shorten each
    // wait to compensate for accumulated JS-thread overhead (RN bridge adds
    // ~5-15ms per step vs browser, which makes the song feel slower over time).
    let anchorMs  = performance.now();
    let expectedMs = 0;

    while (!stopRef.current && mySession === sessionRef.current) {
      if (countRef.current >= DEMO_NOTES.length) {
        countRef.current = 0;
        setCount(0);
        // Re-anchor drift clock on loop-around so error doesn't compound
        anchorMs   = performance.now();
        expectedMs = 0;
      }

      const pos     = countRef.current;
      const stepStr = DEMO_NOTES[pos];

      const tokens  = stepStr.trim().split(' ');
      const lastTok = tokens[tokens.length - 1];
      const units   = !isNaN(parseInt(lastTok)) ? Math.max(3, parseInt(lastTok)) : 6;
      const stepDurationMs = (units / 6) * speedRef.current;
      expectedMs += stepDurationMs;

      await step(stepStr, mySession);
      if (mySession !== sessionRef.current) break;

      // Wait only until expectedMs from anchor, compensating for any overhead
      // that accumulated in step() and prior iterations.
      const remainingMs = Math.max(0, expectedMs - (performance.now() - anchorMs));

      await new Promise<void>(res => setTimeout(res, remainingMs));
      if (mySession !== sessionRef.current) break;

      if (countRef.current === pos) countRef.current++;
      setCount(countRef.current);

      if (stopRef.current) break;
    }

    if (mySession === sessionRef.current) {
      setIsPlaying(false);
      setColors({ ...BLANK });
    }
  }, [isPlaying, audioReady, step]);

  const stopPlay = useCallback(() => {
    stopRef.current = true;
    sessionRef.current++;
    setIsPlaying(false);
    setColors({ ...BLANK });
  }, []);

  const resetSong = useCallback(() => {
    stopRef.current = true;
    sessionRef.current++;
    setIsPlaying(false);
    setColors({ ...BLANK });
    countRef.current = 0;
    setCount(0);
  }, []);

  const adjustSpeed = (delta: number) => {
    const s = Math.max(100, Math.min(1200, speed + delta));
    setSpeed(s);
    speedRef.current = s;
  };

  // ── Render treble button ──────────────────────────────────────────────────────
  const renderPito = (idx: number) => {
    const c   = colors[idx] ?? 'white';
    const tok = c === 'yellow' ? T.btnYellow : c === 'blue' ? T.btnBlue : T.btnWhite;
    const lbl = TREBLE_LABELS[idx];
    return (
      <TouchableOpacity
        key={idx}
        onPress={() => onPressBtn(idx)}
        activeOpacity={0.7}
        style={[s.btn, {
          width: BTN_D, height: BTN_D, borderRadius: BTN_D / 2,
          backgroundColor: tok.bg, borderColor: tok.border,
          shadowColor: c !== 'white' ? tok.bg : 'transparent',
          shadowOpacity: c !== 'white' ? 0.7 : 0,
          shadowRadius: 6, elevation: c !== 'white' ? 6 : 2,
          transform: [{ scale: c !== 'white' ? 1.1 : 1 }],
        }]}
      >
        {lbl && (
          <View style={s.lblWrap} pointerEvents="none">
            <Text style={[s.lbl, { color: T.labelOpen,  fontSize: BTN_D < 36 ? 7 : 9 }]}>{lbl.open}</Text>
            <Text style={[s.lbl, { color: T.labelClose, fontSize: BTN_D < 36 ? 7 : 9 }]}>{lbl.close}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Render bass button ────────────────────────────────────────────────────────
  const renderBass = (value: number) => {
    const c   = colors[30 + value] ?? 'white';
    const tok = c === 'yellow' ? T.btnYellow : c === 'blue' ? T.btnBlue : T.btnWhite;
    const lbl = BASS_LABELS[value];
    return (
      <TouchableOpacity
        key={value}
        onPress={() => onPressBass(value)}
        activeOpacity={0.7}
        style={[s.btn, {
          width: BASS_D, height: BASS_D, borderRadius: BASS_D / 2,
          backgroundColor: tok.bg, borderColor: tok.border,
          shadowColor: c !== 'white' ? tok.bg : 'transparent',
          shadowOpacity: c !== 'white' ? 0.7 : 0,
          shadowRadius: 6, elevation: c !== 'white' ? 6 : 2,
          transform: [{ scale: c !== 'white' ? 1.1 : 1 }],
        }]}
      >
        {lbl && (
          <View style={s.lblWrap} pointerEvents="none">
            <Text style={[s.lbl, { color: T.labelOpen,  fontSize: 7 }]}>{lbl.open}</Text>
            <Text style={[s.lbl, { color: T.labelClose, fontSize: 7 }]}>{lbl.close}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <AppHeader navigation={navigation} />

      {/* Transport */}
      <View style={s.transport}>
        <TouchableOpacity style={[s.bellowBtn, bellowOpen  && s.bellowOpen]}  onPress={() => setBellowOpen(true)}  activeOpacity={0.8}>
          <Text style={[s.bellowTxt, bellowOpen  && s.bellowOpenTxt]}>↔</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bellowBtn, !bellowOpen && s.bellowClose]} onPress={() => setBellowOpen(false)} activeOpacity={0.8}>
          <Text style={[s.bellowTxt, !bellowOpen && s.bellowCloseTxt]}>↕</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.speedBtn} onPress={() => adjustSpeed(50)}  activeOpacity={0.8}><Text style={s.speedTxt}>−</Text></TouchableOpacity>
        <Text style={s.speedVal}>{speed}ms</Text>
        <TouchableOpacity style={s.speedBtn} onPress={() => adjustSpeed(-50)} activeOpacity={0.8}><Text style={s.speedTxt}>+</Text></TouchableOpacity>

        <TouchableOpacity
          style={[s.playBtn, isPlaying && s.stopBtn, !audioReady && { opacity: 0.4 }]}
          onPress={isPlaying ? stopPlay : startPlay}
          disabled={!audioReady}
          activeOpacity={0.8}
        >
          <Text style={s.playTxt}>{isPlaying ? '■' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.resetBtn} onPress={resetSong} activeOpacity={0.8}>
          <Text style={s.resetTxt}>⏮</Text>
        </TouchableOpacity>

        <Text style={s.counter}>{count}/{DEMO_NOTES.length}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ══ TREBLE ══ */}
        <LinearGradient colors={T.trebleGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.instrBody}>
          <View style={s.grillTop} pointerEvents="none" />
          <View style={s.grillBot} pointerEvents="none" />
          <View style={s.sheen}    pointerEvents="none" />
          <Text style={[s.sectionLbl, { color: T.colHeaderT }]}>{DEMO_NAME} · TREBLE</Text>
          <View style={s.colsRow}>
            {([{ label: 'I', btns: COL_I }, { label: 'II', btns: COL_II }, { label: 'III', btns: COL_III }] as const).map(col => (
              <View key={col.label} style={[s.col, { width: BTN_D }]}>
                <Text style={[s.colHdr, { color: T.colHeaderT }]}>{col.label}</Text>
                {col.btns.map(renderPito)}
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ══ BASS ══ */}
        <LinearGradient colors={T.bassGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.instrBody, s.bassBody]}>
          <View style={[s.grillTop, { borderTopLeftRadius: 14, borderTopRightRadius: 14 }]}    pointerEvents="none" />
          <View style={[s.grillBot, { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }]} pointerEvents="none" />
          <View style={[s.sheen,    { borderTopLeftRadius: 14, borderTopRightRadius: 14 }]}    pointerEvents="none" />
          <Text style={[s.sectionLbl, { color: T.colHeaderB }]}>BASS</Text>
          <View style={s.colsRow}>
            {([{ label: 'I', btns: BASS_L }, { label: 'II', btns: BASS_R }] as const).map(col => (
              <View key={col.label} style={[s.col, { width: BASS_D }]}>
                <Text style={[s.colHdr, { color: T.colHeaderB }]}>{col.label}</Text>
                {col.btns.map(renderBass)}
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ height: 30 }} />
      </ScrollView>

      <SideDrawer navigation={navigation} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  transport: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  bellowBtn:    { width: 40, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: '#444', backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  bellowOpen:   { backgroundColor: '#f97316', borderColor: '#ea580c' },
  bellowClose:  { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
  bellowTxt:    { fontSize: 16, color: '#666' },
  bellowOpenTxt: { color: '#78350f' },
  bellowCloseTxt:{ color: '#eff6ff' },
  speedBtn:    { width: 30, height: 30, borderRadius: 6, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  speedTxt:    { fontSize: 16, color: '#ccc', fontWeight: '700' },
  speedVal:    { fontSize: 11, color: '#888', minWidth: 44, textAlign: 'center' },
  playBtn:     { width: 38, height: 34, borderRadius: 8, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  stopBtn:     { backgroundColor: '#b91c1c' },
  playTxt:     { fontSize: 14, color: '#fff' },
  resetBtn:    { width: 34, height: 34, borderRadius: 8, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  resetTxt:    { fontSize: 14, color: '#9ca3af' },
  counter:     { fontSize: 10, color: '#555', marginLeft: 4 },

  body:        { padding: BODY_PAD, gap: 10 },
  instrBody:   { borderRadius: 18, paddingVertical: 16, paddingHorizontal: INNER_PAD, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 16, elevation: 12 },
  bassBody:    { borderRadius: 14 },

  grillTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  grillBot:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  sheen:       { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.06)', borderTopLeftRadius: 18, borderTopRightRadius: 18 },

  sectionLbl:  { fontSize: 9, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  colsRow:     { flexDirection: 'row', justifyContent: 'center', gap: COL_GAP },
  col:         { alignItems: 'center', gap: 5 },
  colHdr:      { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  btn:         { borderWidth: 2, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 2 } },
  lblWrap:     { position: 'absolute', bottom: 1, left: 0, right: 0, alignItems: 'center' },
  lbl:         { fontWeight: '700', letterSpacing: 0.3, lineHeight: 10, textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
