// Fine Print multiplayer server: serves the static game and runs one
// authoritative Game per room over WebSockets.
//
//   node server/server.js            (PORT env var, default 8080)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acceptUpgrade } from './ws.js';
import { Game } from '../shared/sim.js';
import { CHARACTER_BY_ID } from '../shared/content.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 8080;
const TICK = 1 / 30;
const MAX_PLAYERS = 8;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

const rooms = new Map();

function roomCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do { code = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(''); } while (rooms.has(code));
  return code;
}

function createRoom() {
  const code = roomCode();
  const room = { code, game: new Game(), clients: new Map(), host: null, tick: 0 };
  room.timer = setInterval(() => stepRoom(room), TICK * 1000);
  rooms.set(code, room);
  return room;
}

function stepRoom(room) {
  room.game.step(TICK);
  if (++room.tick % 2) return; // broadcast at 15 Hz, simulate at 30 Hz
  const snap = JSON.stringify({ t: 'state', s: room.game.snapshot(), host: room.host });
  for (const ws of room.clients.values()) ws.send(snap);
}

function closeRoomIfEmpty(room) {
  if (room.clients.size) return;
  clearInterval(room.timer);
  rooms.delete(room.code);
}

let nextClient = 1;

function onConnection(ws) {
  const id = 'p' + nextClient++;
  let room = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'join' && !room) {
      const code = String(msg.room || '').toUpperCase().slice(0, 4);
      room = code ? rooms.get(code) : createRoom();
      if (!room) { ws.send({ t: 'error', text: `No room called ${code}. Check the code on the depot noticeboard.` }); return; }
      if (room.clients.size >= MAX_PLAYERS) { ws.send({ t: 'error', text: 'That room is full. The depot only has 8 lockers.' }); room = null; return; }
      room.clients.set(id, ws);
      if (!room.host) room.host = id;
      const charId = CHARACTER_BY_ID[msg.charId] ? msg.charId : undefined;
      room.game.addWarden(id, { name: String(msg.name || '').trim().slice(0, 20) || undefined, charId });
      ws.send({ t: 'joined', id, room: room.code, map: room.game.map });
      return;
    }
    if (!room) return;
    const g = room.game;
    switch (msg.t) {
      case 'input': g.setInput(id, msg); break;
      case 'ability': g.useAbility(id); break;
      case 'high5': g.high5(id); break;
      case 'start': if (id === room.host && g.phase !== 'playing') g.startShift(); break;
      case 'addBot': if (id === room.host && g.wardens.size < MAX_PLAYERS) g.addBot(); break;
      case 'kickBots': if (id === room.host) for (const w of [...g.wardens.values()]) if (w.bot) g.removeWarden(w.id); break;
    }
  });

  ws.on('close', () => {
    if (!room) return;
    room.clients.delete(id);
    room.game.removeWarden(id);
    if (room.host === id) room.host = room.clients.keys().next().value || null;
    closeRoomIfEmpty(room);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, rooms: rooms.size })); return; }
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep) || /[\\/](server|test|node_modules)[\\/]/.test(file.slice(ROOT.length))) { res.writeHead(403); res.end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found. Possibly towed.');
  }
});

server.on('upgrade', (req, socket) => {
  if (new URL(req.url, 'http://x').pathname !== '/ws') { socket.destroy(); return; }
  const ws = acceptUpgrade(req, socket);
  if (ws) onConnection(ws);
});

server.listen(PORT, () => console.log(`Fine Print depot open on http://localhost:${PORT}`));
