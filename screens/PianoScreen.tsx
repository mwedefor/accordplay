import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, PanResponder, ActivityIndicator, Dimensions,
} from 'react-native';
import {
  initAudio,
  playPianoNoteManual, stopActivePiano,
} from '../components/pianoAudio';
import WebView from 'react-native-webview';
import { PIANO_EMBED_HTML } from '../assets/pianoEmbedHtml';
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

// Standard 88-key piano has 52 white keys (A0–C8)
const totalWhites = 52;


export default function PianoScreen({ navigation, route }: any) {
  const { songId, songName: routeSongName } = (route?.params ?? {}) as { songId?: string; songName?: string };
  const SCREEN_W   = Dimensions.get('window').width;
  const CONTENT_W  = SCREEN_W - NAV_RAIL_W;
  const W_KEY_H    = Math.round(CONTENT_W * 0.40);
  const KB_COL_W   = W_KEY_H + 8;
  const CTRL_COL_W = CONTENT_W - KB_COL_W;

  const [ctrlH, setCtrlH] = useState(0);

  const W_KEY_W  = ctrlH > 0 ? ctrlH / totalWhites : 12;
  const KB_TOTAL = totalWhites * W_KEY_W;

  const { songData, loading: partsLoading, error: partsError } = useSongParts(songId);

  const activeNotesRef    = useRef<string[]>(songId ? [] : DEMO_NOTES);
  const activeSectionsRef = useRef(songId ? [] as typeof DEMO_DATA['sections'] : DEMO_DATA.sections);
  const [activeSections, setActiveSections] = useState(songId ? [] as typeof DEMO_DATA['sections'] : DEMO_DATA.sections);

  const [isPlaying,         setIsPlaying]         = useState(false);
  const [count,             setCount]             = useState(0);
  const [speed,             setSpeed]             = useState(DEMO_SPEED_MS);
  const [sectionIdx,        setSectionIdx]        = useState(0);
  const [showSectionPicker, setShowSectionPicker] = useState(false);

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
  const isPlayingRef   = useRef(false);
  const nextStepIdx    = useRef(0);
  const webViewRef     = useRef<WebView>(null);
  const webViewMountedRef = useRef(false);
  const [webViewAudioReady, setWebViewAudioReady] = useState(false);
  const labelModeRef = useRef<'off' | 'en' | 'sol'>('off');
  const [labelMode, setLabelMode] = useState<'off' | 'en' | 'sol'>('off');

  useEffect(() => { initAudio(); }, []);

  useEffect(() => {
    if (!songData) return;
    activeNotesRef.current    = songData.notes;
    activeSectionsRef.current = songData.sections;
    setActiveSections(songData.sections);
    setSpeed(songData.speedMs);
    speedRef.current = songData.speedMs;
    playSession.current++;
    stopActivePiano();
    setIsPlaying(false); isPlayingRef.current = false;
    sectionIdxRef.current = 0; setSectionIdx(0);
    countRef.current = 0; setCount(0);
    nextStepIdx.current = 0;
    if (songData.sections.length > 0) {
      const s0len = songData.sections[0].end - songData.sections[0].start;
      loopStartRef.current = 0; loopEndRef.current = s0len;
      setLoopStart(0); setLoopEnd(s0len);
    }
    setWebViewAudioReady(false);
    sendLoadToWebView(0);
  }, [songData]);

  // ── WebView communication ─────────────────────────────────────────────────────
  const sendToWebView = useCallback((msg: object) => {
    const json = JSON.stringify(JSON.stringify(msg));
    webViewRef.current?.injectJavaScript(
      `(function(){var d=${json};window.dispatchEvent(new MessageEvent('message',{data:d}));document.dispatchEvent(new MessageEvent('message',{data:d}));})();true;`
    );
  }, []);

  const sendLoadToWebView = useCallback((secIdx: number) => {
    const sec = activeSectionsRef.current[secIdx];
    if (!sec) return;
    const notes = activeNotesRef.current.slice(sec.start, sec.end);
    sendToWebView({
      type: 'load',
      notes,
      speedMs:   speedRef.current,
      loopStart: loopStartRef.current,
      loopEnd:   loopEndRef.current,
    });
  }, [sendToWebView]);

  const handleWebViewMessage = useCallback((event: any) => {
    let msg: any;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (msg.type === 'mounted') {
      webViewMountedRef.current = true;
      sendLoadToWebView(sectionIdxRef.current);
    } else if (msg.type === 'ready') {
      setWebViewAudioReady(true);
      sendToWebView({ type: 'setLabels', mode: labelModeRef.current });
    } else if (msg.type === 'count') {
      countRef.current = msg.value;
      setCount(msg.value);
      nextStepIdx.current = msg.value - loopStartRef.current;
    } else if (msg.type === 'playState' && !msg.playing) {
      setIsPlaying(false); isPlayingRef.current = false;
    }
  }, [sendLoadToWebView, sendToWebView]);

  const startPlay = useCallback(() => {
    if (isPlayingRef.current || !webViewAudioReady) return;
    setIsPlaying(true); isPlayingRef.current = true;
    const rStart   = loopStartRef.current;
    const rEnd     = loopEndRef.current;
    const startIdx = Math.max(rStart, Math.min(rEnd - 1, countRef.current));
    sendToWebView({ type: 'play', loopStart: rStart, loopEnd: rEnd, startIdx });
  }, [webViewAudioReady, sendToWebView]);

  const stopPlay = useCallback(() => {
    playSession.current++;
    sendToWebView({ type: 'stop' });
    stopActivePiano();
    setIsPlaying(false); isPlayingRef.current = false;
  }, [sendToWebView]);

  const resetSong = useCallback(() => {
    stopPlay();
    countRef.current = 0; setCount(0);
    nextStepIdx.current = 0;
    sendToWebView({ type: 'setCount', value: 0 });
  }, [stopPlay, sendToWebView]);

  const changeSection = useCallback((newIdx: number) => {
    if (isPlayingRef.current) stopPlay();
    sectionIdxRef.current = newIdx; setSectionIdx(newIdx);
    countRef.current = 0; setCount(0);
    nextStepIdx.current = 0;
    const newLen = activeSectionsRef.current[newIdx].end - activeSectionsRef.current[newIdx].start;
    loopStartRef.current = 0; loopEndRef.current = newLen;
    setLoopStart(0); setLoopEnd(newLen);
    setWebViewAudioReady(false);
    sendLoadToWebView(newIdx);
  }, [stopPlay, sendLoadToWebView]);

  const cycleLabelMode = useCallback(() => {
    const next = labelModeRef.current === 'off' ? 'en' : labelModeRef.current === 'en' ? 'sol' : 'off';
    labelModeRef.current = next;
    setLabelMode(next);
    sendToWebView({ type: 'setLabels', mode: next });
  }, [sendToWebView]);

  const adjustSpeed = (delta: number) => {
    const s = Math.max(100, Math.min(1200, speed + delta));
    setSpeed(s); speedRef.current = s;
    sendToWebView({ type: 'setSpeed', speedMs: s });
  };

  // Manual step navigation
  const playManualStep = useCallback((stepStr: string, displayIdx: number) => {
    const { noteCodes, durationUnits } = parsePianoStep(stepStr);
    countRef.current = displayIdx; setCount(displayIdx);
    for (const code of noteCodes) playPianoNoteManual(code);
    sendToWebView({ type: 'setCount', value: displayIdx });
    if (noteCodes.length > 0) {
      sendToWebView({ type: 'illuminate', codes: noteCodes });
    }
  }, [sendToWebView]);

  const stepPrev = useCallback(() => {
    if (isPlayingRef.current) return;
    const idx = Math.max(loopStartRef.current, countRef.current - 1);
    countRef.current = idx; nextStepIdx.current = idx - loopStartRef.current;
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    playManualStep(activeNotesRef.current[sec.start + idx], idx);
  }, [playManualStep]);

  const stepNext = useCallback(() => {
    if (isPlayingRef.current) return;
    const idx = Math.min(loopEndRef.current - 1, countRef.current + 1);
    countRef.current = idx; nextStepIdx.current = idx - loopStartRef.current;
    const sec = activeSectionsRef.current[sectionIdxRef.current];
    playManualStep(activeNotesRef.current[sec.start + idx], idx);
  }, [playManualStep]);

  const currentSec = activeSections[sectionIdx] ?? activeSections[0];
  const secLen     = currentSec ? currentSec.end - currentSec.start : 0;

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

        {/* ── Keyboard column — WebView rotated -90° ───────────────────────── */}
        <View style={[s.kbCol, { width: KB_COL_W, overflow: 'hidden', backgroundColor: '#111827' }]}>
          {ctrlH > 0 && (
            <WebView
              ref={webViewRef}
              source={{ html: PIANO_EMBED_HTML, baseUrl: 'https://www.accordplay.com' }}
              onMessage={handleWebViewMessage}
              originWhitelist={['*']}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              style={{
                position: 'absolute',
                width:  ctrlH,
                height: KB_COL_W,
                top:  (ctrlH  - KB_COL_W) / 2,
                left: (KB_COL_W - ctrlH)  / 2,
                backgroundColor: '#111827',
                transform: [{ rotate: '-90deg' }],
              }}
            />
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
                <TouchableOpacity style={[s.btnPlayLg, s.btnPlayGo, (isPlaying || !webViewAudioReady) && s.btnGray]} onPress={startPlay} disabled={isPlaying || !webViewAudioReady} activeOpacity={0.8}>
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
                style={[s.btnReset, labelMode !== 'off' && { backgroundColor: '#ede9fe', borderColor: '#c4b5fd' }]}
                onPress={cycleLabelMode}
                activeOpacity={0.8}
              >
                <Text style={[s.btnResetTxt, labelMode === 'off' ? { fontSize: 20, fontWeight: '800' } : { fontSize: 11, fontWeight: '800' }]}>
                  {labelMode === 'off' ? '♩' : labelMode === 'en' ? 'ABC' : 'Do'}
                </Text>
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
  mainRow: { flex: 1, flexDirection: 'row', marginVertical: 10 },
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
