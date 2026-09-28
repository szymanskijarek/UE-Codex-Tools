// Client entry: menu, input, HUD, and the solo/online session glue.

import { Game } from '../shared/sim.js';
import { CHARACTERS, CHARACTER_BY_ID, OFFENCES } from '../shared/content.js';
import { Renderer } from './render.js';
import { play, unlockAudio, toggleMute } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: fine */ } }
};

let selectedChar = CHARACTER_BY_ID[store.get('fp.char')] ? store.get('fp.char') : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
let session = null;
let renderer = null;
let lastSnap = null;
let restartAttract = null;

// ================================================================ menu ====

function avatarStyle(ch) { return `border-color:${ch.trim};--skin:${ch.skin}`; }

function renderChars() {
  $('chars').innerHTML = CHARACTERS.map((c) => `
    <div class="char ${c.id === selectedChar ? 'sel' : ''}" data-id="${c.id}">
      <div class="avatar" style="${avatarStyle(c)}"></div>
      <div class="cn">${c.name.replace(/"[^"]*"\s*/, '')}</div>
      <div class="ct">${c.title}</div>
    </div>`).join('');
  const c = CHARACTER_BY_ID[selectedChar];
  const pct = (v) => Math.round(v * 100);
  $('char-detail').innerHTML = `
    <div><b>${c.name}</b>, ${c.title}</div>
    <div>⚡ <b>${c.ability.name}</b>: ${c.ability.desc} <span class="stats">(${c.ability.cooldown}s cooldown)</span></div>
    <div class="stats">Walk speed ${pct(c.speed)}% · Ticket writing ${c.writeTime.toFixed(1)}s</div>
    <div class="quirk">"${c.quirk}"</div>`;
}

$('chars').addEventListener('click', (e) => {
  const el = e.target.closest('.char');
  if (!el) return;
  selectedChar = el.dataset.id;
  store.set('fp.char', selectedChar);
  renderChars();
});

$('name').value = store.get('fp.name', '');
$('name').addEventListener('input', () => store.set('fp.name', $('name').value));
const params = new URLSearchParams(location.search);
if (params.get('room')) $('code').value = params.get('room').toUpperCase();

function netStatus(text, err = false) { $('net-status').textContent = text; $('net-status').classList.toggle('err', err); }

$('solo').addEventListener('click', () => { unlockAudio(); begin(new LocalSession(playerName(), selectedChar, +$('bots').value)); });
$('create').addEventListener('click', () => { unlockAudio(); connect(''); });
$('join').addEventListener('click', () => {
  unlockAudio();
  const code = $('code').value.trim().toUpperCase();
  if (code.length !== 4) { netStatus('Room codes are 4 letters. Like "PARK". Or "FINE".', true); return; }
  connect(code);
});
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('join').click(); });

function playerName() { return $('name').value.trim() || CHARACTER_BY_ID[selectedChar].name; }

// ============================================================ sessions ====

class LocalSession {
  constructor(name, charId, bots) {
    this.local = true;
    this.game = new Game({ shiftLength: +params.get('shift') || undefined }); // ?shift=30 for quick test shifts
    this.myId = 'me';
    this.map = this.game.map;
    this.game.addWarden('me', { name, charId });
    for (let i = 0; i < bots; i++) this.game.addBot();
    this.game.startShift();
  }
  isHost() { return true; }
  send(msg) {
    const g = this.game;
    if (msg.t === 'input') g.setInput(this.myId, msg);
    else if (msg.t === 'ability') g.useAbility(this.myId);
    else if (msg.t === 'high5') g.high5(this.myId);
    else if (msg.t === 'start') g.startShift();
  }
  frame(dt) { this.game.step(dt); return this.game.snapshot(); }
  close() {}
}

class NetSession {
  constructor(ws, joined) {
    this.local = false;
    this.ws = ws;
    this.myId = joined.id;
    this.room = joined.room;
    this.map = joined.map;
    this.snap = null;
    this.host = null;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === 'state') { this.snap = msg.s; this.host = msg.host; handleEvents(msg.s.events); }
    };
    ws.onclose = () => { if (session === this) { leave(); netStatus('Lost connection to the depot. Someone tripped over the cable.', true); } };
  }
  isHost() { return this.host === this.myId; }
  send(msg) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(msg)); }
  frame() { return this.snap; }
  close() { this.ws.onclose = null; this.ws.close(); }
}

