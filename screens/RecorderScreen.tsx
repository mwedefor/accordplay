import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useWindowDimensions, ActivityIndicator, Modal, PanResponder,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  initRecorderAudio, playRecorderNote, fadeRecorderNote,
  stopRecorderNote, recorderSleep,
} from '../components/recorderAudio';
import ScreenLayout from '../components/ScreenLayout';
import { NAV_RAIL_W } from '../components/NavRail';
import { DEMO_DATA, DEMO_NAME, DEMO_SPEED_MS } from '../data/recorderDemo';
import { RECORDER_NOTE_MAP, type FingerState } from '../data/recorderNotes';
import { useSongParts, type SongSection } from '../hooks/useSongParts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecorderStep {
  noteKey: string | null;
  duration: number;
  timing: number;
}

// ── Note parser (same as web Recorder.tsx parseNotes) ────────────────────────
function parseStep(line: string): RecorderStep {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { noteKey: null, duration: 6, timing: 12 };
  const last    = tokens[tokens.length - 1];
  const lastNum = Number(last);
  const hasTiming  = !isNaN(lastNum) && last === String(lastNum);
  const timing     = hasTiming ? lastNum : 12;
  const noteTokens = hasTiming ? tokens.slice(0, -1) : tokens;
  if (noteTokens.length === 0) return { noteKey: null, duration: 6, timing };
  const firstToken = noteTokens[0];
  const colonIdx   = firstToken.lastIndexOf(':');
  const key = colonIdx >= 0 ? firstToken.slice(0, colonIdx) : firstToken;
  const dur = colonIdx >= 0 ? Number(firstToken.slice(colonIdx + 1)) : 6;
  return {
    noteKey:  RECORDER_NOTE_MAP.has(key) ? key : null,
    duration: isNaN(dur) ? 6 : dur,
    timing,
  };
}

// ── Solfège table ─────────────────────────────────────────────────────────────
const ABC_SOL: Record<string, string> = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};
const ACC_SOL: Record<string, string> = {
  'C#': 'Do#', 'Db': 'Re♭', 'D#': 'Re#', 'Eb': 'Mi♭',
  'F#': 'Fa#', 'Gb': 'Sol♭', 'G#': 'Sol#', 'Ab': 'La♭',
  'A#': 'La#', 'Bb': 'Si♭', 'B#': 'Do#', 'Cb': 'Si♭',
};
function toSolfege(label: string): string {
  const pitch = label.replace(/\d/g, '');
  return ACC_SOL[pitch] ?? ABC_SOL[pitch[0]] ?? '';
}

// ── View-based fingering diagram ──────────────────────────────────────────────
// Portrait orientation (head up, bell down) — mirrors web SVG viewBox 0 0 100 680.
// All positions are in SVG units then scaled by sc = diagH / 680.
const OPEN_C    = '#1C0E06';
const CLOSED_C  = '#6559C5';
const RIM_C     = '#8A7050';
const CREAM     = '#EDE4C8';
const CREAM_SH  = '#C8BA98';
const BARREL_C  = '#D6C8A2';
const BARREL_SH = '#B8A882';

// Renders an ellipse-shaped View. borderRadius >= max(w,h) produces a true oval in RN.
function Oval({ cx, cy, rx, ry, fill, bw, bc }: {
  cx: number; cy: number; rx: number; ry: number;
  fill: string; bw?: number; bc?: string;
}) {
  return (
    <View style={{
      position: 'absolute',
      left: cx - rx, top: cy - ry,
      width: rx * 2, height: ry * 2,
      borderRadius: Math.max(rx, ry) * 2,
      backgroundColor: fill,
      borderWidth: bw ?? 0,
      borderColor: bc ?? 'transparent',
    }} />
  );
}

