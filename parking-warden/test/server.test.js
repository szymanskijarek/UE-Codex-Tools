// Boots the real server and plays a tiny multiplayer session over a raw WebSocket.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const serverPath = fileURLToPath(new URL('../server/server.js', import.meta.url));

function waitForListen(proc) {
  return new Promise((resolve, reject) => {
    proc.stdout.on('data', (d) => { if (String(d).includes('depot open')) resolve(); });
    proc.on('exit', (c) => reject(new Error('server exited ' + c)));
  });
}

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const i = waiters.findIndex((w) => w.pred(m));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(m); else inbox.push(m);
  };
  const next = (pred, ms = 3000) => {
    const i = inbox.findIndex(pred);
    if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      waiters.push({ pred, resolve });
      setTimeout(() => reject(new Error('timeout')), ms);
    });
  };
  const opened = new Promise((r) => { ws.onopen = r; });
  return { ws, next, opened, send: (m) => ws.send(JSON.stringify(m)) };
}

test('two players share a room, host starts the shift', { skip: typeof WebSocket === 'undefined' && 'needs Node 22+ global WebSocket' }, async (t) => {
  const proc = spawn(process.execPath, [serverPath], { env: { ...process.env, PORT: String(PORT) } });
  t.after(() => proc.kill());
  await waitForListen(proc);

  const host = client(); await host.opened;
  host.send({ t: 'join', room: '', name: 'Host', charId: 'nigel' });
  const joined = await host.next((m) => m.t === 'joined');
  assert.match(joined.room, /^[A-Z]{4}$/);
  assert.ok(joined.map.spots.length > 50);

  const guest = client(); await guest.opened;
  guest.send({ t: 'join', room: joined.room, name: 'Guest', charId: 'kevin' });
  await guest.next((m) => m.t === 'joined');

  guest.send({ t: 'start' }); // not the host: ignored
  host.send({ t: 'addBot' });
  host.send({ t: 'start' });
  const s = await guest.next((m) => m.t === 'state' && m.s.phase === 'playing' && m.s.wardens.length === 3);
  assert.equal(s.host, joined.id);
  assert.ok(s.s.cars.length > 10);

  const bad = client(); await bad.opened;
  bad.send({ t: 'join', room: 'ZZZZ' });
  const err = await bad.next((m) => m.t === 'error');
  assert.match(err.text, /No room/);

  for (const c of [host, guest, bad]) c.ws.close();
});
