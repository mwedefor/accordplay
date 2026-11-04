import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useWindowDimensions, Animated, Modal, PanResponder, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  initAudio, playNote, playTrebleKey, isTrebleKey,
  getAudioCurrentTime, getAudioOutputLatencyMs,
  scheduleTrebleAt, scheduleBassAt, scheduleChordAt,
  cancelAllScheduled, sweepEndedSources,
  stopActiveTreble, playTrebleKeyManual,
} from '../components/accordionAudio';
import ScreenLayout from '../components/ScreenLayout';
import { NAV_RAIL_W } from '../components/NavRail';
import { DEMO_NOTES, DEMO_NAME, DEMO_SPEED_MS, DEMO_SECTIONS } from '../data/accordionDemo';
import { useSongParts } from '../hooks/useSongParts';

// ── Note label helpers (modes 0-3, same as web getLabel) ─────────────────────
const ABC_TO_SOL: Record<string, string> = {
  'C': 'Do',  'D': 'Re',   'E': 'Mi',  'F': 'Fa',  'G': 'Sol', 'A': 'La',  'B': 'Si',
  'Cb': 'Dob', 'Db': 'Reb', 'Eb': 'Mib', 'Gb': 'Solb', 'Ab': 'Lab', 'Bb': 'Sib',
};
function getLabel(note: string | undefined, mode: number): string | undefined {
  if (!note || mode === 0) return undefined;
  const base = note.replace(/\d+$/, '');
  if (mode === 1) return base;
  return ABC_TO_SOL[base] ?? base;
}

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

// ── Layout constants (static — do not depend on screen size) ──────────────────
const BODY_PAD     = 12;
const INNER_PAD    = 18;
const COL_GAP      = 10;
const PORT_COL_GAP   = 5;
const PORT_INNER_PAD = 10;
const HEADER_H     = 56;

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
const BASS_L  = [1, 2, 11, 4, 5, 6];
const BASS_R  = [7, 8, 9, 10, 3, 12];