function FingeringDiagram({ fingering, diagH }: { fingering: FingerState[]; diagH: number }) {
  const [thumb, h1, h2, h3, h4, h5, h6, h7] = fingering;
  const sc  = diagH / 680;
  const diagW = Math.ceil(100 * sc);

  // SVG-unit helpers
  const p  = (v: number) => Math.round(v * sc);
  const CX  = p(50);
  const BX  = p(31);
  const BW  = p(38);
  const HR  = Math.max(3, p(9));
  const TR  = Math.max(2, p(6));
  const THX = p(21);
  const LBL = p(76);   // right-side hole-number labels x
  const LFS = Math.max(5, p(9));  // label font size

  function Hole({ cx, cy, r, state, side }: {
    cx: number; cy: number; r: number; state: FingerState; side?: boolean;
  }) {
    // side holes are foreshortened ellipses (rx ≈ 0.55 r) like the web
    const rx = side ? Math.max(2, Math.round(r * 0.55)) : r;
    const ry = r;
    const br = Math.max(rx, ry) * 2;
    if (state === 'half') {
      return (
        <View style={{
          position: 'absolute', left: cx - rx, top: cy - ry,
          width: rx * 2, height: ry * 2, borderRadius: br,
          overflow: 'hidden', flexDirection: 'row',
          borderWidth: 1.5, borderColor: RIM_C,
        }}>
          <View style={{ flex: 1, backgroundColor: OPEN_C }} />
          <View style={{ flex: 1, backgroundColor: CLOSED_C }} />
        </View>
      );
    }
    return (
      <View style={{
        position: 'absolute', left: cx - rx, top: cy - ry,
        width: rx * 2, height: ry * 2, borderRadius: br,
        backgroundColor: state ? CLOSED_C : OPEN_C,
        borderWidth: side ? 1 : 1.5,
        borderColor: side ? '#6A5040' : RIM_C,
      }} />
    );
  }

  const lbl = (n: number, leftEdge: number, cy: number) => (
    <Text style={{
      position: 'absolute', left: leftEdge, top: cy - LFS * 0.6,
      fontSize: LFS, color: '#888', fontFamily: 'System',
    }}>{n}</Text>
  );

  return (
    <View style={{
      width: diagW, height: diagH, position: 'relative',
      shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 }, elevation: 4,
    }}>

      {/* ── HEAD ── */}
      {/* Cap — outer barrel ellipse (web: ellipse cx=50 cy=42 rx=19 ry=40) */}
      <Oval cx={CX} cy={p(42)} rx={p(19)} ry={p(40)} fill={BARREL_C} bw={1} bc={BARREL_SH} />
      {/* Cap — inner dome (web: ellipse cx=50 cy=34 rx=15 ry=30) */}
      <Oval cx={CX} cy={p(34)} rx={p(15)} ry={p(30)} fill={CREAM} />

      {/* Neck (web: rect x=BX y=72 width=BW height=28 rx=3) */}
      <View style={{ position: 'absolute', left: BX, top: p(72), width: BW, height: p(28), borderRadius: p(3), backgroundColor: CREAM }} />

      {/* Voicing window — outer barrel */}
      <View style={{ position: 'absolute', left: p(44), top: p(80), width: p(12), height: p(14), borderRadius: p(2), backgroundColor: BARREL_C }} />
      {/* Voicing window — inner dark opening */}
      <View style={{ position: 'absolute', left: p(45), top: p(81), width: p(10), height: p(12), borderRadius: p(1), backgroundColor: '#2E1A08' }} />

      {/* ── UPPER BARREL RING ── */}
      <View style={{ position: 'absolute', left: p(21), top: p(99), width: p(58), height: p(26), borderRadius: p(13), backgroundColor: BARREL_C, borderWidth: 1, borderColor: BARREL_SH }} />

      {/* ── BODY (y=125–455) ── */}
      <View style={{ position: 'absolute', left: BX, top: p(125), width: BW, height: p(330), borderRadius: p(5), backgroundColor: CREAM, borderWidth: 1, borderColor: CREAM_SH }} />
      {/* Body edge shadows (simulate cylindrical gradient) */}
      <View style={{ position: 'absolute', left: BX, top: p(125), width: p(8), height: p(330), borderTopLeftRadius: p(5), borderBottomLeftRadius: p(5), backgroundColor: CREAM_SH, opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: BX + BW - p(8), top: p(125), width: p(8), height: p(330), borderTopRightRadius: p(5), borderBottomRightRadius: p(5), backgroundColor: CREAM_SH, opacity: 0.55 }} />

      {/* ── LOWER BARREL RING ── */}
      <View style={{ position: 'absolute', left: p(21), top: p(455), width: p(58), height: p(26), borderRadius: p(13), backgroundColor: BARREL_C, borderWidth: 1, borderColor: BARREL_SH }} />

      {/* ── TAIL (y=481–615) ── */}
      <View style={{ position: 'absolute', left: BX, top: p(481), width: BW, height: p(134), borderRadius: p(5), backgroundColor: CREAM, borderWidth: 1, borderColor: CREAM_SH }} />
      <View style={{ position: 'absolute', left: BX, top: p(481), width: p(8), height: p(134), borderTopLeftRadius: p(5), borderBottomLeftRadius: p(5), backgroundColor: CREAM_SH, opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: BX + BW - p(8), top: p(481), width: p(8), height: p(134), borderTopRightRadius: p(5), borderBottomRightRadius: p(5), backgroundColor: CREAM_SH, opacity: 0.55 }} />

      {/* ── BELL ── */}
      {/* Bell ring rect (web: rect x=28 y=615 width=44 height=22 rx=7) */}
      <View style={{ position: 'absolute', left: p(28), top: p(615), width: p(44), height: p(22), borderRadius: p(7), backgroundColor: BARREL_C, borderWidth: 1, borderColor: BARREL_SH }} />
      {/* Bell ellipse opening (web: ellipse cx=50 cy=641 rx=24 ry=8) */}
      <Oval cx={CX} cy={p(641)} rx={p(24)} ry={Math.max(3, p(8))} fill={BARREL_SH} bw={1} bc={CREAM_SH} />

      {/* ── HOLES ── */}
      {lbl(8, 1, p(168))}
      <Hole cx={THX} cy={p(168)} r={TR} state={thumb} />

      <Hole cx={CX} cy={p(168)} r={HR} state={h1} />
      {lbl(7, LBL, p(168))}

      <Hole cx={CX} cy={p(226)} r={HR} state={h2} />
      {lbl(6, LBL, p(226))}

      <Hole cx={CX} cy={p(284)} r={HR} state={h3} />
      {lbl(5, LBL, p(284))}

      <Hole cx={CX} cy={p(342)} r={HR} state={h4} />
      {lbl(4, LBL, p(342))}

      <Hole cx={CX} cy={p(400)} r={HR} state={h5} />
      {lbl(3, LBL, p(400))}

      <Hole cx={CX}            cy={p(520)} r={HR}                     state={h6} />
      <Hole cx={CX + p(16)}    cy={p(525)} r={Math.max(2, p(5))}      state={h6} side />
      {lbl(2, LBL, p(520))}

      <Hole cx={CX}            cy={p(574)} r={HR}                     state={h7} />
      <Hole cx={CX + p(16)}    cy={p(579)} r={Math.max(2, p(5))}      state={h7} side />
      {lbl(1, LBL, p(574))}

    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function RecorderScreen({ navigation, route }: any) {
  const { songId, songName: routeSongName } =
    (route?.params ?? {}) as { songId?: string; songName?: string };

  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const CONTENT_W = SCREEN_W - NAV_RAIL_W;

  // All dimensions derived from device screen height/width.
  // DIAG_H capped at 70% of available height so layout fits without scroll.
  const TITLE_H = 54;
  const NOTE_H  = 48;
  const AVAIL_H = SCREEN_H - TITLE_H - NOTE_H - 50;  // 50 = safe-area + padding buffer
  const DIAG_H  = Math.max(180, Math.round(AVAIL_H * 0.70));
  const DIAG_W  = Math.round(DIAG_H * 100 / 680);  // SVG aspect 100:680
  const CTRL_W  = CONTENT_W - DIAG_W - 16;          // right column width

  const { songData, loading: partsLoading, error: partsError } = useSongParts(songId);

  const activeNotesRef    = useRef<string[]>(songId ? [] : DEMO_DATA.notes);
  const activeSectionsRef = useRef<SongSection[]>(songId ? [] : DEMO_DATA.sections);
  const [activeSections, setActiveSections] = useState<SongSection[]>(
    songId ? [] : DEMO_DATA.sections,
  );

  const [ctrlH,       setCtrlH]       = useState(SCREEN_H - 54);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [count,       setCount]       = useState(0);
  const [speed,       setSpeed]       = useState(songId ? 300 : DEMO_SPEED_MS);
  const [audioReady,  setAudioReady]  = useState(false);
  const [sectionIdx,  setSectionIdx]  = useState(0);
  const [activeKey,   setActiveKey]   = useState<string | null>(null);
  const [showPicker,  setShowPicker]  = useState(false);

  const countRef      = useRef(0);
  const speedRef      = useRef(songId ? 300 : DEMO_SPEED_MS);
  const sectionIdxRef = useRef(0);
  const playSession   = useRef(0);
  const stopRef       = useRef(false);
  const isPlayingRef  = useRef(false);

  // ── Loop markers (mismo patrón que AccordionScreen) ────────────────────────
  const [loopStart,  setLoopStart]  = useState(0);
  const [loopEnd,    setLoopEnd]    = useState(0);
  const loopStartRef  = useRef(0);
  const loopEndRef    = useRef(0);
  const barWidthRef   = useRef(200);
  const startBaseRef  = useRef(0);
  const endBaseRef    = useRef(0);

  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { startBaseRef.current = loopStartRef.current; },
      onPanResponderMove: (_, g) => {
        const sec = activeSectionsRef.current[sectionIdxRef.current];
        const sl  = sec ? sec.end - sec.start : activeNotesRef.current.length;
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
        const sl  = sec ? sec.end - sec.start : activeNotesRef.current.length;
        const delta = Math.round(-g.dy / barWidthRef.current * sl);
        const v = Math.max(loopStartRef.current + 1, Math.min(sl, endBaseRef.current + delta));
        loopEndRef.current = v; setLoopEnd(v);
      },
    })
  ).current;

  useEffect(() => { initRecorderAudio().then(() => setAudioReady(true)); }, []);

  useEffect(() => {
    if (!songData) return;
    activeNotesRef.current    = songData.notes;
    activeSectionsRef.current = songData.sections;
    setActiveSections(songData.sections);
    setSpeed(songData.speedMs); speedRef.current = songData.speedMs;
    playSession.current++;
    stopRef.current = true;
    setIsPlaying(false); isPlayingRef.current = false;
    setActiveKey(null);
    countRef.current = 0; setCount(0);
    sectionIdxRef.current = 0; setSectionIdx(0);
  }, [songData]);

  const currentSteps = useCallback((): RecorderStep[] => {
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    if (!sec) return activeNotesRef.current.map(parseStep);
    return activeNotesRef.current.slice(sec.start, sec.end).map(parseStep);
  }, []);

  const handleStop = useCallback(() => {
    stopRef.current = true; playSession.current++;
    isPlayingRef.current = false; stopRecorderNote();
    setActiveKey(null); setIsPlaying(false);
  }, []);

  const handlePlay = useCallback(async () => {
    if (isPlayingRef.current || !audioReady) return;
    stopRef.current = false; isPlayingRef.current = true; setIsPlaying(true);
    const mySession = ++playSession.current;
    const notes = currentSteps();
    if (notes.length === 0) { setIsPlaying(false); isPlayingRef.current = false; return; }
    const ls = loopStartRef.current;
    const le = Math.min(loopEndRef.current, notes.length);
    if (countRef.current < ls || countRef.current >= le) { countRef.current = ls; setCount(ls); }

    while (!stopRef.current && mySession === playSession.current) {
      const start = countRef.current;
      for (let i = start; i < le; i++) {
        if (stopRef.current || mySession !== playSession.current) break;
        const step = notes[i];
        countRef.current = i; setCount(i);
        if (step.noteKey) {
          setActiveKey(step.noteKey);
          playRecorderNote(step.noteKey);
          const noteDurMs  = (step.duration / 6) * speedRef.current;
          const totalDurMs = (step.timing  / 6) * speedRef.current;
          await recorderSleep(noteDurMs);
          if (!stopRef.current && mySession === playSession.current && noteDurMs < totalDurMs - 10) {
            fadeRecorderNote(); setActiveKey(null);
            await recorderSleep(totalDurMs - noteDurMs);
          }
        } else {
          setActiveKey(null);
          await recorderSleep((step.timing / 6) * speedRef.current);
        }
      }
      break;
    }
    if (mySession === playSession.current) {
      fadeRecorderNote(); setActiveKey(null);
      setIsPlaying(false); isPlayingRef.current = false;
    }
  }, [audioReady, currentSteps]);

  const handleRestart = useCallback(() => {
    handleStop(); countRef.current = 0; setCount(0);
  }, [handleStop]);

  const handlePrevNote = useCallback(() => {
    if (isPlayingRef.current) return;
    const notes  = currentSteps();
    const newIdx = Math.max(0, countRef.current - 1);
    countRef.current = newIdx; setCount(newIdx);
    const step = notes[newIdx];
    if (step?.noteKey) { playRecorderNote(step.noteKey); setActiveKey(step.noteKey); }
    else setActiveKey(null);
  }, [currentSteps]);

  const handleNextNote = useCallback(() => {
    if (isPlayingRef.current) return;
    const notes  = currentSteps();
    const newIdx = Math.min(notes.length - 1, countRef.current + 1);
    countRef.current = newIdx; setCount(newIdx);
    const step = notes[newIdx];
    if (step?.noteKey) { playRecorderNote(step.noteKey); setActiveKey(step.noteKey); }
    else setActiveKey(null);
  }, [currentSteps]);

  const changeSection = useCallback((newIdx: number) => {
    handleStop();
    sectionIdxRef.current = newIdx; setSectionIdx(newIdx);
    countRef.current = 0; setCount(0);
  }, [handleStop]);

  const adjustSpeed = (delta: number) => {
    const s = Math.max(50, Math.min(1000, speed + delta));
    setSpeed(s); speedRef.current = s;
  };

  const speedLabel = speed <= 150 ? 'rápido' : speed <= 300 ? 'normal' : 'lento';

  // Derived display
  const displayNote = activeKey ? RECORDER_NOTE_MAP.get(activeKey) : null;
  const fingering: FingerState[] =
    displayNote ? displayNote.fingering
    : [false, false, false, false, false, false, false, false];

  const currentSec = activeSectionsRef.current[sectionIdx] ?? activeSectionsRef.current[0];
  const secLen = useMemo(() => {
    const sec = activeSectionsRef.current[sectionIdx];
    if (!sec) return activeNotesRef.current.length;
    return sec.end - sec.start;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdx, activeSections]);

  // Sync loop markers when section length changes
  useEffect(() => {
    loopStartRef.current = 0; setLoopStart(0);
    loopEndRef.current   = secLen; setLoopEnd(secLen);
    endBaseRef.current   = secLen;
  }, [secLen]);

  const pct       = secLen > 0 ? Math.min(1, Math.max(0, count - loopStart) / secLen) : 0;
  const canPrev   = sectionIdx > 0;
  const canNext   = sectionIdx < activeSections.length - 1;
  const songTitle = routeSongName ?? (songId ? '' : DEMO_NAME);

  return (
    <ScreenLayout navigation={navigation} activeKey="Library" contentStyle={{ backgroundColor: '#f9fafb' }}>

      {/* Title bar */}
      <View style={s.titleBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#6b7280" />
        </TouchableOpacity>
        <Text style={s.titleTxt} numberOfLines={1}>{songTitle || 'Flauta Dulce'}</Text>
        <View style={{ width: 34 }} />
      </View>

      {partsError && !partsLoading && (
        <View style={s.errorBar}>
          <Text style={s.errorTxt}>⚠ {partsError}</Text>
        </View>
      )}
      {partsLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={s.loadingTxt}>Cargando canción…</Text>
        </View>
      )}

      {/* ── Portrait: diagrama izquierda + controles rotados derecha ── */}
      <View style={[s.main, (partsLoading || (!songData && !!songId)) && { opacity: 0.3 }]}>

        {/* IZQUIERDA — diagrama + barra naranja, centrados verticalmente respecto al alto del panel derecho */}
        <View style={{ width: DIAG_W, flexDirection: 'column', alignItems: 'center', alignSelf: 'center', marginLeft: 16 }}>
          <FingeringDiagram fingering={fingering} diagH={DIAG_H} />
          {/* Barra naranja con marcadores en los extremos */}
          <View style={[s.noteStrip, { width: DIAG_W, height: NOTE_H }]}>
            {displayNote ? (
              <>
                <Text style={s.noteAbc}>{displayNote.label}</Text>
                <Text style={s.noteSol}>{toSolfege(displayNote.label)}</Text>
              </>
            ) : (
              <Text style={s.noteStripHint}>
                {!audioReady ? 'Cargando…' : '♩'}
              </Text>
            )}
          </View>
        </View>

        {/* DERECHA — panel de controles, rotado -90° (mismo patrón que AccordionScreen) */}
        <View
          style={s.ctrlContainer}
          onLayout={(e) => setCtrlH(e.nativeEvent.layout.height)}
        >
          <View style={[s.ctrlInner, {
            width:  ctrlH,
            height: CTRL_W,
            top:   (ctrlH  - CTRL_W) / 2,
            left:  (CTRL_W - ctrlH)  / 2,
            transform: [{ rotate: '-90deg' }],
          }]}>

            {/* Fila 1: Sección | Reproducción | Velocidad */}
            <View style={s.ctrlRow}>

              {/* Sección ◀ [nombre▾] ▶ */}
              <TouchableOpacity
                style={[s.btnSecNav, !canPrev && s.btnSecNavDisabled]}
                onPress={() => canPrev && changeSection(sectionIdx - 1)}
                disabled={!canPrev}
                activeOpacity={0.7}
              >
                <Text style={[s.btnSecNavTxt, !canPrev && s.btnSecNavTxtDis]}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.sectionSelect}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.8}
                disabled={!currentSec}
              >
                <Text style={s.sectionSelectTxt} numberOfLines={1}>
                  {currentSec?.name ?? '—'}
                </Text>
                <Text style={s.sectionSelectChevron}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSecNav, !canNext && s.btnSecNavDisabled]}
                onPress={() => canNext && changeSection(sectionIdx + 1)}
                disabled={!canNext}
                activeOpacity={0.7}
              >
                <Text style={[s.btnSecNavTxt, !canNext && s.btnSecNavTxtDis]}>▶</Text>
              </TouchableOpacity>

              <View style={s.vertDivider} />

              {/* Reproducción: ⏮ ▶/■ ⏭ */}
              <View style={s.playbackGroup}>
                <TouchableOpacity
                  style={[s.btnBlue, isPlaying && s.btnGray]}
                  onPress={handlePrevNote} disabled={isPlaying}
                  activeOpacity={0.8}
                >
                  <Text style={s.btnTxt}>⏮</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPlayLg, s.btnPlayGo, (!audioReady || isPlaying) && s.btnGray]}
                  onPress={handlePlay} disabled={!audioReady || isPlaying}
                  activeOpacity={0.8}
                >
                  <Text style={s.btnPlayTxt}>▶</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPlayLg, s.btnPlayStop]}
                  onPress={handleStop}
                  activeOpacity={0.8}
                >
                  <Text style={s.btnPlayTxt}>■</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnBlue, isPlaying && s.btnGray]}
                  onPress={handleNextNote} disabled={isPlaying}
                  activeOpacity={0.8}
                >
                  <Text style={s.btnTxt}>⏭</Text>
                </TouchableOpacity>
              </View>

              <View style={s.vertDivider} />

              {/* Velocidad: − [Xms label] + */}
              <View style={s.playbackGroup}>
                <TouchableOpacity style={s.btnRed} onPress={() => adjustSpeed(50)} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>−</Text>
                </TouchableOpacity>
                <View style={s.speedCenter}>
                  <Text style={s.speedVal}>{speed}ms</Text>
                  <Text style={s.speedLbl}>{speedLabel}</Text>
                </View>
                <TouchableOpacity style={s.btnGreen} onPress={() => adjustSpeed(-50)} activeOpacity={0.8}>
                  <Text style={s.btnTxt}>+</Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Fila 2: Reset + Barra de progreso */}
            <View style={s.ctrlRow2}>
              <TouchableOpacity style={s.btnReset} onPress={handleRestart} activeOpacity={0.8}>
                <Text style={s.btnResetTxt}>↺</Text>
              </TouchableOpacity>
              <View
                style={s.progressTrack}
                onLayout={e => { barWidthRef.current = e.nativeEvent.layout.width; }}
              >
                {secLen > 0 && <>
                  {/* Rango activo (naranja) */}
                  <View style={[s.loopRange, {
                    left:  `${(loopStart / secLen) * 100}%` as any,
                    right: `${((secLen - loopEnd) / secLen) * 100}%` as any,
                  }]} />
                  {/* Relleno de progreso */}
                  <View style={[s.progressDone, {
                    left:  `${(loopStart / secLen) * 100}%` as any,
                    width: `${(Math.max(0, count - loopStart) / secLen) * 100}%` as any,
                  }]} />
                  <Text style={s.counter}>{count}/{secLen}</Text>
                  {/* Marcador inicio */}
                  <View
                    style={[s.markerStartHandle, { left: `${(loopStart / secLen) * 100}%` as any }]}
                    {...startPan.panHandlers}
                  >
                    <View style={s.markerBlockStart}>
                      <Text style={s.markerLbl}>{loopStart}</Text>
                      <Text style={s.markerSymbol}>⌐</Text>
                    </View>
                  </View>
                  {/* Marcador fin */}
                  <View
                    style={[s.markerEndHandle, { left: `${(loopEnd / secLen) * 100}%` as any }]}
                    {...endPan.panHandlers}
                  >
                    <View style={s.markerBlockEnd}>
                      <Text style={s.markerLbl}>{loopEnd}</Text>
                      <Text style={s.markerSymbol}>¬</Text>
                    </View>
                  </View>
                </>}
              </View>
            </View>

          </View>
        </View>

      </View>

      {/* Modal selector de sección */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Sección</Text>
            {activeSections.map((sec, i) => (
              <TouchableOpacity
                key={sec.id}
                style={[s.modalItem, i === sectionIdx && s.modalItemActive]}
                onPress={() => { changeSection(i); setShowPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[s.modalItemTxt, i === sectionIdx && s.modalItemActiveTxt]}>
                  {sec.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </ScreenLayout>
  );
}

// ── Styles (mismo estándar que AccordionScreen) ───────────────────────────────
const s = StyleSheet.create({
  titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  backBtn:  { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  titleTxt: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 8 },

  main: { flex: 1, flexDirection: 'row', padding: 8, gap: 8 },

  // ── Panel de controles rotado -90° (igual que AccordionScreen) ───────────
  ctrlContainer: { flex: 1, overflow: 'hidden' },
  ctrlInner: {
    position: 'absolute',
    flexDirection: 'column', justifyContent: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  ctrlRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctrlRow2:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playbackGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  vertDivider:   { width: 1, height: 32, backgroundColor: '#e5e7eb', marginHorizontal: 2 },

  // Navegación de sección
  btnSecNav:         { paddingHorizontal: 6, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  btnSecNavDisabled: { opacity: 0.5, borderWidth: 1, borderColor: '#d1d5db' },
  btnSecNavTxt:      { fontSize: 13, color: '#374151', fontWeight: '600' },
  btnSecNavTxtDis:   { color: '#9ca3af' },
  sectionSelect:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', minWidth: 90, maxWidth: 140, gap: 3 },
  sectionSelectTxt:     { fontSize: 11, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  sectionSelectChevron: { fontSize: 10, color: '#6b7280' },

  // Botones de reproducción y velocidad
  btnGreen:  { width: 32, height: 32, borderRadius: 8, backgroundColor: '#16a34a', borderWidth: 1, borderColor: '#15803d', justifyContent: 'center', alignItems: 'center' },
  btnRed:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#dc2626', borderWidth: 1, borderColor: '#b91c1c', justifyContent: 'center', alignItems: 'center' },
  btnBlue:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#2563eb', borderWidth: 1, borderColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center' },
  btnGray:   { backgroundColor: '#d1d5db', borderColor: '#9ca3af' },
  btnTxt:    { fontSize: 15, color: '#fff', fontWeight: '700' },
  speedCenter: { alignItems: 'center', minWidth: 52 },
  speedVal:    { fontSize: 12, fontWeight: '700', color: '#111827' },
  speedLbl:    { fontSize: 9, color: '#6b7280' },
  btnPlayLg:      { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  btnPlayGo:      { backgroundColor: '#16a34a', borderWidth: 1.5, borderColor: '#15803d' },
  btnPlayStop:    { backgroundColor: '#dc2626', borderWidth: 1.5, borderColor: '#b91c1c' },
  btnPlayStopOff: { backgroundColor: '#d1d5db', borderWidth: 1,   borderColor: '#9ca3af' },
  btnPlayTxt:     { fontSize: 18, color: '#fff' },

  // Fila 2
  btnReset:    { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  btnResetTxt: { fontSize: 16, color: '#4b5563' },
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

  // Etiqueta de nota (mismos colores que la web: indigo-50 bg, indigo-700/400 texto)
  noteStrip:    { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 10, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  dotMarker:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c7d2fe' },
  noteAbc:      { fontSize: 16, fontWeight: '800', color: '#4338ca', lineHeight: 18, textAlign: 'center' },
  noteSol:      { fontSize: 11, fontWeight: '600', color: '#818cf8', lineHeight: 13, textAlign: 'center' },
  noteStripHint:{ fontSize: 32, color: '#a5b4fc', textAlign: 'center', width: '100%', textAlignVertical: 'center', lineHeight: 38 },

  // Loading / error
  loadingOverlay: { position: 'absolute', top: 56, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:     { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  errorBar:       { marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f0fdfa', borderRadius: 8, borderWidth: 1, borderColor: '#99f6e4' },
  errorTxt:       { fontSize: 12, color: '#0d9488', fontWeight: '600' },

  // Modal de sección
  modalBackdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard:         { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, minWidth: 180, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  modalTitle:        { fontSize: 12, fontWeight: '700', color: '#6b7280', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 4 },
  modalItem:         { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 4 },
  modalItemActive:   { backgroundColor: '#f0fdfa' },
  modalItemTxt:      { fontSize: 15, color: '#111827', fontWeight: '500' },
  modalItemActiveTxt:{ color: '#0d9488', fontWeight: '700' },
});
