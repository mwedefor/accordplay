import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  initAudio, playNote, playTrebleKey, playChordSample, isTrebleKey,
  getAudioCurrentTime, getAudioOutputLatencyMs,
  scheduleTrebleAt, scheduleBassAt, scheduleChordAt,
  cancelAllScheduled,
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
  // Odd values = chord buttons; even values = note buttons
  1:  { open: 'A3',  close: 'E3'  }, 2:  { open: 'A3',  close: 'E3'  },  // acid3
  3:  { open: 'C3',  close: 'F3'  }, 4:  { open: 'D3',  close: 'A3'  },  // acid2/4
  5:  { open: 'Bb3', close: 'Bb3' }, 6:  { open: 'Bb3', close: 'Bb3' },  // acid5
  7:  { open: 'D3',  close: 'G3'  }, 8:  { open: 'D3',  close: 'G3'  },  // acid0
  9:  { open: 'G3',  close: 'C3'  }, 10: { open: 'G3',  close: 'C3'  },  // acid1
  11: { open: 'D3',  close: 'A3'  }, 12: { open: 'C3',  close: 'F3'  },  // acid4/2
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


// ── Bass key maps ─────────────────────────────────────────────────────────────
// Bass note: abn_XX key → { bass button value, note name }
// Uses octave 3 notes matching the web app (same MIDI pitches as web bass samples).
// Web app: abn_48→G3, abn_49→D3, abn_50→C3, abn_51→G3, abn_52→F3, abn_53→C3,
//          abn_54→E3, abn_55→A3, abn_56→A3, abn_57→D3, abn_58/59→Bb3
const BASS_NOTE_KEY: Record<string, { value: number; note: string }> = {
  'abn_48': { value: 8,  note: 'G3'  }, 'abn_49': { value: 8,  note: 'D3'  },  // acid0
  'abn_50': { value: 10, note: 'C3'  }, 'abn_51': { value: 10, note: 'G3'  },  // acid1
  'abn_52': { value: 12, note: 'F3'  }, 'abn_53': { value: 12, note: 'C3'  },  // acid2
  'abn_54': { value: 2,  note: 'E3'  }, 'abn_55': { value: 2,  note: 'A3'  },  // acid3
  'abn_56': { value: 4,  note: 'A3'  }, 'abn_57': { value: 4,  note: 'D3'  },  // acid4
  'abn_58': { value: 6,  note: 'Bb3' }, 'abn_59': { value: 6,  note: 'Bb3' },  // acid5
};
// Bass chord: abc_N → { bass button value, accordion chord sample file }
// chordFile matches web app BASS_CHORD_KEY_MAP (files from chords/ in accordion-samples.zip).
// Even indices = close bellows, odd = open bellows; same physical button per acid.
const ACID_CHORD: Record<number, { value: number; chordFile: string }> = {
  0:  { value: 7,  chordFile: '35' }, 1:  { value: 7,  chordFile: '26' },  // acid0 → button 37
  2:  { value: 9,  chordFile: '15' }, 3:  { value: 9,  chordFile: '35' },  // acid1 → button 39
  4:  { value: 3,  chordFile: '22' }, 5:  { value: 3,  chordFile: '15' },  // acid2 → button 33
  6:  { value: 1,  chordFile: '41' }, 7:  { value: 1,  chordFile: '3'  },  // acid3 → button 31
  8:  { value: 11, chordFile: '5'  }, 9:  { value: 11, chordFile: '24' },  // acid4 → button 41
  10: { value: 5,  chordFile: '9'  }, 11: { value: 5,  chordFile: '9'  },  // acid5 → button 35
};

