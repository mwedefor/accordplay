import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, PanResponder, ActivityIndicator, Dimensions,
} from 'react-native';
import {
  initAudio, schedulePianoAt, cancelAllScheduled,
  sweepEndedSources, getAudioCurrentTime, getAudioOutputLatencyMs,
  playPianoNote, playPianoNoteManual, stopActivePiano,
} from '../components/pianoAudio';
import ScreenLayout from '../components/ScreenLayout';
import { NAV_RAIL_W } from '../components/NavRail';
import { DEMO_NOTES, DEMO_NAME, DEMO_SPEED_MS, DEMO_DATA } from '../data/pianoDemo';
import { useSongParts } from '../hooks/useSongParts';

// ── Piano step parser ─────────────────────────────────────────────────────────
function parsePianoStep(step: string): { noteCodes: string[]; durationUnits: number } {
  const tokens = step.trim().split(/\s+/);
  const durationUnits = Math.max(3, parseInt(tokens[tokens.length - 1]) || 6);
  const noteCodes = tokens.slice(0, -1)
    .filter(t => t.startsWith('p'))
    .map(t => t.includes(':') ? t.split(':')[0] : t);
  return { noteCodes, durationUnits };
}

// Normalize note code to canonical flat key id used in keyboard layout
// e.g. pFs5 → Gb5, pCs5 → Db5, pDs4 → Eb4
const SHARP_TO_FLAT: Record<string, [string, number]> = {
  'As': ['Bb',  0], 'Bs': ['C',   1],
  'Cs': ['Db',  0], 'Ds': ['Eb',  0],
  'Es': ['F',   0], 'Fs': ['Gb',  0],
  'Gs': ['Ab',  0],
};
const FLAT_ADJ: Record<string, [string, number]> = {
  'Cb': ['B', -1], 'Fb': ['E', 0],
};
function codeToKey(code: string): string {
  const body  = code.slice(1);
  const match = body.match(/^([A-G][bs]?)(\d+)$/);
  if (!match) return body;
  let [, note, octStr] = match;
  let oct = parseInt(octStr);
  if (note in SHARP_TO_FLAT) {
    const [n, d] = SHARP_TO_FLAT[note];
    note = n; oct += d;
  } else if (note in FLAT_ADJ) {
    const [n, d] = FLAT_ADJ[note];
    note = n; oct += d;
  }
  return `${note}${oct}`;
}

// ── Piano keyboard definition — C1 to C8 (7 octaves, standard piano range) ───
const W_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const B_NOTES: [string, number][] = [
  ['Db', 0], ['Eb', 1], ['Gb', 3], ['Ab', 4], ['Bb', 5],
];
const OCTAVES = [1, 2, 3, 4, 5, 6, 7];

type KeyDef = { id: string; octave: number; isBlack: boolean; wOffset: number; bAfterW?: number };
const KEY_DEFS: KeyDef[] = [];
let totalWhites = 0;
// A0, Bb0, B0 — the 3 keys before C1 on a standard 88-key piano
KEY_DEFS.push({ id: 'A0',  octave: 0, isBlack: false, wOffset: 0 });
KEY_DEFS.push({ id: 'Bb0', octave: 0, isBlack: true,  wOffset: 0, bAfterW: 0 });
KEY_DEFS.push({ id: 'B0',  octave: 0, isBlack: false, wOffset: 1 });
totalWhites = 2;
for (const oct of OCTAVES) {
  const octStart = totalWhites;
  for (let wi = 0; wi < 7; wi++) {
    KEY_DEFS.push({ id: `${W_NOTES[wi]}${oct}`, octave: oct, isBlack: false, wOffset: octStart + wi });
  }
  for (const [bNote, afterW] of B_NOTES) {
    KEY_DEFS.push({ id: `${bNote}${oct}`, octave: oct, isBlack: true, wOffset: 0, bAfterW: octStart + afterW });
  }
  totalWhites += 7;
}
// Add top C8
KEY_DEFS.push({ id: 'C8', octave: 8, isBlack: false, wOffset: totalWhites });
totalWhites += 1; // totalWhites = 52