function connect(code) {
  netStatus('Radioing the depot…');
  let ws;
  try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`); } catch { ws = null; }
  if (!ws) { netStatus('No depot server here. Run `npm start` for multiplayer.', true); return; }
  ws.onerror = () => netStatus("Couldn't reach the depot server. Multiplayer needs the Node server running (npm start).", true);
  ws.onopen = () => ws.send(JSON.stringify({ t: 'join', room: code, name: playerName(), charId: selectedChar }));
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.t === 'error') { netStatus(msg.text, true); ws.close(); return; }
    if (msg.t === 'joined') {
      netStatus('');
      history.replaceState(null, '', `?room=${msg.room}`);
      begin(new NetSession(ws, msg));
    }
  };
}

function begin(s) {
  session = s;
  renderer = new Renderer(canvas, s.map);
  lastSnap = null;
  resultsKey = null;
  feedLines.length = 0;
  $('menu').classList.add('hidden');
  $('results').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  canvas.focus();
}

function leave() {
  if (session) session.close();
  session = null;
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('results').classList.add('hidden');
  $('touch').classList.add('hidden');
  history.replaceState(null, '', location.pathname);
  renderChars();
  if (restartAttract) restartAttract();
}

// =============================================================== input ====

const keys = new Set();
const touchDir = { x: 0, y: 0 };
let touchWrite = false;
let lastSent = '';
let lastSentAt = 0;
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function currentInput() {
  return {
    t: 'input',
    up: keys.has('KeyW') || keys.has('ArrowUp') || touchDir.y < -0.35,
    down: keys.has('KeyS') || keys.has('ArrowDown') || touchDir.y > 0.35,
    left: keys.has('KeyA') || keys.has('ArrowLeft') || touchDir.x < -0.35,
    right: keys.has('KeyD') || keys.has('ArrowRight') || touchDir.x > 0.35,
    write: keys.has('KeyE') || keys.has('Enter') || touchWrite
  };
}

function pumpInput(now) {
  if (!session) return;
  const inp = currentInput();
  const key = JSON.stringify(inp);
  if (key !== lastSent || now - lastSentAt > 250) { session.send(inp); lastSent = key; lastSentAt = now; }
}

addEventListener('keydown', (e) => {
  if (!session || e.target.tagName === 'INPUT') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyQ' || e.code === 'Space') session.send({ t: 'ability' });
  if (e.code === 'KeyF') session.send({ t: 'high5' });
  if (e.code === 'KeyM') muteToggle();
  if (e.code === 'Escape' && $('results').classList.contains('hidden') && confirm('Clock off and return to the menu?')) leave();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
addEventListener('resize', () => renderer && renderer.resize());

function muteToggle() { $('mute').textContent = toggleMute() ? '🔇' : '🔊'; }
$('mute').addEventListener('click', muteToggle);

// touch stick + buttons
(function setupTouch() {
  const stick = $('stick'); const knob = $('knob');
  let active = null;
  const moveKnob = (e) => {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2); let dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy); const max = r.width / 2;
    if (m > max) { dx = (dx / m) * max; dy = (dy / m) * max; }
    touchDir.x = dx / max; touchDir.y = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { active = e.pointerId; stick.setPointerCapture(e.pointerId); moveKnob(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === active) moveKnob(e); });
  const end = () => { active = null; touchDir.x = 0; touchDir.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  for (const b of document.querySelectorAll('.tb')) {
    const act = b.dataset.act;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); unlockAudio();
      if (!session) return;
      if (act === 'write') touchWrite = true; else session.send({ t: act });
    });
    const up = () => { if (act === 'write') touchWrite = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  }
})();

// ============================================================== events ====

const feedLines = [];

function handleEvents(events) {
  if (!events) return;
  for (const e of events) {
    if (renderer) renderer.addEvent(e);
    if (e.k === 'sfx') play(e.s);
    else if (e.k === 'feed') { feedLines.push({ text: e.text, at: performance.now() }); if (feedLines.length > 5) feedLines.shift(); }
  }
}

// ================================================================= HUD ====

const cache = new Map();
function setHTML(id, html) { if (cache.get(id) !== html) { cache.set(id, html); $(id).innerHTML = html; } }
function show(id, on) { $(id).classList.toggle('hidden', !on); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v, word) => `${v} ${word}${v === 1 ? '' : 's'}`;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function updateHUD(snap) {
  const me = snap.wardens.find((w) => w.id === session.myId);
  const q = snap.quota;
  setHTML('hud-day', `Day ${snap.day}`);
  setHTML('hud-timer', snap.phase === 'playing' ? fmtTime(snap.timeLeft) : snap.phase === 'lobby' ? 'LOBBY' : 'DONE');
  $('hud-timer').classList.toggle('low', snap.phase === 'playing' && snap.timeLeft < 20);

  if (me) {
    setHTML('hud-score', `${me.score} / ${q}`);
    $('hud-bar').style.width = `${Math.min(100, (me.score / q) * 100)}%`;
    $('hud-bar').classList.toggle('met', me.score >= q);
    const ch = CHARACTER_BY_ID[me.charId];
    setHTML('ab-name', `⚡ ${esc(ch.ability.name)}`);
    setHTML('ab-desc', esc(ch.ability.desc));
    const ready = me.cd <= 0 && snap.phase === 'playing';
    $('ab-bar').style.width = `${snap.phase === 'playing' ? (1 - me.cd / ch.ability.cooldown) * 100 : 0}%`;
    $('hud-ability').classList.toggle('ready', ready);
  }
  const team = snap.wardens.reduce((s, w) => s + w.score, 0);
  const teamQ = q * snap.wardens.length;
  setHTML('hud-team', `${team} / ${teamQ}`);
  $('hud-teambar').style.width = `${Math.min(100, (team / Math.max(1, teamQ)) * 100)}%`;

  const rows = [...snap.wardens].sort((a, b) => b.score - a.score).map((w) => `
    <div class="row ${w.id === session.myId ? 'me' : ''}">
      <span>${esc(w.name.split(' ')[0].replace(/"/g, ''))}${w.bot ? ' 🤖' : ''}</span>
      <span><span class="c">${w.complaints ? '☹'.repeat(Math.min(3, w.complaints)) : ''}</span> <span class="${w.score >= q ? 'met' : ''}">${w.score}</span></span>
    </div>`).join('');
  setHTML('hud-board', rows);

  const now = performance.now();
  setHTML('hud-feed', feedLines.map((f) => `<div style="opacity:${Math.max(0.15, 1 - (now - f.at) / 12000).toFixed(2)}">${esc(f.text)}</div>`).join(''));

  show('hud-radio', !!snap.radio);
  if (snap.radio) setHTML('radio-text', esc(snap.radio));

  // car inspection card
  const car = me && snap.phase === 'playing' ? renderer.carInRange(snap, me, 60) : null;
  show('hud-inspect', !!car);
  if (car) {
    const zone = renderer.zoneOf(snap, car.spotId);
    let verdict;
    if (car.ticket === 'wrong') verdict = '<div class="verdict bad">Wrongly ticketed. Awkward.</div>';
    else if (car.ticket) verdict = '<div class="verdict ok">Already ticketed. Move along.</div>';
    else if (car.off) verdict = `<div class="verdict bad">Offence: ${OFFENCES[car.off].name} (+${OFFENCES[car.off].points}). Hold E!</div>`;
    else verdict = '<div class="verdict ok">Looks legal. Probably. Don\'t.</div>';
    setHTML('hud-inspect', `
      <div class="model">${esc(car.model)}${car.clamped ? ' 🔒 CLAMPED' : ''}</div>
      <div class="plate">${esc(car.plate)}</div>
      <div>Bay: ${zone.label}${car.paid !== null ? (car.paid ? ' · meter paid' : ' · meter EXPIRED') : ''}</div>
      ${verdict}`);
  }

  // multiplayer lobby card
  const inLobby = !session.local && snap.phase === 'lobby';
  show('hud-lobby', inLobby);
  if (inLobby) {
    const link = `${location.origin}${location.pathname}?room=${session.room}`;
    const host = session.isHost();
    setHTML('hud-lobby', `
      <div class="hint">Room code</div>
      <div class="code">${session.room}</div>
      <div class="hint">Share: <b>${esc(link)}</b></div>
      <div class="hint">${snap.wardens.length} warden(s) in the depot. Wander about, practise your high-fives (F).</div>
      <div class="btns">${host
        ? '<button class="btn primary" data-cmd="start">Start shift</button><button class="btn" data-cmd="addBot">Add AI warden</button><button class="btn" data-cmd="kickBots">Send bots home</button>'
        : '<span class="hint">Waiting for the host to blow the whistle…</span>'}</div>`);
  }

  if (snap.phase === 'ended' && snap.results) showResults(snap);
  else if (snap.phase === 'playing' && !$('results').classList.contains('hidden')) { $('results').classList.add('hidden'); resultsKey = null; }
}

$('hud-lobby').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cmd]');
  if (b && session) session.send({ t: b.dataset.cmd });
});

let resultsKey = null;
function showResults(snap) {
  const r = snap.results;
  const key = `${r.day}:${session.isHost()}`;
  if (resultsKey === key) return;
  resultsKey = key;
  const rows = r.rows.map((w, i) => `
    <div class="review ${w.id === session.myId ? 'me' : ''}">
      <div class="rank">#${i + 1}</div>
      <div>
        <div class="who">${esc(w.name)}${w.bot ? ' 🤖' : ''} <span style="font-weight:400;color:#777">· ${esc(CHARACTER_BY_ID[w.charId].title)}</span></div>
        <div class="quote">"${esc(w.review)}"</div>
        <div class="nums">${n(w.tickets, 'ticket')} · ${n(w.complaints, 'complaint')} · ${n(w.high5s, 'high-five')} · left hanging ${w.hanging}×</div>
      </div>
      <div class="pts ${w.met ? 'met' : 'miss'}">${w.score}<span style="font-size:12px;color:#888">/${r.quota}</span></div>
    </div>`).join('');
  const awards = r.awards.map((a) => `<div class="award"><div class="t">🏆 ${esc(a.title)}</div><div><b>${esc(a.name)}</b>: ${esc(a.blurb)}</div></div>`).join('');
  const canContinue = session.isHost();
  $('results-body').innerHTML = `
    <h1>End of Shift: Day ${r.day}</h1>
    <div class="sub">Performance reviews by Dennis, Control. He's used the good pen.</div>
    <div class="team-verdict ${r.teamMet ? 'ok' : 'bad'}">${r.teamMet ? '✅ Team quota met' : '❌ Team quota missed'}: ${r.team} / ${r.teamQuota}</div>
    ${rows}
    <div class="awards">${awards}</div>
    <div class="results-btns">
      ${canContinue ? `<button class="btn primary" id="next-shift">Next shift (quota ${r.quota + 3})</button>` : '<span class="hint">Waiting for the host to start the next shift…</span>'}
      <button class="btn" id="to-menu">Clock off</button>
    </div>`;
  $('results').classList.remove('hidden');
  if (canContinue) $('next-shift').onclick = () => session.send({ t: 'start' });
  $('to-menu').onclick = leave;
}

// ================================================================ loop ====

let prev = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  if (session) {
    pumpInput(now);
    const snap = session.frame(dt);
    if (session && session.local && snap) handleEvents(snap.events);
    if (snap) lastSnap = snap;
    if (session && lastSnap) {
      renderer.draw(lastSnap, session.myId, dt, { exact: session.local });
      updateHUD(lastSnap);
    }
  }
  requestAnimationFrame(frame);
}

renderChars();
requestAnimationFrame(frame);

// Attract mode: the menu has a live town ticking away behind it.
(function attract() {
  const g = new Game({ seed: 7 });
  for (let i = 0; i < 4; i++) g.addBot();
  g.startShift();
  const r = new Renderer(canvas, g.map);
  let last = performance.now();
  const tick = (now) => {
    if (session) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.step(dt);
    if (g.phase === 'ended') g.startShift();
    const s = g.snapshot();
    for (const e of s.events) r.addEvent(e);
    r.draw(s, null, dt, { exact: true });
    requestAnimationFrame(tick);
  };
  addEventListener('resize', () => r.resize());
  requestAnimationFrame(tick);
  restartAttract = () => { r.resize(); last = performance.now(); requestAnimationFrame(tick); };
})();
