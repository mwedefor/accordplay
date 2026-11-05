// Piano WebView embed — bundled locally.
// Audio samples are loaded via URIs passed in the 'load' message (local file:// or remote).
// No network dependency for the HTML or the audio files.
export const PIANO_EMBED_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Piano</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { width: 100%; height: 100%; background: #111827; overflow: hidden; touch-action: pan-x; }

    #wrap {
      width: 100%;
      height: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      align-items: stretch;
      justify-content: center;
      -webkit-overflow-scrolling: touch;
    }

    #kb {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      flex-shrink: 0;
      height: 100%;
    }

    .wk {
      flex-shrink: 0;
      background: #f3f4f6;
      border-left: 1px solid #9ca3af;
      border-bottom: 1px solid #9ca3af;
      border-radius: 0 0 5px 5px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 6px;
      cursor: pointer;
      transition: background 40ms;
      user-select: none;
    }
    .wk:last-of-type { border-right: 1px solid #9ca3af; }
    .wk.on { background: #f59e0b; }

    .bk {
      position: absolute;
      background: #1e293b;
      border-radius: 0 0 4px 4px;
      z-index: 2;
      cursor: pointer;
      transition: background 40ms;
      user-select: none;
    }
    .bk.on { background: #d97706; }

    .lbl {
      font-size: 8px;
      color: #6b7280;
      font-family: system-ui, sans-serif;
      pointer-events: none;
      user-select: none;
      transform: rotate(90deg);
      display: none;
      white-space: nowrap;
    }
    .wk.on .lbl { color: #78350f; }

    #loading {
      position: fixed; inset: 0;
      background: #111827;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 12px;
      z-index: 100;
    }
    #loading-bar-wrap {
      width: 200px; height: 6px;
      background: #374151;
      border-radius: 3px;
      overflow: hidden;
    }
    #loading-bar {
      height: 100%;
      background: #f59e0b;
      width: 0%;
      transition: width 200ms;
      border-radius: 3px;
    }
    #loading-text {
      color: #9ca3af;
      font-size: 13px;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>

<div id="loading">
  <div id="loading-text">Cargando piano…</div>
  <div id="loading-bar-wrap"><div id="loading-bar"></div></div>
</div>

<div id="wrap"><div id="kb"></div></div>

<script>
'use strict';

const BASE = 'https://www.accordplay.com';
let W_KEY_W = 32;
let B_KEY_W = 20;
const B_KEY_RATIO = 0.62;

// ── Code → audio filename ──────────────────────────────────────────────────────
const SHARP_TO_FILE = { Cs:'Db', Ds:'Eb', Es:'F', Fs:'Gb', Gs:'Ab', As:'Bb' };
const WRAP_UP  = { Bs:'C' };
const WRAP_DN  = { Cb:'B', Fb:'E' };

function codeToFilename(code) {
  const body = code.slice(1);
  const m = body.match(/^([A-G][bs]?)(\\d+)$/);
  if (!m) return null;
  let note = m[1], oct = parseInt(m[2]);
  if (WRAP_UP[note])        { note = WRAP_UP[note];        oct += 1; }
  else if (WRAP_DN[note])   { note = WRAP_DN[note];        oct -= 1; }
  else if (SHARP_TO_FILE[note]) { note = SHARP_TO_FILE[note]; }
  return note + oct;
}

// ── Code → keyboard key ID ─────────────────────────────────────────────────────
const SHARP_TO_FLAT = {
  As:['Bb',0], Bs:['C',1], Cs:['Db',0], Ds:['Eb',0],
  Es:['F',0],  Fs:['Gb',0], Gs:['Ab',0],
};
const FLAT_ADJ = { Cb:['B',-1], Fb:['E',0] };

function codeToKeyId(code) {
  const body = code.slice(1);
  const m = body.match(/^([A-G][bs]?)(\\d+)$/);
  if (!m) return body;
  let note = m[1], oct = parseInt(m[2]);
  if (SHARP_TO_FLAT[note]) { const [n,d] = SHARP_TO_FLAT[note]; note=n; oct+=d; }
  else if (FLAT_ADJ[note]) { const [n,d] = FLAT_ADJ[note];      note=n; oct+=d; }
  return note + oct;
}

// ── Audio engine ───────────────────────────────────────────────────────────────
let _ctx = null;
const _buffers = {};   // filename → AudioBuffer
const _loading = {};   // filename → Promise
const _sources = [];   // { source, endTime }
const MAX_SRC  = 24;

function getCtx() {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function sweepSources() {
  const now = getCtx().currentTime;
  for (let i = _sources.length - 1; i >= 0; i--) {
    if (_sources[i].endTime <= now) {
      try { _sources[i].source.disconnect(); } catch {}
      _sources.splice(i, 1);
    }
  }
}

function loadSample(filename) {
  if (_buffers[filename]) return Promise.resolve();
  if (_loading[filename]) return _loading[filename];
  _loading[filename] = fetch(BASE + '/assets/piano/' + filename + '.mp3')
    .then(r => { if (!r.ok) throw r.status; return r.arrayBuffer(); })
    .then(ab => getCtx().decodeAudioData(ab))
    .then(buf => { _buffers[filename] = buf; delete _loading[filename]; })
    .catch(() => { delete _loading[filename]; });
  return _loading[filename];
}

function scheduleNote(code, startTime, durationSec) {
  const fname = codeToFilename(code);
  if (!fname || !_buffers[fname]) return;

  sweepSources();
  if (_sources.length >= MAX_SRC) {
    const old = _sources.shift();
    try { old.source.stop(0); old.source.disconnect(); } catch {}
  }

  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = _buffers[fname];
  src.connect(ctx.destination);
  const endTime = startTime + durationSec + 0.2;
  _sources.push({ source: src, endTime });
  src.onended = () => {
    const idx = _sources.findIndex(e => e.source === src);
    if (idx >= 0) { try { src.disconnect(); } catch {} _sources.splice(idx, 1); }
  };
  try { src.start(startTime, 0, durationSec); } catch {}
}

function stopAllAudio() {
  for (const e of _sources) { try { e.source.stop(0); e.source.disconnect(); } catch {} }
  _sources.length = 0;
}

// ── Keyboard ───────────────────────────────────────────────────────────────────
const W_NOTES = ['C','D','E','F','G','A','B'];
const B_DEFS  = [['Db',0],['Eb',1],['Gb',3],['Ab',4],['Bb',5]];
const OCTAVES = [1,2,3,4,5,6,7];

const keyDefs = [];
let totalW = 0;

keyDefs.push({ id:'A0',  isBlack:false, wIdx:0 });
keyDefs.push({ id:'Bb0', isBlack:true,  bAfterW:0 });
keyDefs.push({ id:'B0',  isBlack:false, wIdx:1 });
totalW = 2;

for (const oct of OCTAVES) {
  const oStart = totalW;
  for (let wi = 0; wi < 7; wi++) {
    keyDefs.push({ id: W_NOTES[wi]+oct, isBlack:false, wIdx: oStart + wi });
  }
  for (const [n, after] of B_DEFS) {
    keyDefs.push({ id: n+oct, isBlack:true, bAfterW: oStart + after });
  }
  totalW += 7;
}
keyDefs.push({ id:'C8', isBlack:false, wIdx: totalW });
totalW += 1;

const keyEls = {};

function buildKeyboard() {
  const kb   = document.getElementById('kb');
  const wrap = document.getElementById('wrap');
  kb.innerHTML = '';
  for (const k in keyEls) delete keyEls[k];
  const availW = wrap.clientWidth || window.innerWidth;
  W_KEY_W = Math.max(8, availW / 52);
  B_KEY_W = W_KEY_W * 0.625;
  const h    = wrap.clientHeight || window.innerHeight;
  const wkH  = h;
  const bkH  = Math.round(h * B_KEY_RATIO);

  kb.style.width  = (totalW * W_KEY_W) + 'px';
  kb.style.height = wkH + 'px';

  for (const kd of keyDefs) {
    if (kd.isBlack) continue;
    const el = document.createElement('div');
    el.className = 'wk';
    el.dataset.id = kd.id;
    el.style.width  = W_KEY_W + 'px';
    el.style.height = wkH + 'px';
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    el.appendChild(lbl);
    kb.appendChild(el);
    keyEls[kd.id] = el;
  }

  for (const kd of keyDefs) {
    if (!kd.isBlack) continue;
    const el = document.createElement('div');
    el.className = 'bk';
    el.dataset.id = kd.id;
    el.style.width  = B_KEY_W + 'px';
    el.style.height = bkH + 'px';
    el.style.left   = ((kd.bAfterW + 1) * W_KEY_W - B_KEY_W / 2) + 'px';
    el.style.top    = '0px';
    kb.appendChild(el);
    keyEls[kd.id] = el;
  }

  wrap.addEventListener('touchstart', () => { getCtx(); }, { once: true, passive: true });
  setLabels(_labelMode);
}

// ── Note labels ────────────────────────────────────────────────────────────────
const SOL_NAMES = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
let _labelMode = 'off';

function setLabels(mode) {
  _labelMode = mode;
  for (const id in keyEls) {
    const el = keyEls[id];
    if (!el.classList.contains('wk')) continue;
    const lbl = el.querySelector('.lbl');
    if (!lbl) continue;
    if (mode === 'off') { lbl.style.display = 'none'; continue; }
    const m = id.match(/^([A-G])(\\d+)$/);
    if (!m) { lbl.style.display = 'none'; continue; }
    const note = m[1], oct = m[2];
    lbl.style.display = 'inline';
    lbl.textContent = (mode === 'en') ? note + oct : (SOL_NAMES[note] ?? note);
  }
}

// ── Illumination ───────────────────────────────────────────────────────────────
let _litKeys = [];

function illuminate(keyIds) {
  for (const id of _litKeys) {
    const el = keyEls[id];
    if (el) el.classList.remove('on');
  }
  _litKeys = keyIds;
  for (const id of keyIds) {
    const el = keyEls[id];
    if (el) el.classList.add('on');
  }
}

// ── Scroll to active range ─────────────────────────────────────────────────────
function scrollToRange(loopStart, loopEnd, notes) {
  if (!notes || notes.length === 0) return;
  const midIdx = Math.floor((loopStart + loopEnd) / 2);
  const step   = notes[midIdx];
  if (!step) return;
  const tokens = step.trim().split(/\\s+/);
  for (const tok of tokens) {
    if (!tok.startsWith('p')) continue;
    const keyId = codeToKeyId(tok.split(':')[0]);
    const el = keyEls[keyId];
    if (!el) continue;
    const wrap = document.getElementById('wrap');
    const left = el.offsetLeft - wrap.clientWidth / 2 + W_KEY_W / 2;
    wrap.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    return;
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────────
let _notes     = [];
let _speedMs   = 300;
let _loopStart = 0;
let _loopEnd   = 0;
let _session   = 0;
let _nextTime  = 0;
let _nextIdx   = 0;
let _interval  = null;
let _playing   = false;

function scheduleStepAt(stepStr, stepTimeSec, session) {
  const tokens      = stepStr.trim().split(/\\s+/);
  const lastTok     = tokens[tokens.length - 1];
  const eventTiming = !isNaN(parseInt(lastTok)) ? Math.max(3, parseInt(lastTok)) : 6;
  const stepDurMs   = (eventTiming / 6) * _speedMs;
  const noteCodes   = [];

  for (const tok of tokens.slice(0, -1)) {
    if (!tok.startsWith('p')) continue;
    let code = tok, noteDur = eventTiming;
    if (tok.includes(':')) {
      const [c, d] = tok.split(':');
      code = c;
      const p = parseInt(d);
      if (!isNaN(p)) noteDur = p;
    }
    const noteSec = Math.max(0.096, _speedMs * (noteDur / 6) * 1.2 / 1000);
    scheduleNote(code, stepTimeSec, noteSec);
    noteCodes.push(code);
  }

  const keyIds        = noteCodes.map(codeToKeyId);
  const msUntilVisual = Math.max(1, (stepTimeSec - getCtx().currentTime) * 1000);
  const displayIdx    = _loopStart + (_nextIdx % Math.max(1, _loopEnd - _loopStart));

  setTimeout(() => {
    if (_session !== session) return;
    postToNative({ type: 'count', value: displayIdx });
    illuminate(keyIds);
    if (keyIds.length > 0) {
      setTimeout(() => {
        if (_session !== session) return;
        illuminate([]);
      }, Math.max(80, stepDurMs * 0.9));
    }
  }, msUntilVisual);

  _nextTime = stepTimeSec + stepDurMs / 1000;
  _nextIdx++;
}

function scheduleLoop(session) {
  sweepSources();
  const lookaheadEnd = getCtx().currentTime + 0.3;
  let maxIter = 20;
  while (_nextTime < lookaheadEnd && maxIter-- > 0) {
    const rangeLen = _loopEnd - _loopStart;
    if (rangeLen <= 0) break;
    const offset  = _nextIdx % rangeLen;
    const local   = _loopStart + offset;
    const stepStr = _notes[local];
    if (!stepStr) break;
    scheduleStepAt(stepStr, _nextTime, session);
  }
}

function handlePlay() {
  if (_playing) return;
  const session = ++_session;
  _nextTime = getCtx().currentTime + 0.05;
  _playing  = true;
  scheduleLoop(session);
  _interval = setInterval(() => scheduleLoop(session), 50);
  postToNative({ type: 'playState', playing: true });
}

function handleStop() {
  _session++;
  clearInterval(_interval); _interval = null;
  _playing = false;
  stopAllAudio();
  illuminate([]);
  postToNative({ type: 'playState', playing: false });
}

// ── Preload samples ────────────────────────────────────────────────────────────
function preloadNotes(notes, onProgress) {
  const fnames = new Set();
  for (const step of notes) {
    for (const tok of step.trim().split(/\\s+/)) {
      if (!tok.startsWith('p')) continue;
      const fname = codeToFilename(tok.split(':')[0]);
      if (fname) fnames.add(fname);
    }
  }
  const all = [...fnames];
  if (all.length === 0) { onProgress(1); return Promise.resolve(); }
  let done = 0;
  return Promise.all(all.map(f =>
    loadSample(f).then(() => { done++; onProgress(done / all.length); })
  ));
}

// ── Communication ──────────────────────────────────────────────────────────────
function postToNative(data) {
  const str = JSON.stringify(data);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(str);
}

function handleMessage(raw) {
  let msg;
  try { msg = JSON.parse(typeof raw === 'string' ? raw : raw.data); } catch { return; }

  switch (msg.type) {
    case 'load': {
      handleStop();
      _notes     = msg.notes   ?? [];
      _speedMs    = msg.speedMs    ?? 300;
      _loopStart  = msg.loopStart  ?? 0;
      _loopEnd    = msg.loopEnd    ?? _notes.length;
      _nextIdx    = msg.startIdx   ?? 0;

      const bar  = document.getElementById('loading-bar');
      const wrap = document.getElementById('loading');
      wrap.style.display = 'flex';

      preloadNotes(_notes, p => {
        if (bar) bar.style.width = Math.round(p * 100) + '%';
      }).then(() => {
        wrap.style.display = 'none';
        scrollToRange(_loopStart, _loopEnd, _notes);
        postToNative({ type: 'ready' });
      });
      break;
    }
    case 'play':
      if (msg.loopStart !== undefined) _loopStart = msg.loopStart;
      if (msg.loopEnd   !== undefined) _loopEnd   = msg.loopEnd;
      if (msg.startIdx  !== undefined) _nextIdx   = Math.max(0, msg.startIdx - _loopStart);
      getCtx();
      handlePlay();
      break;
    case 'stop':
      handleStop();
      break;
    case 'setSpeed':
      _speedMs = msg.speedMs;
      break;
    case 'setLoopRange':
      _loopStart = msg.start;
      _loopEnd   = msg.end;
      _nextIdx   = 0;
      scrollToRange(_loopStart, _loopEnd, _notes);
      break;
    case 'setCount':
      _nextIdx = Math.max(0, (msg.value ?? 0) - _loopStart);
      break;
    case 'setLabels':
      setLabels(msg.mode ?? 'off');
      break;
    case 'illuminate': {
      illuminate((msg.codes ?? []).map(codeToKeyId));
      break;
    }
  }
}

window.addEventListener('message',   e => handleMessage(e));
document.addEventListener('message', e => handleMessage(e));

// ── Init ───────────────────────────────────────────────────────────────────────
buildKeyboard();
window.addEventListener('resize', buildKeyboard);
document.getElementById('loading').style.display = 'none';
postToNative({ type: 'mounted' });
</script>
</body>
</html>`;