const KEY_BORDER = 1;


export default function PianoScreen({ navigation, route }: any) {
  const { songId, songName: routeSongName } = (route?.params ?? {}) as { songId?: string; songName?: string };
  const SCREEN_W   = Dimensions.get('window').width;
  const CONTENT_W  = SCREEN_W - NAV_RAIL_W;
  const W_KEY_H    = Math.round(CONTENT_W * 0.40);  // key depth scales with screen width
  const B_KEY_H    = Math.round(W_KEY_H * 0.65);
  const KB_COL_W   = W_KEY_H + 8;
  const CTRL_COL_W = CONTENT_W - KB_COL_W;

  const [ctrlH, setCtrlH] = useState(0);

  // Key height: dynamic with 24px total vertical margin (12px each side)
  const W_KEY_W  = ctrlH > 0 ? (ctrlH - 48) / totalWhites : 12;
  const B_KEY_W  = W_KEY_W * 0.6;
  const KB_TOTAL = totalWhites * W_KEY_W;

  const { songData, loading: partsLoading, error: partsError } = useSongParts(songId);

  const activeNotesRef    = useRef<string[]>(songId ? [] : DEMO_NOTES);
  const activeSectionsRef = useRef(songId ? [] as typeof DEMO_DATA['sections'] : DEMO_DATA.sections);
  const [activeSections, setActiveSections] = useState(songId ? [] as typeof DEMO_DATA['sections'] : DEMO_DATA.sections);

  const [isPlaying,         setIsPlaying]         = useState(false);
  const [count,             setCount]             = useState(0);
  const [speed,             setSpeed]             = useState(DEMO_SPEED_MS);
  const [audioReady,        setAudioReady]        = useState(false);
  const [sectionIdx,        setSectionIdx]        = useState(0);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [activeKeys,        setActiveKeys]        = useState<Set<string>>(new Set());
  const [noteLabelMode,     setNoteLabelMode]     = useState<'off' | 'abc' | 'solfege'>('off');
  const cycleNoteLabels = () => setNoteLabelMode(m => m === 'off' ? 'abc' : m === 'abc' ? 'solfege' : 'off');

  const _s0len = songId ? 0 : DEMO_DATA.sections[0].end - DEMO_DATA.sections[0].start;
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd,   setLoopEnd]   = useState(_s0len);
  const loopStartRef = useRef(0);
  const loopEndRef   = useRef(_s0len);
  const barWidthRef  = useRef(200);
  const startBaseRef = useRef(0);
  const endBaseRef   = useRef(_s0len);

  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { startBaseRef.current = loopStartRef.current; },
      onPanResponderMove: (_, g) => {
        const sec = activeSectionsRef.current[sectionIdxRef.current];
        const sl  = sec.end - sec.start;
        const delta = Math.round(-g.dy / barWidthRef.current * sl);
        const v = Math.max(0, Math.min(loopEndRef.current - 1, startBaseRef.current + delta));
        loopStartRef.current = v; setLoopStart(v);
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
        loopEndRef.current = v; setLoopEnd(v);
      },
    })
  ).current;

  const countRef       = useRef(0);
  const speedRef       = useRef(DEMO_SPEED_MS);
  const sectionIdxRef  = useRef(0);
  const playSession    = useRef(0);

  const schedulerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextAudioTime     = useRef(0);
  const nextStepIdx       = useRef(0);
  const LOOKAHEAD_SEC     = 0.5;
  const SCHEDULE_INTERVAL = 100;
  const activeTimers      = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { initAudio().then(() => setAudioReady(true)); }, []);

  useEffect(() => {
    if (!songData) return;
    activeNotesRef.current    = songData.notes;
    activeSectionsRef.current = songData.sections;
    setActiveSections(songData.sections);
    setSpeed(songData.speedMs);
    speedRef.current = songData.speedMs;
    playSession.current++;
    if (schedulerRef.current !== null) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    for (const t of activeTimers.current) clearTimeout(t);
    activeTimers.current = [];
    cancelAllScheduled();
    stopActivePiano();
    setIsPlaying(false);
    setActiveKeys(new Set());
    sectionIdxRef.current = 0; setSectionIdx(0);
    countRef.current = 0; setCount(0);
    nextStepIdx.current = 0;
    if (songData.sections.length > 0) {
      const s0len = songData.sections[0].end - songData.sections[0].start;
      loopStartRef.current = 0; loopEndRef.current = s0len;
      setLoopStart(0); setLoopEnd(s0len);
    }
  }, [songData]);

  // ── Lookahead scheduler ───────────────────────────────────────────────────────
  const scheduleStepAt = useCallback((stepStr: string, stepTimeSec: number, displayIdx: number, session: number) => {
    const { noteCodes, durationUnits } = parsePianoStep(stepStr);
    const durationMs  = (durationUnits / 6) * speedRef.current;
    const durationSec = durationMs / 1000;

    for (const code of noteCodes) {
      schedulePianoAt(code, stepTimeSec, durationSec);
    }

    const latSec      = getAudioOutputLatencyMs() / 1000;
    const msUntilVis  = Math.max(0, (stepTimeSec + latSec - getAudioCurrentTime()) * 1000);
    const shadowMs    = Math.min(600, Math.max(80, durationMs * 0.9));

    activeTimers.current.push(setTimeout(() => {
      if (playSession.current !== session) return;
      countRef.current = displayIdx;
      setCount(displayIdx);
      const keys = new Set(noteCodes.map(codeToKey));
      setActiveKeys(keys);
      activeTimers.current.push(setTimeout(() => {
        if (playSession.current === session) setActiveKeys(new Set());
      }, shadowMs));
    }, msUntilVis));

    nextAudioTime.current = stepTimeSec + durationSec;
    nextStepIdx.current++;
  }, []);

  const scheduleLoop = useCallback((session: number) => {
    sweepEndedSources();
    const lookaheadEnd = getAudioCurrentTime() + LOOKAHEAD_SEC;
    while (nextAudioTime.current < lookaheadEnd) {
      const sec      = activeSectionsRef.current[sectionIdxRef.current];
      const rStart   = loopStartRef.current;
      const rEnd     = loopEndRef.current;
      if (rEnd - rStart <= 0) break;
      const offset = nextStepIdx.current % (rEnd - rStart);
      const local  = rStart + offset;
      scheduleStepAt(activeNotesRef.current[sec.start + local], nextAudioTime.current, local, session);
    }
  }, [scheduleStepAt]);

  const startPlay = useCallback(() => {
    if (isPlaying || !audioReady) return;
    const session = ++playSession.current;
    const rStart = loopStartRef.current;
    const rEnd   = loopEndRef.current;
    const clamped = Math.max(rStart, Math.min(rEnd - 1, countRef.current));
    nextAudioTime.current = getAudioCurrentTime() + 0.05;
    nextStepIdx.current   = clamped - rStart;
    stopActivePiano();
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
    stopActivePiano();
    setIsPlaying(false);
    setActiveKeys(new Set());
  }, []);

  const resetSong = useCallback(() => {
    stopPlay();
    countRef.current = 0; setCount(0);
  }, [stopPlay]);

  const changeSection = useCallback((newIdx: number) => {
    if (isPlaying) stopPlay();
    sectionIdxRef.current = newIdx; setSectionIdx(newIdx);
    countRef.current = 0; setCount(0);
    nextStepIdx.current = 0;
    const newLen = activeSectionsRef.current[newIdx].end - activeSectionsRef.current[newIdx].start;
    loopStartRef.current = 0; loopEndRef.current = newLen;
    setLoopStart(0); setLoopEnd(newLen);
  }, [isPlaying, stopPlay]);

  const adjustSpeed = (delta: number) => {
    const s = Math.max(100, Math.min(1200, speed + delta));
    setSpeed(s); speedRef.current = s;
  };

  // Manual step navigation
  const playManualStep = useCallback((stepStr: string, displayIdx: number) => {
    const { noteCodes } = parsePianoStep(stepStr);
    setActiveKeys(new Set(noteCodes.map(codeToKey)));
    countRef.current = displayIdx; setCount(displayIdx);
    for (const code of noteCodes) playPianoNoteManual(code);
  }, []);

  const stepPrev = useCallback(() => {
    if (isPlaying) return;
    const idx = Math.max(loopStartRef.current, countRef.current - 1);
    countRef.current = idx; nextStepIdx.current = idx - loopStartRef.current;
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    playManualStep(activeNotesRef.current[sec.start + idx], idx);
  }, [isPlaying, playManualStep]);

  const stepNext = useCallback(() => {
    if (isPlaying) return;
    const idx = Math.min(loopEndRef.current - 1, countRef.current + 1);
    countRef.current = idx; nextStepIdx.current = idx - loopStartRef.current;
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    playManualStep(activeNotesRef.current[sec.start + idx], idx);
  }, [isPlaying, playManualStep]);

  // Manual key tap
  const onPressKey = useCallback((keyId: string) => {
    playPianoNote(`p${keyId}`);
    setActiveKeys(new Set([keyId]));
    setTimeout(() => setActiveKeys(new Set()), 350);
  }, []);

  const currentSec = activeSections[sectionIdx] ?? activeSections[0];
  const secLen     = currentSec ? currentSec.end - currentSec.start : 0;

  const NOTE_SOLFEGE: Record<string, string> = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
  const toLabelText = (id: string) => {
    if (noteLabelMode === 'abc') return id;
    const sol = NOTE_SOLFEGE[id[0]] ?? id[0];
    return sol + id.slice(1);
  };

  // ── Render piano keyboard ─────────────────────────────────────────────────────
  const renderKeyboard = () => {
    const whiteKeys   = KEY_DEFS.filter(k => !k.isBlack);
    const blackKeys   = KEY_DEFS.filter(k =>  k.isBlack);
    return (
      <View style={{ height: W_KEY_H + 8, position: 'relative', width: KB_TOTAL }}>
        {/* White keys */}
        {whiteKeys.map(key => {
          const active = activeKeys.has(key.id);
          return (
            <TouchableOpacity
              key={key.id}
              activeOpacity={0.6}
              onPress={() => onPressKey(key.id)}
              style={[s.wKey, {
                left: key.wOffset * W_KEY_W,
                width: W_KEY_W - KEY_BORDER,
                height: W_KEY_H,
                backgroundColor: active ? '#f97316' : '#fff',
                borderColor: '#9ca3af',
              }]}
            />
          );
        })}
        {/* Key labels — separate layer, only when noteLabelMode is active */}
        {noteLabelMode !== 'off' && whiteKeys.map(key => (
          <Text
            key={`lbl-${key.id}`}
            style={[s.wKeyLabel, {
              position: 'absolute',
              left: key.wOffset * W_KEY_W,
              width: W_KEY_W,
              bottom: 8,
              textAlign: 'center',
            }]}
            numberOfLines={1}
          >
            {toLabelText(key.id)}
          </Text>
        ))}
        {/* Black keys — rendered on top */}
        {blackKeys.map(key => {
          const active = activeKeys.has(key.id);
          return (
            <TouchableOpacity
              key={key.id}
              activeOpacity={0.6}
              onPress={() => onPressKey(key.id)}
              style={[s.bKey, {
                left: (key.bAfterW! + 1) * W_KEY_W - B_KEY_W / 2,
                width: B_KEY_W,
                height: B_KEY_H,
                backgroundColor: active ? '#3b82f6' : '#1f2937',
              }]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <ScreenLayout navigation={navigation} activeKey="Piano" contentStyle={{ backgroundColor: '#f9fafb' }}>

      {/* Title */}
      <View style={s.titleBar}>
        <Text style={s.titleTxt} numberOfLines={1}>{routeSongName ?? DEMO_NAME}</Text>
      </View>

      {partsError && !partsLoading && (
        <View style={s.errorBar}><Text style={s.errorTxt}>⚠ {partsError}</Text></View>
      )}

      {partsLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={s.loadingTxt}>Cargando canción...</Text>
        </View>
      )}

      {/* Row layout: keyboard (left, rotated -90°) + controls (right, rotated -90°) */}
      {/* Matches web's portrait mobile layout: low notes at bottom, high notes at top */}
      <View style={s.mainRow} onLayout={e => setCtrlH(e.nativeEvent.layout.height)}>

        {/* ── Keyboard column ───────────────────────────────────────────────── */}
        <View
          style={[s.kbCol, { width: KB_COL_W }, (partsLoading || (!songData && !!songId)) && { opacity: 0.3 }]}
        >
          {ctrlH > 0 && (
            <View style={{
              position: 'absolute',
              // RN rotates around element center. Center this element at (KB_COL_W/2, ctrlH/2)
              // so after -90° rotation it fills the column exactly.
              left: (KB_COL_W - KB_TOTAL) / 2,  // negative when KB_TOTAL > KB_COL_W (expected)
              top:  (ctrlH - W_KEY_H - 8) / 2,
              transform: [{ rotate: '-90deg' }],
            }}>
              {renderKeyboard()}
            </View>
          )}
        </View>

        {/* ── Controls column ───────────────────────────────────────────────── */}
        <View
          style={[s.ctrlContainer, (partsLoading || (!songData && !!songId)) && { opacity: 0.3 }]}
        >
          <View style={[s.ctrlInner, {
            width: KB_TOTAL, height: CTRL_COL_W,
            top:  (ctrlH - CTRL_COL_W) / 2,
            left: (CTRL_COL_W - KB_TOTAL) / 2,
            transform: [{ rotate: '-90deg' }],
          }]}>

            {/* Row 1: section nav + playback + speed */}
            <View style={s.ctrlRow}>
              <TouchableOpacity style={[s.btnSecNav, sectionIdx === 0 && s.btnSecNavDisabled]} onPress={() => changeSection(sectionIdx - 1)} disabled={sectionIdx === 0} activeOpacity={0.7}>
                <Text style={[s.btnSecNavTxt, sectionIdx === 0 && s.btnSecNavTxtDis]}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sectionSelect} onPress={() => setShowSectionPicker(true)} activeOpacity={0.8} disabled={!currentSec}>
                <Text style={s.sectionSelectTxt} numberOfLines={1}>{currentSec?.name ?? '—'}</Text>
                <Text style={s.sectionSelectChevron}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSecNav, sectionIdx === activeSections.length - 1 && s.btnSecNavDisabled]} onPress={() => changeSection(sectionIdx + 1)} disabled={sectionIdx === activeSections.length - 1} activeOpacity={0.7}>
                <Text style={[s.btnSecNavTxt, sectionIdx === activeSections.length - 1 && s.btnSecNavTxtDis]}>▶</Text>
              </TouchableOpacity>

              <View style={s.vertDivider} />

              <View style={s.playbackGroup}>
                <TouchableOpacity style={[s.btnBlue, isPlaying && s.btnGray]} onPress={stepPrev} disabled={isPlaying} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>⏮</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnPlayLg, s.btnPlayGo, (isPlaying || !audioReady) && s.btnGray]} onPress={startPlay} disabled={isPlaying || !audioReady} activeOpacity={0.8}>
                  <Text style={s.btnPlayTxt}>▶</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnPlayLg, s.btnPlayStop]} onPress={stopPlay} disabled={!isPlaying} activeOpacity={0.8}>
                  <Text style={s.btnPlayTxt}>■</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnBlue, isPlaying && s.btnGray]} onPress={stepNext} disabled={isPlaying} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>⏭</Text>
                </TouchableOpacity>
              </View>

              <View style={s.vertDivider} />

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

            {/* Row 2: reset + note-label toggle + progress bar */}
            <View style={s.ctrlRow2}>
              <TouchableOpacity style={s.btnReset} onPress={resetSong} activeOpacity={0.8}>
                <Text style={s.btnResetTxt}>↺</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnNoteLabel, noteLabelMode === 'abc' && s.btnNoteLabelAbc, noteLabelMode === 'solfege' && s.btnNoteLabelSolfege]}
                onPress={cycleNoteLabels}
                activeOpacity={0.8}
              >
                <Text style={s.btnNoteLabelTxt}>🎵</Text>
              </TouchableOpacity>
              <View style={s.progressTrack} onLayout={e => { barWidthRef.current = e.nativeEvent.layout.width; }}>
                <View style={[s.loopRange, {
                  left:  `${(loopStart / secLen) * 100}%` as any,
                  right: `${((secLen - loopEnd) / secLen) * 100}%` as any,
                }]} />
                <View style={[s.progressDone, {
                  left:  `${(loopStart / secLen) * 100}%` as any,
                  width: `${(Math.max(0, count - loopStart) / secLen) * 100}%` as any,
                }]} />
                <Text style={s.counter}>{count}/{secLen}</Text>
                <View style={[s.markerStartHandle, { left: `${(loopStart / secLen) * 100}%` as any }]} {...startPan.panHandlers}>
                  <View style={s.markerBlockStart}>
                    <Text style={s.markerLbl}>{loopStart}</Text>
                    <Text style={s.markerSymbol}>⌐</Text>
                  </View>
                </View>
                <View style={[s.markerEndHandle, { left: `${(loopEnd / secLen) * 100}%` as any }]} {...endPan.panHandlers}>
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

      {/* Section picker modal */}
      <Modal visible={showSectionPicker} transparent animationType="fade" onRequestClose={() => setShowSectionPicker(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowSectionPicker(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Seleccionar sección</Text>
            {activeSections.map((sec, i) => (
              <TouchableOpacity key={sec.id} style={[s.modalItem, i === sectionIdx && s.modalItemActive]} onPress={() => { changeSection(i); setShowSectionPicker(false); }} activeOpacity={0.7}>
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
  titleBar: { paddingHorizontal: 14, paddingVertical: 10 },
  titleTxt:  { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: 0.3 },

  // Row layout
  mainRow: { flex: 1, flexDirection: 'row' },
  kbCol: { marginLeft: 16 },

  // Controls column
  ctrlContainer: { flex: 1, overflow: 'hidden' },
  ctrlInner: {
    position: 'absolute',
    flexDirection: 'column', justifyContent: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  ctrlRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctrlRow2: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playbackGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  vertDivider:   { width: 1, height: 32, backgroundColor: '#e5e7eb', marginHorizontal: 2 },

  btnSecNav:         { paddingHorizontal: 6, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  btnSecNavDisabled: { opacity: 0.5, borderWidth: 1, borderColor: '#d1d5db' },
  btnSecNavTxt:      { fontSize: 13, color: '#374151', fontWeight: '600' },
  btnSecNavTxtDis:   { color: '#9ca3af' },

  sectionSelect:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', minWidth: 90, maxWidth: 140, gap: 3 },
  sectionSelectTxt:     { fontSize: 11, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  sectionSelectChevron: { fontSize: 10, color: '#6b7280' },

  btnGreen:  { width: 32, height: 32, borderRadius: 8, backgroundColor: '#16a34a', borderWidth: 1, borderColor: '#15803d', justifyContent: 'center', alignItems: 'center' },
  btnRed:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#dc2626', borderWidth: 1, borderColor: '#b91c1c', justifyContent: 'center', alignItems: 'center' },
  btnBlue:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#2563eb', borderWidth: 1, borderColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center' },
  btnGray:   { backgroundColor: '#d1d5db', borderColor: '#9ca3af' },
  btnTxt:    { fontSize: 15, color: '#fff', fontWeight: '700' },

  speedCenter: { alignItems: 'center', minWidth: 52 },
  speedVal:    { fontSize: 12, fontWeight: '700', color: '#111827' },
  speedLbl:    { fontSize: 9, color: '#6b7280' },

  btnPlayLg:   { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  btnPlayGo:   { backgroundColor: '#16a34a', borderWidth: 1.5, borderColor: '#15803d' },
  btnPlayStop: { backgroundColor: '#dc2626', borderWidth: 1.5, borderColor: '#b91c1c' },
  btnPlayTxt:  { fontSize: 18, color: '#fff' },

  btnReset:    { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  btnResetTxt: { fontSize: 16, color: '#4b5563' },
  btnNoteLabel:        { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  btnNoteLabelAbc:     { backgroundColor: '#4f46e5', borderColor: '#4338ca' },
  btnNoteLabelSolfege: { backgroundColor: '#0d9488', borderColor: '#0f766e' },
  btnNoteLabelTxt:     { fontSize: 15 },

  progressTrack: { flex: 1, height: 26, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'visible' },
  loopRange:     { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(249,115,22,0.22)', borderRadius: 3 },
  progressDone:  { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#3b82f6', borderRadius: 4 },
  counter:       { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, textAlign: 'center', textAlignVertical: 'center', fontSize: 9, color: '#374151', fontWeight: '700' },
  markerStartHandle: { position: 'absolute', top: -3, bottom: -3, width: 24, zIndex: 10 },
  markerEndHandle:   { position: 'absolute', top: -3, bottom: -3, width: 24, marginLeft: -24, zIndex: 10 },
  markerBlockStart:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, backgroundColor: '#f97316', borderTopLeftRadius: 3, borderBottomLeftRadius: 3, alignItems: 'center', justifyContent: 'center' },
  markerBlockEnd:    { position: 'absolute', right: 0, top: 0, bottom: 0, width: 16, backgroundColor: '#f97316', borderTopRightRadius: 3, borderBottomRightRadius: 3, alignItems: 'center', justifyContent: 'center' },
  markerLbl:         { fontSize: 6, color: '#fff', fontWeight: '800', lineHeight: 7, marginBottom: 1 },
  markerSymbol:      { fontSize: 10, color: '#fff', fontWeight: '900', lineHeight: 11 },

  // Keyboard keys
  wKey: {
    position: 'absolute', top: 4, bottom: 4,
    borderWidth: KEY_BORDER, borderRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  wKeyLabel: { fontSize: 5, lineHeight: 6, color: '#9ca3af', fontWeight: '600', flexShrink: 0 },
  bKey: {
    position: 'absolute', top: 4,
    borderRadius: 3, zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  // Loading / error
  loadingOverlay: { position: 'absolute', top: 56, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:     { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  errorBar:       { marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  errorTxt:       { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  // Modal
  modalBackdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard:         { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, minWidth: 180, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  modalTitle:        { fontSize: 12, fontWeight: '700', color: '#6b7280', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 4 },
  modalItem:         { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 4 },
  modalItemActive:   { backgroundColor: '#f5f3ff' },
  modalItemTxt:      { fontSize: 15, color: '#111827', fontWeight: '500' },
  modalItemActiveTxt:{ color: '#8b5cf6', fontWeight: '700' },
});