// ── Column layouts ────────────────────────────────────────────────────────────
const COL_I   = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const COL_II  = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
const COL_III = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21];
const BASS_L  = [1, 2, 3, 4, 5, 6];
const BASS_R  = [7, 8, 9, 10, 11, 12];

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

  const stopRef         = useRef(false);
  const sessionRef      = useRef(0);
  const countRef        = useRef(0);
  const speedRef        = useRef(DEMO_SPEED_MS);
  // Lookahead scheduler state
  const schedulerRef    = useRef<any>(null);   // setInterval handle
  const nextAudioTime   = useRef(0);           // abs audio-clock time (sec) for next step
  const nextStepIdx     = useRef(0);           // which DEMO_NOTES index to schedule next
  const visualTimers    = useRef<any[]>([]);   // setTimeout handles — cleared on stop
  const playSession     = useRef(0);           // incremented on every start/stop

  useEffect(() => {
    initAudio().then(() => setAudioReady(true));
  }, []);

  // ── Manual button press ──
  const onPressBtn = useCallback((btnIdx: number) => {
    const pitoKey = bellowOpen ? PITO_KEY[btnIdx]?.open : PITO_KEY[btnIdx]?.close;
    if (pitoKey) playTrebleKey(pitoKey);
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

  // ── Lookahead scheduler ───────────────────────────────────────────────────────
  // Parses one step, schedules its audio events at absolute audio-clock time,
  // and queues visual (color) updates via setTimeout for the same moment.
  const scheduleStepAt = useCallback((
    stepStr: string,
    stepTimeSec: number,
    displayIdx: number,
    session: number,
  ) => {
    const tokens = stepStr.trim().split(' ');
    const newColors: Record<number, BtnColor> = { ...BLANK };
    const delayedVisuals: { delayMs: number; btnIdx: number; color: BtnColor }[] = [];
    const delayedIndices = new Set<number>();

    const trebleSet = new Set<string>();
    let bassNote:  string | null = null;
    let bassDurMs: number | undefined;
    let chordFile: string | null = null;
    let chordDurMs: number | undefined;

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
          const acidIdx = parseInt(m[1]);
          const c = ACID_CHORD[acidIdx];
          if (c) {
            chordFile  = c.chordFile;
            chordDurMs = noteDurUnits !== undefined
              ? Math.min(1500, Math.max(50, (noteDurUnits / 6) * speedRef.current))
              : 1500;
            const btnIdx = 30 + c.value;
            // even index = close bellows (blue), odd = open (yellow) — matches web
            const chordColor: BtnColor = acidIdx % 2 === 0 ? 'blue' : 'yellow';
            if (delayMs > 1) { delayedVisuals.push({ delayMs, btnIdx, color: chordColor }); delayedIndices.add(btnIdx); }
            else              { newColors[btnIdx] = chordColor; }
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
          if (delayMs > 1) { delayedVisuals.push({ delayMs, btnIdx, color: 'blue' }); delayedIndices.add(btnIdx); }
          else              { newColors[btnIdx] = 'blue'; }
        }
      } else {
        const btnIdx = KEY_TO_BTN[key];
        if (btnIdx !== undefined && isTrebleKey(key)) {
          const isOpen = KEY_DIR[key] === 'open';
          newColors[btnIdx] = isOpen ? 'yellow' : 'blue';
          trebleSet.add(key);
        }
      }
    }

    const lastTok        = tokens[tokens.length - 1];
    const units          = !isNaN(parseInt(lastTok)) ? Math.max(3, parseInt(lastTok)) : 6;
    const stepDurationMs = (units / 6) * speedRef.current;
    const shadowTime     = Math.min(600, Math.max(80, stepDurationMs * 0.5));
    const trebleDurSec   = stepDurationMs / 1000;

    // ── Audio: scheduled at absolute audio-clock time ────────────────────────
    for (const key of trebleSet) scheduleTrebleAt(key, stepTimeSec, trebleDurSec);
    if (bassNote)  scheduleBassAt(bassNote,   stepTimeSec, (bassDurMs  ?? 1500) / 1000);
    if (chordFile) scheduleChordAt(chordFile, stepTimeSec, (chordDurMs ?? 1500) / 1000);

    // ── Visuals: fire via setTimeout at the wall-clock equivalent ────────────
    // Delay the visual by the audio hardware output latency so the button
    // highlight fires when the note is actually heard, not when it's scheduled.
    // getAudioOutputLatencyMs() uses ctx.outputLatency when available, or a
    // platform-based estimate (50ms Android / 20ms iOS) as fallback.
    const msUntilStep = Math.max(0, (stepTimeSec - getAudioCurrentTime()) * 1000 + getAudioOutputLatencyMs());

    const push = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      visualTimers.current.push(id);
    };

    push(() => {
      if (playSession.current !== session) return;
      countRef.current = displayIdx;
      setCount(displayIdx);
      setColors(newColors);
    }, msUntilStep);

    for (const { delayMs, btnIdx, color } of delayedVisuals) {
      push(() => {
        if (playSession.current !== session) return;
        setColors(prev => ({ ...prev, [btnIdx]: color }));
      }, msUntilStep + delayMs);
      push(() => {
        if (playSession.current !== session) return;
        setColors(prev => ({ ...prev, [btnIdx]: 'white' }));
      }, msUntilStep + delayMs + shadowTime);
    }

    push(() => {
      if (playSession.current !== session) return;
      setColors(prev => {
        const next = { ...prev };
        for (let k = 0; k < 43; k++) { if (!delayedIndices.has(k)) next[k] = 'white'; }
        return next;
      });
    }, msUntilStep + shadowTime);
  }, []);

  // ── Scheduler loop — runs every SCHEDULE_INTERVAL_MS ─────────────────────────
  // Fills the lookahead window with pre-scheduled audio + visual events.
  const LOOKAHEAD_SEC      = 0.5;  // schedule 500 ms ahead
  const SCHEDULE_INTERVAL  = 100;  // refill every 100 ms

  const scheduleLoop = useCallback((session: number) => {
    const horizon = getAudioCurrentTime() + LOOKAHEAD_SEC;
    while (nextAudioTime.current < horizon) {
      const idx     = nextStepIdx.current % DEMO_NOTES.length;
      const stepStr = DEMO_NOTES[idx];
      scheduleStepAt(stepStr, nextAudioTime.current, idx, session);

      const tokens      = stepStr.trim().split(' ');
      const lastTok     = tokens[tokens.length - 1];
      const units       = !isNaN(parseInt(lastTok)) ? Math.max(3, parseInt(lastTok)) : 6;
      const durationSec = ((units / 6) * speedRef.current) / 1000;
      nextAudioTime.current += durationSec;
      nextStepIdx.current++;
    }
  }, [scheduleStepAt]);

  // ── startPlay / stopPlay / resetSong ─────────────────────────────────────────
  const startPlay = useCallback(() => {
    if (isPlaying || !audioReady) return;
    const session = ++playSession.current;
    nextAudioTime.current = getAudioCurrentTime() + 0.05; // 50 ms lead time
    nextStepIdx.current   = countRef.current;
    setIsPlaying(true);
    scheduleLoop(session);
    schedulerRef.current = setInterval(() => scheduleLoop(session), SCHEDULE_INTERVAL);
  }, [isPlaying, audioReady, scheduleLoop]);

  const stopPlay = useCallback(() => {
    clearInterval(schedulerRef.current);
    visualTimers.current.forEach(clearTimeout);
    visualTimers.current = [];
    playSession.current++;  // invalidates any in-flight visual callbacks
    cancelAllScheduled();
    setIsPlaying(false);
    setColors({ ...BLANK });
  }, []);

  const resetSong = useCallback(() => {
    clearInterval(schedulerRef.current);
    visualTimers.current.forEach(clearTimeout);
    visualTimers.current = [];
    playSession.current++;
    cancelAllScheduled();
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