type BtnColor = 'white' | 'yellow' | 'blue';
const BLANK: Record<number, BtnColor> = {};
for (let k = 0; k < 43; k++) BLANK[k] = 'white';

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AccordionScreen({ navigation, route }: any) {
  const { songId, songName: routeSongName } = (route?.params ?? {}) as { songId?: string; songName?: string };
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  // ── Screen-size-dependent layout values (recomputed on every resize/rotation) ──
  const CONTENT_W    = SCREEN_W - NAV_RAIL_W;
  const BTN_D        = Math.min(44, Math.floor((CONTENT_W - BODY_PAD * 2 - INNER_PAD * 2 - COL_GAP * 2) / 3));
  const BASS_D       = Math.min(44, Math.floor((CONTENT_W - BODY_PAD * 2 - INNER_PAD * 2 - COL_GAP) / 2));
  const PORT_BTN_D   = Math.min(40, Math.floor((CONTENT_W * 0.528 - PORT_INNER_PAD * 2 - PORT_COL_GAP * 2) / 3));
  const PORT_TREBLE_W = PORT_BTN_D * 3 + PORT_COL_GAP * 2 + PORT_INNER_PAD * 2 + 4;
  const AVAIL_H      = SCREEN_H - HEADER_H;
  const CTRL_W       = CONTENT_W - PORT_TREBLE_W - 24;

  const { songData, loading: partsLoading, error: partsError } = useSongParts(songId);
  const activeNotesRef    = useRef<string[]>(songId ? [] : DEMO_NOTES);
  const activeSectionsRef = useRef<typeof DEMO_SECTIONS>(songId ? [] : DEMO_SECTIONS);
  const [activeSections, setActiveSections] = useState<typeof DEMO_SECTIONS>(songId ? [] : DEMO_SECTIONS);

  const [ctrlH, setCtrlH] = useState(AVAIL_H);
  const [bellowOpen, setBellowOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [speed, setSpeed] = useState(DEMO_SPEED_MS);
  const [audioReady, setAudioReady] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [noteLabelMode, setNoteLabelMode] = useState(1); // 0=none, 1=show labels
  const [manualHighlight, setManualHighlight] = useState<Record<number, BtnColor>>({});
  const sectionIdxRef = useRef(0);

  // ── Loop range markers ────────────────────────────────────────────────────────
  const _s0len = songId ? 0 : DEMO_SECTIONS[0].end - DEMO_SECTIONS[0].start;
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd,   setLoopEnd]   = useState(_s0len);
  const loopStartRef  = useRef(0);
  const loopEndRef    = useRef(_s0len);
  const barWidthRef   = useRef(200);
  const startBaseRef  = useRef(0);
  const endBaseRef    = useRef(_s0len);

  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { startBaseRef.current = loopStartRef.current; },
      onPanResponderMove: (_, g) => {
        const sec = activeSectionsRef.current[sectionIdxRef.current];
        const sl  = sec.end - sec.start;
        // rotate(-90deg) CCW: local +x → screen -y; so upward drag = increasing position
        const delta = Math.round(-g.dy / barWidthRef.current * sl);
        const v = Math.max(0, Math.min(loopEndRef.current - 1, startBaseRef.current + delta));
        loopStartRef.current = v;
        setLoopStart(v);
      },
    })
  ).current;

  const endPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { endBaseRef.current = loopEndRef.current; },
      onPanResponderMove: (_, g) => {
        const sec = activeSectionsRef.current[sectionIdxRef.current];
        const sl  = sec.end - sec.start;
        const delta = Math.round(-g.dy / barWidthRef.current * sl);
        const v = Math.max(loopStartRef.current + 1, Math.min(sl, endBaseRef.current + delta));
        loopEndRef.current = v;
        setLoopEnd(v);
      },
    })
  ).current;

  const countRef    = useRef(0);
  const speedRef    = useRef(DEMO_SPEED_MS);
  const playSession = useRef(0);

  // ── Lookahead scheduler refs ────────────────────────────────────────────────
  const schedulerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextAudioTime  = useRef(0);
  const nextStepIdx    = useRef(0);
  const LOOKAHEAD_SEC  = 0.5;
  const SCHEDULE_INTERVAL = 100;

  // Visual timers — setTimeout handles both step highlights and shadow resets.
  const activeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // ── Animated button colors (UI thread — no React re-render per color change) ──
  // Index 0-30 = treble buttons, 31-42 = bass (30 + value).
  const btnAnimsRef = useRef(
    Array.from({ length: 43 }, () => ({
      yellow: new Animated.Value(0),
      blue:   new Animated.Value(0),
    }))
  );
  const btnCurrentColors = useRef<BtnColor[]>(Array(43).fill('white'));

  const applyAnimColor = useCallback((idx: number, color: BtnColor) => {
    if (idx < 0 || idx >= 43) return;
    if (btnCurrentColors.current[idx] === color) return;
    btnCurrentColors.current[idx] = color;
    const anim = btnAnimsRef.current[idx];
    anim.yellow.setValue(color === 'yellow' ? 1 : 0);
    anim.blue.setValue(color === 'blue'     ? 1 : 0);
  }, []);

  const applyAnimColors = useCallback((colorMap: Record<number, BtnColor>) => {
    for (let k = 0; k < 43; k++) applyAnimColor(k, colorMap[k] ?? 'white');
  }, [applyAnimColor]);

  const resetAllAnims = useCallback(() => {
    for (let k = 0; k < 43; k++) applyAnimColor(k, 'white');
  }, [applyAnimColor]);

  useEffect(() => {
    initAudio().then(() => setAudioReady(true));
  }, []);

  useEffect(() => {
    if (!songData) return;
    activeNotesRef.current    = songData.notes;
    activeSectionsRef.current = songData.sections;
    setActiveSections(songData.sections);
    setSpeed(songData.speedMs);
    speedRef.current = songData.speedMs;
    // Reset playback
    playSession.current++;
    if (schedulerRef.current !== null) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    for (const t of activeTimers.current) clearTimeout(t);
    activeTimers.current = [];
    cancelAllScheduled();
    stopActiveTreble();
    setIsPlaying(false);
    setManualHighlight({});
    for (let k = 0; k < 43; k++) applyAnimColor(k, 'white');
    sectionIdxRef.current = 0;
    setSectionIdx(0);
    countRef.current = 0;
    setCount(0);
    nextStepIdx.current = 0;
    if (songData.sections.length > 0) {
      const s0len = songData.sections[0].end - songData.sections[0].start;
      loopStartRef.current = 0;
      loopEndRef.current   = s0len;
      setLoopStart(0);
      setLoopEnd(s0len);
    }
  }, [songData, applyAnimColor]);

  // ── Lookahead step scheduler ──────────────────────────────────────────────────
  // Audio: pre-scheduled on the audio clock (runs on native audio thread).
  // Visual: setTimeout fired at (stepTimeSec + outputLatency - audioNow) ms from now,
  //   which corresponds to the exact wall-clock moment the sound reaches the speakers.
  //   setTimeout fires once — no RAF polling, no JS thread 60fps overhead.
  const scheduleStepAt = useCallback((stepStr: string, stepTimeSec: number, displayIdx: number, session: number) => {
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
    const trebleDurSec   = stepDurationMs / 1000;
    const shadowTime     = Math.min(600, Math.max(80, stepDurationMs * 0.5));

    // Audio: pre-scheduled on the native audio thread.
    for (const key of trebleSet) scheduleTrebleAt(key, stepTimeSec, trebleDurSec);
    if (bassNote)  scheduleBassAt(bassNote,   stepTimeSec, (bassDurMs  ?? 1500) / 1000);
    if (chordFile) scheduleChordAt(chordFile, stepTimeSec, (chordDurMs ?? 1500) / 1000);

    // Visual: setTimeout fires at the wall-clock moment the sound reaches the speakers.
    // outputLatency converts "audio scheduled time" → "time sound is heard".
    const outputLatencySec = getAudioOutputLatencyMs() / 1000;
    const msUntilVisual = Math.max(0, (stepTimeSec + outputLatencySec - getAudioCurrentTime()) * 1000);

    activeTimers.current.push(setTimeout(() => {
      if (playSession.current !== session) return;
      countRef.current = displayIdx;
      setCount(displayIdx);
      applyAnimColors(newColors);

      activeTimers.current.push(setTimeout(() => {
        if (playSession.current === session)
          for (let k = 0; k < 43; k++) { if (!delayedIndices.has(k)) applyAnimColor(k, 'white'); }
      }, shadowTime));

      for (const { delayMs, btnIdx, color } of delayedVisuals) {
        activeTimers.current.push(setTimeout(() => { if (playSession.current === session) applyAnimColor(btnIdx, color); }, delayMs));
        activeTimers.current.push(setTimeout(() => { if (playSession.current === session) applyAnimColor(btnIdx, 'white'); }, delayMs + shadowTime));
      }
    }, msUntilVisual));

    nextAudioTime.current = stepTimeSec + stepDurationMs / 1000;
    nextStepIdx.current++;
  }, [applyAnimColor, applyAnimColors]);

  const scheduleLoop = useCallback((session: number) => {
    sweepEndedSources();
    const lookaheadEnd = getAudioCurrentTime() + LOOKAHEAD_SEC;
    while (nextAudioTime.current < lookaheadEnd) {
      const sec      = activeSectionsRef.current[sectionIdxRef.current];
      const rStart   = loopStartRef.current;
      const rEnd     = loopEndRef.current;
      const rangeLen = rEnd - rStart;
      if (rangeLen <= 0) break;
      const offset = nextStepIdx.current % rangeLen;
      const local  = rStart + offset;
      scheduleStepAt(activeNotesRef.current[sec.start + local], nextAudioTime.current, local, session);
    }
  }, [scheduleStepAt]);

  // ── Manual button press ──────────────────────────────────────────────────────
  const onPressBtn = useCallback((btnIdx: number) => {
    const pitoKey = bellowOpen ? PITO_KEY[btnIdx]?.open : PITO_KEY[btnIdx]?.close;
    if (pitoKey) playTrebleKey(pitoKey);
    const c: BtnColor = bellowOpen ? 'yellow' : 'blue';
    applyAnimColor(btnIdx, c);
    setTimeout(() => applyAnimColor(btnIdx, 'white'), 350);
  }, [bellowOpen, applyAnimColor]);

  const onPressBass = useCallback((value: number) => {
    const lbl  = BASS_LABELS[value];
    const note = bellowOpen ? lbl?.open : lbl?.close;
    if (note) playNote(note);
    const c: BtnColor = bellowOpen ? 'yellow' : 'blue';
    applyAnimColor(30 + value, c);
    setTimeout(() => applyAnimColor(30 + value, 'white'), 350);
  }, [bellowOpen, applyAnimColor]);

  // ── startPlay / stopPlay / resetSong ─────────────────────────────────────────
  const startPlay = useCallback(() => {
    if (isPlaying || !audioReady) return;
    const session = ++playSession.current;

    const rStart = loopStartRef.current;
    const rEnd   = loopEndRef.current;
    const clamped = Math.max(rStart, Math.min(rEnd - 1, countRef.current));
    nextAudioTime.current = getAudioCurrentTime() + 0.05;
    nextStepIdx.current   = clamped - rStart;

    stopActiveTreble();
    setManualHighlight({});
    setIsPlaying(true);
    scheduleLoop(session);
    schedulerRef.current = setInterval(() => scheduleLoop(session), SCHEDULE_INTERVAL);
  }, [isPlaying, audioReady, scheduleLoop]);

  const stopPlay = useCallback(() => {
    playSession.current++;
    if (schedulerRef.current !== null) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    for (const t of activeTimers.current) clearTimeout(t);
    activeTimers.current = [];
    cancelAllScheduled();
    stopActiveTreble();
    setIsPlaying(false);
    setManualHighlight({});
    resetAllAnims();
  }, [resetAllAnims]);

  const resetSong = useCallback(() => {
    playSession.current++;
    if (schedulerRef.current !== null) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    for (const t of activeTimers.current) clearTimeout(t);
    activeTimers.current = [];
    cancelAllScheduled();
    stopActiveTreble();
    setIsPlaying(false);
    setManualHighlight({});
    resetAllAnims();
    countRef.current = 0;
    setCount(0);
  }, [resetAllAnims]);

  const adjustSpeed = (delta: number) => {
    const s = Math.max(100, Math.min(1200, speed + delta));
    setSpeed(s);
    speedRef.current = s;
  };

  const changeSection = useCallback((newIdx: number) => {
    if (isPlaying) {
      playSession.current++;
      if (schedulerRef.current !== null) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
      for (const t of activeTimers.current) clearTimeout(t);
      activeTimers.current = [];
      cancelAllScheduled();
      stopActiveTreble();
      setIsPlaying(false);
      setManualHighlight({});
      resetAllAnims();
    }
    sectionIdxRef.current = newIdx;
    setSectionIdx(newIdx);
    countRef.current = 0;
    setCount(0);
    nextStepIdx.current = 0;
    const newLen = activeSectionsRef.current[newIdx].end - activeSectionsRef.current[newIdx].start;
    loopStartRef.current = 0;
    loopEndRef.current   = newLen;
    setLoopStart(0);
    setLoopEnd(newLen);
  }, [isPlaying, resetAllAnims]);

  // Plays a single step immediately (for ⏮ ⏭ manual navigation).
  // Matches web step(i, false): treble rings until next step; bass/chord use speedRef for duration.
  const playManualStep = useCallback((stepStr: string, displayIdx: number) => {
    const tokens = stepStr.trim().split(' ');
    const newColors: Record<number, BtnColor> = { ...BLANK };
    const t0 = getAudioCurrentTime() + 0.02;

    for (let j = 0; j < tokens.length - 1; j++) {
      const tok      = tokens[j];
      const body     = tok.split('@')[0];
      const colonIdx = body.indexOf(':');
      const key      = colonIdx >= 0 ? body.slice(0, colonIdx) : body;
      const durU     = colonIdx >= 0 ? parseInt(body.slice(colonIdx + 1)) : undefined;
      // Bass/chord duration matches web: (durUnits / 6) * speed, default 1500ms
      const kDurMs   = durU !== undefined
        ? Math.min(1500, Math.max(50, (durU / 6) * speedRef.current))
        : 1500;

      if (key.startsWith('abc')) {
        const m = key.match(/abc_?(\d+)/);
        if (m) {
          const c = ACID_CHORD[parseInt(m[1])];
          if (c) { scheduleChordAt(c.chordFile, t0, kDurMs / 1000); newColors[30 + c.value] = parseInt(m[1]) % 2 === 0 ? 'blue' : 'yellow'; }
        }
      } else if (key.startsWith('abn')) {
        const entry = BASS_NOTE_KEY[key];
        if (entry) { scheduleBassAt(entry.note, t0, kDurMs / 1000); newColors[30 + entry.value] = 'blue'; }
      } else if (isTrebleKey(key)) {
        // Treble rings indefinitely until next step (web: playTrebleNote without duration, stopped by stopActiveTrebleNotes at next step)
        playTrebleKeyManual(key);
        const btnIdx = KEY_TO_BTN[key];
        if (btnIdx !== undefined) newColors[btnIdx] = KEY_DIR[key] === 'open' ? 'yellow' : 'blue';
      }
    }

    // Build highlight map with only non-white entries (React state — persists across re-renders like web's colorBoton)
    const highlight: Record<number, BtnColor> = {};
    for (const [k, v] of Object.entries(newColors)) {
      if (v !== 'white') highlight[Number(k)] = v;
    }
    // resetAllAnims clears any stuck animated highlights; state replaces old position with new atomically
    resetAllAnims();
    countRef.current = displayIdx;
    setCount(displayIdx);
    setManualHighlight(highlight);
  }, [resetAllAnims]);

  const stepPrev = useCallback(() => {
    if (isPlaying) return;
    const rStart = loopStartRef.current;
    const idx    = Math.max(rStart, countRef.current - 1);
    countRef.current = idx;
    nextStepIdx.current = idx - rStart;
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    playManualStep(activeNotesRef.current[sec.start + idx], idx);
  }, [isPlaying, playManualStep]);

  const stepNext = useCallback(() => {
    if (isPlaying) return;
    const rEnd = loopEndRef.current;
    const idx  = Math.min(rEnd - 1, countRef.current + 1);
    countRef.current = idx;
    nextStepIdx.current = idx - loopStartRef.current;
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    playManualStep(activeNotesRef.current[sec.start + idx], idx);
  }, [isPlaying, playManualStep]);

  // ── Render treble button ──────────────────────────────────────────────────────
  // Color overlays run on the native UI thread via Animated — no React re-render.
  const renderPito = (idx: number, btnSize = BTN_D) => {
    const { yellow, blue } = btnAnimsRef.current[idx];
    const lbl = TREBLE_LABELS[idx];
    return (
      <TouchableOpacity
        key={idx}
        onPress={() => onPressBtn(idx)}
        activeOpacity={0.7}
        style={[s.btn, {
          width: btnSize, height: btnSize, borderRadius: btnSize / 2,
          backgroundColor: T.btnWhite.bg, borderColor: T.btnWhite.border,
          overflow: 'hidden',
        }]}
      >
        <Animated.View style={[s.btnOverlay, { backgroundColor: T.btnYellow.bg, opacity: yellow }]} />
        <Animated.View style={[s.btnOverlay, { backgroundColor: T.btnBlue.bg,   opacity: blue   }]} />
        {manualHighlight[idx] && (
          <View style={[s.btnOverlay, { backgroundColor: manualHighlight[idx] === 'yellow' ? T.btnYellow.bg : T.btnBlue.bg }]} pointerEvents="none" />
        )}
        {noteLabelMode > 0 && (() => {
          const fs = Math.max(8, Math.round(btnSize * 0.28));
          const pitoKey = PITO_KEY[idx];
          const lo = noteLabelMode === 3 ? pitoKey?.open  : getLabel(lbl?.open,  noteLabelMode);
          const lc = noteLabelMode === 3 ? pitoKey?.close : getLabel(lbl?.close, noteLabelMode);
          if (!lo && !lc) return null;
          return (
            <View style={s.lblWrap} pointerEvents="none">
              {lo && <Text style={[s.lbl, { color: T.labelOpen,  fontSize: fs, lineHeight: fs + 2 }]}>{lo}</Text>}
              {lc && <Text style={[s.lbl, { color: T.labelClose, fontSize: fs, lineHeight: fs + 2 }]}>{lc}</Text>}
            </View>
          );
        })()}
      </TouchableOpacity>
    );
  };

  // ── Render bass button ────────────────────────────────────────────────────────
  const renderBass = (value: number) => {
    const { yellow, blue } = btnAnimsRef.current[30 + value];
    const lbl = BASS_LABELS[value];
    return (
      <TouchableOpacity
        key={value}
        onPress={() => onPressBass(value)}
        activeOpacity={0.7}
        style={[s.btn, {
          width: BASS_D, height: BASS_D, borderRadius: BASS_D / 2,
          backgroundColor: T.btnWhite.bg, borderColor: T.btnWhite.border,
          overflow: 'hidden',
        }]}
      >
        <Animated.View style={[s.btnOverlay, { backgroundColor: T.btnYellow.bg, opacity: yellow }]} />
        <Animated.View style={[s.btnOverlay, { backgroundColor: T.btnBlue.bg,   opacity: blue   }]} />
        {manualHighlight[30 + value] && (
          <View style={[s.btnOverlay, { backgroundColor: manualHighlight[30 + value] === 'yellow' ? T.btnYellow.bg : T.btnBlue.bg }]} pointerEvents="none" />
        )}
        {lbl && (
          <View style={s.lblWrap} pointerEvents="none">
            <Text style={[s.lbl, { color: T.labelOpen,  fontSize: 7 }]}>{lbl.open}</Text>
            <Text style={[s.lbl, { color: T.labelClose, fontSize: 7 }]}>{lbl.close}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const currentSec = activeSections[sectionIdx] ?? activeSections[0];
  const secLen = currentSec ? currentSec.end - currentSec.start : 0;
  const pct = secLen > 0 ? count / secLen : 0;

  return (
    <ScreenLayout navigation={navigation} activeKey="Accordion" contentStyle={{ backgroundColor: '#f9fafb' }}>

      {/* ── Título de la canción ── */}
      <View style={s.titleBar}>
        <Text style={s.titleTxt} numberOfLines={1}>{routeSongName ?? DEMO_NAME}</Text>
      </View>

      {/* Error loading song parts */}
      {partsError && !partsLoading && (
        <View style={s.errorBar}>
          <Text style={s.errorTxt}>⚠ {partsError}</Text>
        </View>
      )}

      {/* Loading overlay while fetching song parts */}
      {partsLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={s.loadingTxt}>Cargando canción...</Text>
        </View>
      )}

      {/* ── Portrait: teclado izquierda + controles derecha (web portrait) ── */}
      <View style={[s.main, (partsLoading || (!songData && !!songId)) && { opacity: 0.3 }]}>

        {/* ── IZQUIERDA: Teclado treble compacto ─────────────────────────── */}
        <LinearGradient colors={T.trebleGrad} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[s.trebleBody, { width: PORT_TREBLE_W }]}>
          {/* Fuelles — rayas verticales cada 30px */}
          {([28, 58, 88, 118] as const).map(l => (
            <React.Fragment key={l}>
              <View style={[s.foldDark,  { left: l }]} pointerEvents="none" />
              <View style={[s.foldLight, { left: l + 2 }]} pointerEvents="none" />
            </React.Fragment>
          ))}
          {/* Grille superior e inferior con gradiente */}
          <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={s.grillTop} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={s.grillBot} pointerEvents="none" />
          {/* Brillo superior */}
          <LinearGradient colors={['rgba(255,255,255,0.10)', 'transparent']} style={s.sheen} pointerEvents="none" />
          <View style={s.colsRow}>
            {([{ label: 'I', btns: COL_I }, { label: 'II', btns: COL_II }, { label: 'III', btns: COL_III }] as const).map(col => (
              <View key={col.label} style={[s.col, { width: PORT_BTN_D }]}>
                <Text style={s.colHdr}>{col.label}</Text>
                {col.btns.map(i => renderPito(i, PORT_BTN_D))}
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── DERECHA: Panel de controles, rotado -90° (igual que web portrait) ── */}
        <View style={s.ctrlContainer} onLayout={(e) => setCtrlH(e.nativeEvent.layout.height)}>
          <View style={[s.ctrlInner, {
            width: ctrlH, height: CTRL_W,
            top:  (ctrlH - CTRL_W) / 2,
            left: (CTRL_W - ctrlH) / 2,
            transform: [{ rotate: '-90deg' }],
          }]}>

            {/* Fila 1: Sección + Reproducción + Velocidad */}
            <View style={s.ctrlRow}>
              {/* Navegación de secciones */}
              <TouchableOpacity
                style={[s.btnSecNav, sectionIdx === 0 && s.btnSecNavDisabled]}
                onPress={() => changeSection(sectionIdx - 1)}
                disabled={sectionIdx === 0}
                activeOpacity={0.7}
              >
                <Text style={[s.btnSecNavTxt, sectionIdx === 0 && s.btnSecNavTxtDis]}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sectionSelect} onPress={() => setShowSectionPicker(true)} activeOpacity={0.8} disabled={!currentSec}>
                <Text style={s.sectionSelectTxt} numberOfLines={1}>{currentSec?.name ?? '—'}</Text>
                <Text style={s.sectionSelectChevron}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSecNav, sectionIdx === activeSections.length - 1 && s.btnSecNavDisabled]}
                onPress={() => changeSection(sectionIdx + 1)}
                disabled={sectionIdx === activeSections.length - 1}
                activeOpacity={0.7}
              >
                <Text style={[s.btnSecNavTxt, sectionIdx === activeSections.length - 1 && s.btnSecNavTxtDis]}>▶</Text>
              </TouchableOpacity>

              <View style={s.vertDivider} />

              {/* Reproducción */}
              <View style={s.playbackGroup}>
                <TouchableOpacity style={[s.btnBlue, isPlaying && s.btnGray]} onPress={stepPrev} disabled={isPlaying} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>⏮</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPlayLg, s.btnPlayGo, (isPlaying || !audioReady) && s.btnGray]}
                  onPress={startPlay} disabled={isPlaying || !audioReady} activeOpacity={0.8}
                >
                  <Text style={s.btnPlayTxt}>▶</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPlayLg, s.btnPlayStop]}
                  onPress={stopPlay} disabled={!isPlaying} activeOpacity={0.8}
                >
                  <Text style={s.btnPlayTxt}>■</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnBlue, isPlaying && s.btnGray]} onPress={stepNext} disabled={isPlaying} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>⏭</Text>
                </TouchableOpacity>
              </View>

              <View style={s.vertDivider} />

              {/* Velocidad */}
              <View style={s.playbackGroup}>
                <TouchableOpacity style={s.btnRed} onPress={() => adjustSpeed(50)} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>−</Text>
                </TouchableOpacity>
                <View style={s.speedCenter}>
                  <Text style={s.speedVal}>{speed}ms</Text>
                  <Text style={s.speedLbl}>{speed <= 150 ? 'rápido' : speed <= 300 ? 'normal' : 'lento'}</Text>
                </View>
                <TouchableOpacity style={s.btnGreen} onPress={() => adjustSpeed(-50)} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Fila 2: Leyendas + Fuelle + Reset + Barra de progreso */}
            <View style={s.ctrlRow2}>
              <TouchableOpacity
                style={[s.btnReset, noteLabelMode > 0 && s.btnNoteActive]}
                onPress={() => setNoteLabelMode(m => (m + 1) % 4)}
                activeOpacity={0.8}
              >
                <Text style={[s.btnResetTxt, noteLabelMode > 0 && { color: '#4f46e5' }]}>🎵</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bellowBtn, bellowOpen && s.bellowOpenActive]} onPress={() => setBellowOpen(true)} activeOpacity={0.8}>
                <Text style={[s.bellowTxt, { color: bellowOpen ? '#78350f' : '#6b7280' }]}>↔</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bellowBtn, !bellowOpen && s.bellowCloseActive]} onPress={() => setBellowOpen(false)} activeOpacity={0.8}>
                <Text style={[s.bellowTxt, { color: !bellowOpen ? '#1e3a8a' : '#6b7280' }]}>↕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnReset} onPress={resetSong} activeOpacity={0.8}>
                <Text style={s.btnResetTxt}>↺</Text>
              </TouchableOpacity>
              <View
                style={s.progressTrack}
                onLayout={e => { barWidthRef.current = e.nativeEvent.layout.width; }}
              >
                {/* Rango activo (naranja) */}
                <View style={[s.loopRange, {
                  left:  `${(loopStart / secLen) * 100}%` as any,
                  right: `${((secLen - loopEnd) / secLen) * 100}%` as any,
                }]} />
                {/* Relleno de progreso — arranca en loopStart, crece hasta count */}
                <View style={[s.progressDone, {
                  left:  `${(loopStart / secLen) * 100}%` as any,
                  width: `${(Math.max(0, count - loopStart) / secLen) * 100}%` as any,
                }]} />
                {/* Contador centrado */}
                <Text style={s.counter}>{count}/{secLen}</Text>
                {/* Marcador inicio — bloque sólido naranja con esquinas izquierdas redondeadas */}
                <View
                  style={[s.markerStartHandle, { left: `${(loopStart / secLen) * 100}%` as any }]}
                  {...startPan.panHandlers}
                >
                  <View style={s.markerBlockStart}>
                    <Text style={s.markerLbl}>{loopStart}</Text>
                    <Text style={s.markerSymbol}>⌐</Text>
                  </View>
                </View>
                {/* Marcador fin — bloque sólido naranja con esquinas derechas redondeadas */}
                <View
                  style={[s.markerEndHandle, { left: `${(loopEnd / secLen) * 100}%` as any }]}
                  {...endPan.panHandlers}
                >
                  <View style={s.markerBlockEnd}>
                    <Text style={s.markerLbl}>{loopEnd}</Text>
                    <Text style={s.markerSymbol}>¬</Text>
                  </View>
                </View>
              </View>
            </View>

          </View>
        </View>

      </View>

      {/* Modal selector de sección */}
      <Modal visible={showSectionPicker} transparent animationType="fade" onRequestClose={() => setShowSectionPicker(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowSectionPicker(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Seleccionar sección</Text>
            {activeSections.map((sec, i) => (
              <TouchableOpacity
                key={sec.id}
                style={[s.modalItem, i === sectionIdx && s.modalItemActive]}
                onPress={() => { changeSection(i); setShowSectionPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[s.modalItemTxt, i === sectionIdx && s.modalItemActiveTxt]}>{sec.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </ScreenLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Título
  titleBar: { paddingHorizontal: 14, paddingVertical: 10 },
  titleTxt:  { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: 0.3 },

  // Layout portrait
  main: { flex: 1, flexDirection: 'row', padding: 8, gap: 8 },

  // ── Teclado treble (izquierda, gradiente oscuro del instrumento) ──────────
  trebleBody: {
    borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: PORT_INNER_PAD,
    overflow: 'hidden', alignSelf: 'center',
    borderWidth: 2, borderColor: '#3a0000',
    shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 16,
  },
  grillTop:  { position: 'absolute', top: 0, left: 0, right: 0, height: 18, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  grillBot:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  sheen:     { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  foldDark:  { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(0,0,0,0.22)' },
  foldLight: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.04)' },
  colsRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: PORT_COL_GAP },
  col:       { alignItems: 'center', gap: 4 },
  colHdr:    { fontSize: 9, fontWeight: '600', letterSpacing: 1, color: 'rgba(255,200,150,0.75)', marginBottom: 3, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // Botones del teclado treble
  btn:        { borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 1 } },
  btnOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  lblWrap:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  lbl:        { fontWeight: '700', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // ── Panel de controles rotado -90° (derecha, igual que web portrait) ─────
  ctrlContainer: {
    flex: 1, overflow: 'hidden',
  },
  ctrlInner: {
    position: 'absolute',
    flexDirection: 'column', justifyContent: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  ctrlRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playbackGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ctrlRow2: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vertDivider:   { width: 1, height: 32, backgroundColor: '#e5e7eb', marginHorizontal: 2 },
  // Botones de navegación de sección — idénticos a la web (p-1.5 rounded-lg bg-gray-200)
  btnSecNav:         { paddingHorizontal: 6, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  btnSecNavDisabled: { opacity: 0.5, borderWidth: 1, borderColor: '#d1d5db' },
  btnSecNavTxt:      { fontSize: 13, color: '#374151', fontWeight: '600' },
  btnSecNavTxtDis:   { color: '#9ca3af' },

  // Selector de sección (dropdown)
  sectionSelect:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', minWidth: 90, maxWidth: 140, gap: 3 },
  sectionSelectTxt:     { fontSize: 11, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  sectionSelectChevron: { fontSize: 10, color: '#6b7280' },

  // Fuelle
  bellowBtn:       { width: 40, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  bellowOpenActive:  { backgroundColor: '#facc15', borderColor: '#d97706' },
  bellowCloseActive: { backgroundColor: '#60a5fa', borderColor: '#3b82f6' },
  bellowTxt:       { fontSize: 16, fontWeight: '700' },

  // Botones de velocidad y navegación (32px)
  btnGreen:  { width: 32, height: 32, borderRadius: 8, backgroundColor: '#16a34a', borderWidth: 1, borderColor: '#15803d', justifyContent: 'center', alignItems: 'center' },
  btnRed:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#dc2626', borderWidth: 1, borderColor: '#b91c1c', justifyContent: 'center', alignItems: 'center' },
  btnBlue:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#2563eb', borderWidth: 1, borderColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center' },
  btnGray:   { backgroundColor: '#d1d5db', borderColor: '#9ca3af' },
  btnTxt:    { fontSize: 15, color: '#fff', fontWeight: '700' },

  // Velocidad
  speedCenter: { alignItems: 'center', minWidth: 52 },
  speedVal:    { fontSize: 12, fontWeight: '700', color: '#111827' },
  speedLbl:    { fontSize: 9, color: '#6b7280' },

  // Play / Stop (36px rectangular, como web)
  btnPlayLg:   { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  btnPlayGo:   { backgroundColor: '#16a34a', borderWidth: 1.5, borderColor: '#15803d' },
  btnPlayStop: { backgroundColor: '#dc2626', borderWidth: 1.5, borderColor: '#b91c1c' },
  btnPlayTxt:  { fontSize: 18, color: '#fff' },

  // Reiniciar / Leyendas
  btnReset:      { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  btnResetTxt:   { fontSize: 16, color: '#4b5563' },
  btnNoteActive: { backgroundColor: '#ede9fe', borderColor: '#a78bfa' },

  // Progreso
  progressTrack: { flex: 1, height: 26, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'visible' },
  loopRange:     { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(249,115,22,0.22)', borderRadius: 3 },
  progressDone:  { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#3b82f6', borderRadius: 4 },
  counter:       { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, textAlign: 'center', textAlignVertical: 'center', fontSize: 9, color: '#374151', fontWeight: '700' },
  // Marcadores — bloques sólidos naranja como en la web (w-5 h-9 bg-orange-500)
  markerStartHandle: { position: 'absolute', top: -3, bottom: -3, width: 24, zIndex: 10 },
  markerEndHandle:   { position: 'absolute', top: -3, bottom: -3, width: 24, marginLeft: -24, zIndex: 10 },
  markerBlockStart:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, backgroundColor: '#f97316', borderTopLeftRadius: 3, borderBottomLeftRadius: 3, alignItems: 'center', justifyContent: 'center' },
  markerBlockEnd:    { position: 'absolute', right: 0, top: 0, bottom: 0, width: 16, backgroundColor: '#f97316', borderTopRightRadius: 3, borderBottomRightRadius: 3, alignItems: 'center', justifyContent: 'center' },
  markerLbl:         { fontSize: 6, color: '#fff', fontWeight: '800', lineHeight: 7, marginBottom: 1 },
  markerSymbol:      { fontSize: 10, color: '#fff', fontWeight: '900', lineHeight: 11 },

  // Loading / error
  loadingOverlay: { position: 'absolute', top: 56, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:     { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  errorBar:       { marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  errorTxt:       { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  // Modal selector de sección
  modalBackdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard:         { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, minWidth: 180, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  modalTitle:        { fontSize: 12, fontWeight: '700', color: '#6b7280', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 4 },
  modalItem:         { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 4 },
  modalItemActive:   { backgroundColor: '#eff6ff' },
  modalItemTxt:      { fontSize: 15, color: '#111827', fontWeight: '500' },
  modalItemActiveTxt:{ color: '#2563eb', fontWeight: '700' },
});
