// Canvas renderer. Draws a snapshot from the sim; knows nothing about networking.

import { CHARACTER_BY_ID, ZONES, OFFENCES } from '../shared/content.js';

const HIVIS = '#d9ff2e';
const ASPHALT = '#43464c';
const PAVEMENT = '#bfb9ad';
const PRERENDER_SCALE = 1.5;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export class Renderer {
  constructor(canvas, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.map = map;
    this.floaters = [];
    this.ghosts = [];
    this.claps = [];
    this.disp = new Map();
    this.time = 0;
    this.base = this.prerender();
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth; const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    const W = this.map.world.w; const H = this.map.world.h;
    this.scale = Math.min(w / W, h / H) * dpr;
    this.ox = (this.canvas.width - W * this.scale) / 2;
    this.oy = (this.canvas.height - H * this.scale) / 2;
  }

  // -------------------------------------------------------------- static
  spotRect(s) {
    return s.o === 'h' ? [s.x - 26, s.y - 12, 52, 24] : [s.x - 12, s.y - 26, 24, 52];
  }

  curbPoint(s, out, along = 0) {
    return s.o === 'h' ? [s.x + along, s.roadC + s.side * out] : [s.roadC + s.side * out, s.y + along];
  }

  prerender() {
    const { world, roads, spots, buildings, dims } = this.map;
    const c = document.createElement('canvas');
    c.width = world.w * PRERENDER_SCALE; c.height = world.h * PRERENDER_SCALE;
    const ctx = c.getContext('2d');
    ctx.scale(PRERENDER_SCALE, PRERENDER_SCALE);

    ctx.fillStyle = PAVEMENT; ctx.fillRect(0, 0, world.w, world.h);
    // paving slab texture
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < world.w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.h); ctx.stroke(); }
    for (let y = 0; y < world.h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.w, y); ctx.stroke(); }

    for (const r of roads) {
      ctx.fillStyle = ASPHALT;
      if (r.kind === 'h') ctx.fillRect(0, r.c - dims.LANE_OUT, world.w, dims.LANE_OUT * 2);
      else ctx.fillRect(r.c - dims.LANE_OUT, 0, dims.LANE_OUT * 2, world.h);
    }
    // curbs
    ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 3;
    for (const r of roads) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        if (r.kind === 'h') { ctx.moveTo(0, r.c + s * dims.LANE_OUT); ctx.lineTo(world.w, r.c + s * dims.LANE_OUT); }
        else { ctx.moveTo(r.c + s * dims.LANE_OUT, 0); ctx.lineTo(r.c + s * dims.LANE_OUT, world.h); }
        ctx.stroke();
      }
    }
    // junction boxes re-paved over curbs
    for (const hy of this.map.hRoads) for (const vx of this.map.vRoads) {
      ctx.fillStyle = ASPHALT;
      ctx.fillRect(vx - dims.LANE_OUT, hy - dims.LANE_OUT, dims.LANE_OUT * 2, dims.LANE_OUT * 2);
      // yellow box junction, because of course
      ctx.strokeStyle = 'rgba(242,201,76,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(vx - 36, hy - 36, 72, 72);
      ctx.beginPath();
      for (let k = -36; k <= 36; k += 18) { ctx.moveTo(vx - 36, hy + k); ctx.lineTo(vx + k, hy - 36); ctx.moveTo(vx + 36, hy - k); ctx.lineTo(vx - k, hy + 36); }
      ctx.stroke();
      // zebra crossings
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let k = -34; k <= 30; k += 10) {
        ctx.fillRect(vx + k, hy - dims.LANE_OUT - 16, 6, 14);
        ctx.fillRect(vx + k, hy + dims.LANE_OUT + 2, 6, 14);
        ctx.fillRect(vx - dims.LANE_OUT - 16, hy + k, 14, 6);
        ctx.fillRect(vx + dims.LANE_OUT + 2, hy + k, 14, 6);
      }
    }
    // centre lines
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([18, 14]);
    for (const r of roads) {
      ctx.beginPath();
      if (r.kind === 'h') { ctx.moveTo(0, r.c); ctx.lineTo(world.w, r.c); } else { ctx.moveTo(r.c, 0); ctx.lineTo(r.c, world.h); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // street names painted on the carriageway
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of roads) {
      const along = r.kind === 'h' ? [(this.map.vRoads[0] + this.map.vRoads[1]) / 2, (this.map.vRoads[1] + this.map.vRoads[2]) / 2] : [(this.map.hRoads[0] + this.map.hRoads[1]) / 2];
      for (const a of along) {
        ctx.save();
        if (r.kind === 'h') ctx.translate(a, r.c - 20); else { ctx.translate(r.c + 20, a); ctx.rotate(Math.PI / 2); }
        ctx.fillText(r.name.toUpperCase(), 0, 0);
        ctx.restore();
      }
    }

    for (const s of spots) this.drawSpotMarking(ctx, s, s.type);

    for (const b of buildings) this.drawBuilding(ctx, b);
    return c;
  }

  drawSpotMarking(ctx, s, type) {
    const [x, y, w, h] = this.spotRect(s);
    const horiz = s.o === 'h';
    ctx.save();
    ctx.lineWidth = 2;
    const label = (text, color) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      if (!horiz) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = color; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    const curbLine = (color, offsets) => {
      ctx.strokeStyle = color;
      for (const o of offsets) {
        ctx.beginPath();
        if (horiz) { const yy = s.roadC + s.side * o; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
        else { const xx = s.roadC + s.side * o; ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); }
        ctx.stroke();
      }
    };
    if (type === 'yellow') {
      curbLine('#f2c94c', [57, 61]);
    } else if (type === 'bus') {
      ctx.strokeStyle = '#f2c94c'; ctx.setLineDash([5, 4]); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setLineDash([]);
      label('BUS STOP', '#f2c94c');
      const [px, py] = this.curbPoint(s, 72, 0);
      ctx.fillStyle = '#555'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      ctx.fillStyle = '#d63031'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BUS', px, py);
    } else {
      // T-bar bay ends
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      if (horiz) { ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); }
      else { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); }
      ctx.stroke();
      curbLine('rgba(255,255,255,0.6)', [41]);
      if (type === 'disabled') {
        ctx.fillStyle = 'rgba(47,128,237,0.55)'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        label('♿ BADGE', '#fff');
      } else if (type === 'resident') {
        ctx.strokeStyle = 'rgba(39,174,96,0.9)'; ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
        label('PERMIT', '#6fdc8c');
      } else if (type === 'loading') {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.strokeStyle = 'rgba(242,201,76,0.5)'; ctx.lineWidth = 3;
        for (let k = -60; k < 60; k += 9) { ctx.beginPath(); ctx.moveTo(s.x + k, s.y - 30); ctx.lineTo(s.x + k + 30, s.y + 30); ctx.stroke(); }
        ctx.restore();
        label('LOADING', '#f2c94c');
      } else if (type === 'meter') {
        label('PAY', 'rgba(255,255,255,0.7)');
      } else {
        label('2 HRS', 'rgba(255,255,255,0.6)');
      }
    }
    ctx.restore();
  }

  drawBuilding(ctx, b) {
    const m = 4;
    const n = b.units.length;
    const uw = (b.w - m * 2) / n;
    const facesDown = b.y + b.h < this.map.world.h - 1;
    b.units.forEach((u, i) => {
      const x = b.x + m + i * uw; const y = b.y + m; const w = uw - 3; const h = b.h - m * 2;
      ctx.fillStyle = `hsl(${u.hue},22%,52%)`; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = `hsl(${u.hue},22%,44%)`; ctx.fillRect(x, y, w, h / 2);
      ctx.strokeStyle = `hsl(${u.hue},25%,32%)`; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
      // roof clutter: vents, a sad satellite dish
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + w * 0.2, y + h * 0.25, 10, 8);
      ctx.beginPath(); ctx.arc(x + w * 0.75, y + h * 0.35, 5, 0, Math.PI * 2); ctx.fill();
      // shop awning facing the street
      const ay = facesDown ? y + h - 14 : y;
      ctx.fillStyle = `hsl(${(u.hue + 180) % 360},55%,40%)`; ctx.fillRect(x, ay, w, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let k = 0; k < w; k += 12) ctx.fillRect(x + k, ay, 6, 14);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(u.name, x + w / 2, ay + 7, w - 6);
    });
  }

  // -------------------------------------------------------------- effects
  addEvent(e, me) {
    if (e.k === 'float') this.floaters.push({ ...e, life: 1.6 });
    else if (e.k === 'bubble') this.ghosts.push({ ...e, life: 2.8 });
    else if (e.k === 'clap') this.claps.push({ ...e, life: 0.6 });
  }

  smooth(id, x, y, dt, snapTo) {
    let d = this.disp.get(id);
    if (!d || snapTo || Math.hypot(d.x - x, d.y - y) > 120) { d = { x, y }; this.disp.set(id, d); return d; }
    const k = 1 - Math.exp(-dt * 18);
    d.x += (x - d.x) * k; d.y += (y - d.y) * k;
    return d;
  }

  // -------------------------------------------------------------- frame
  draw(snap, myId, dt, { exact = false } = {}) {
    this.time += dt;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1f24'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy);
    ctx.drawImage(this.base, 0, 0, this.map.world.w, this.map.world.h);
    if (!snap) return;

    const me = snap.wardens.find((w) => w.id === myId);
    const reveal = me && me.buffs.reveal;
    const types = new Map(snap.spotTypes);

    // freshly painted bays
    for (const [id, type] of types) {
      const s = this.map.spots[id];
      const [x, y, w, h] = this.spotRect(s);
      ctx.fillStyle = ASPHALT; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      this.drawSpotMarking(ctx, s, type);
      ctx.fillStyle = 'rgba(249,202,36,0.15)'; ctx.fillRect(x, y, w, h);
    }

    // meters
    const carBySpot = new Map(snap.cars.filter((c) => c.state !== 'leaving').map((c) => [c.spotId, c]));
    for (const s of this.map.spots) {
      if ((types.get(s.id) || s.type) !== 'meter') continue;
      const [px, py] = this.curbPoint(s, 71, 18);
      const car = carBySpot.get(s.id);
      ctx.fillStyle = '#555'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      ctx.fillStyle = !car ? '#9aa0a6' : car.paid ? '#2ecc71' : '#e74c3c';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
    }

    for (const o of snap.objects) if (o.type === 'urn') this.drawUrn(ctx, o);

    for (const car of snap.cars) {
      const p = this.smooth('c' + car.id, car.x, car.y, dt, exact);
      this.drawCar(ctx, car, p.x, p.y);
    }

    for (const d of snap.drivers) {
      const p = this.smooth('d' + d.id, d.x, d.y, dt, exact);
      this.drawDriver(ctx, d, p.x, p.y);
    }

    for (const o of snap.objects) if (o.type === 'cone') this.drawCone(ctx, o);

    // offence tells: close to you, or everywhere when the drone is up
    if (me) {
      for (const car of snap.cars) {
        if (car.state !== 'parked' || car.ticket) continue;
        const d = Math.hypot(car.x - me.x, car.y - me.y);
        if (!reveal && d > 140) continue;
        const alpha = reveal ? 1 : Math.min(1, (140 - d) / 40);
        this.drawTell(ctx, car, alpha);
      }
    }

    const wardens = [...snap.wardens].sort((a, b) => a.y - b.y);
    const wpos = new Map();
    for (const w of wardens) {
      const p = this.smooth('w' + w.id, w.x, w.y, dt, exact || w.id === myId);
      wpos.set(w.id, p);
      this.drawWarden(ctx, w, p.x, p.y, w.id === myId, snap);
    }

    // speech on top of everything
    for (const d of snap.drivers) if (d.bark) { const p = this.disp.get('d' + d.id); this.bubble(ctx, p.x, p.y - 14, d.bark, '#fff4e6'); }
    for (const w of wardens) if (w.bark) { const p = wpos.get(w.id); this.bubble(ctx, p.x, p.y - 24, w.bark, w.id === myId ? '#fffbd1' : '#ffffff'); }
    this.ghosts = this.ghosts.filter((g) => (g.life -= dt) > 0);
    for (const g of this.ghosts) { ctx.globalAlpha = Math.min(1, g.life); this.bubble(ctx, g.x, g.y - 14, g.text, '#fff4e6'); ctx.globalAlpha = 1; }

    this.claps = this.claps.filter((c) => (c.life -= dt) > 0);
    for (const c of this.claps) {
      const r = (0.6 - c.life) * 90;
      ctx.strokeStyle = `rgba(85,239,196,${c.life / 0.6})`; ctx.lineWidth = 3;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * r * 0.5, c.y + Math.sin(a) * r * 0.5); ctx.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); ctx.stroke();
      }
    }

    this.floaters = this.floaters.filter((f) => (f.life -= dt) > 0);
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      const y = f.y - (1.6 - f.life) * 28;
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;

    if (me && me.dazzled) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const flick = 0.72 + Math.sin(this.time * 30) * 0.08;
      ctx.fillStyle = `rgba(255,255,225,${flick})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawTell(ctx, car, alpha) {
    const y = car.y - (car.o === 'h' ? 22 : 34);
    ctx.globalAlpha = alpha;
    if (car.off) {
      const text = OFFENCES[car.off].short;
      ctx.font = 'bold 10px sans-serif';
      const w = ctx.measureText(text).width + 16;
      ctx.fillStyle = '#e74c3c'; roundRect(ctx, car.x - w / 2, y - 8, w, 16, 8); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('! ' + text, car.x, y + 0.5);
    } else {
      ctx.fillStyle = 'rgba(39,174,96,0.9)'; ctx.beginPath(); ctx.arc(car.x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(car.x - 3, y); ctx.lineTo(car.x - 1, y + 2.5); ctx.lineTo(car.x + 3.5, y - 2.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawCar(ctx, car, x, y) {
    const L = car.len; const W = 22;
    ctx.save();
    ctx.translate(x, y);
    if (car.o === 'v') ctx.rotate(Math.PI / 2);
    if (car.state === 'leaving') ctx.globalAlpha = Math.max(0, 1 - car.a);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, -L / 2 + 2, -W / 2 + 3, L, W, 6); ctx.fill();
    ctx.fillStyle = car.color; roundRect(ctx, -L / 2, -W / 2, L, W, car.van ? 3 : 7); ctx.fill();
    ctx.strokeStyle = shade(car.color, -60); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#26323d';
    if (car.van) {
      ctx.fillRect(L / 2 - 12, -W / 2 + 3, 6, W - 6);
      ctx.fillStyle = shade(car.color, -25); ctx.fillRect(-L / 2 + 3, -W / 2 + 3, L - 18, W - 6);
    } else {
      ctx.fillRect(L * 0.12, -W / 2 + 3, L * 0.16, W - 6);           // windscreen
      ctx.fillRect(-L / 2 + 5, -W / 2 + 4, L * 0.12, W - 8);         // rear window
      ctx.fillStyle = shade(car.color, -20); ctx.fillRect(-L / 2 + 5 + L * 0.13, -W / 2 + 3, L * 0.45, W - 6);
    }
    ctx.fillStyle = '#fff7b0'; ctx.fillRect(L / 2 - 2, -W / 2 + 2, 2, 4); ctx.fillRect(L / 2 - 2, W / 2 - 6, 2, 4);
    if (car.ticket) {
      ctx.fillStyle = car.ticket === 'wrong' ? '#fd79a8' : '#ffd32a';
      ctx.fillRect(L * 0.12 + 1, -5, 7, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(L * 0.12 + 2, -3, 5, 1); ctx.fillRect(L * 0.12 + 2, 0, 5, 1);
    }
    if (car.clamped) {
      ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(L / 2 - 10, W / 2, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  drawDriver(ctx, d, x, y) {
    const bob = d.frozen ? 0 : Math.sin(this.time * 14 + d.id) * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + 7, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.shirt; ctx.beginPath(); ctx.arc(x, y + bob, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.arc(x, y + bob - 1, 4, 0, Math.PI * 2); ctx.fill();
    if (d.frozen) { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💬', x + 9, y - 9); }
  }

  drawWarden(ctx, w, x, y, isMe, snap) {
    const ch = CHARACTER_BY_ID[w.charId];
    const bob = w.moving ? Math.abs(Math.sin(this.time * 12)) * 2 : 0;
    y -= bob;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 12 + bob, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (isMe) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(x, y, 19, this.time * 2, this.time * 2 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (w.buffs.synergy) { ctx.fillStyle = 'rgba(85,239,196,0.25)'; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); }
    if (w.buffs.scrawl) { ctx.fillStyle = 'rgba(232,74,95,0.25)'; ctx.beginPath(); ctx.arc(x, y, 22 + Math.sin(this.time * 20) * 2, 0, Math.PI * 2); ctx.fill(); }
    // body: hi-vis vest with character-coloured trim
    ctx.fillStyle = HIVIS; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ch.trim; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(220,220,220,0.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 11, y - 3); ctx.lineTo(x + 11, y - 3); ctx.moveTo(x - 11, y + 4); ctx.lineTo(x + 11, y + 4); ctx.stroke();
    // head + peaked cap pointing where they face
    const fx = Math.cos(w.f); const fy = Math.sin(w.f);
    ctx.fillStyle = ch.skin; ctx.beginPath(); ctx.arc(x + fx * 2, y + fy * 2 - 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e272e'; ctx.beginPath(); ctx.arc(x + fx * 1, y + fy * 1 - 2, 6.5, w.f + Math.PI * 0.5, w.f + Math.PI * 1.5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + fx * 6, y + fy * 6 - 2, 3, 6, w.f, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ch.trim; ctx.fillRect(x - 2 + fx * -2, y - 5 + fy * -2, 3, 3);

    if (w.writing) {
      ctx.strokeStyle = '#ffd32a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * w.writing.p); ctx.stroke();
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('📝', x + 14, y - 12);
    }
    if (w.stunned) {
      for (let k = 0; k < 3; k++) {
        const a = this.time * 5 + (k * Math.PI * 2) / 3;
        ctx.fillStyle = '#ffeaa7'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✶', x + Math.cos(a) * 14, y - 16 + Math.sin(a) * 4);
      }
    }
    if (w.h5) { ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✋', x + 14, y - 16 - Math.abs(Math.sin(this.time * 10)) * 3); }

    const icons = [];
    if (w.buffs.tea) icons.push('☕');
    if (w.buffs.sprint) icons.push('💨');
    if (w.buffs.reveal) icons.push('🛸');
    if (w.buffs.scrawl) icons.push('✒️');
    if (w.buffs.veteran) icons.push('★'.repeat(w.buffs.veteran));
    if (w.dazzled) icons.push('😵');
    const first = w.name.split(' ')[0].replace(/"/g, '');
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = isMe ? `${first} (you)` : first;
    const lw = ctx.measureText(label).width + 8;
    ctx.fillStyle = isMe ? 'rgba(255,211,42,0.9)' : 'rgba(20,20,25,0.7)';
    roundRect(ctx, x - lw / 2, y + 16, lw, 13, 6); ctx.fill();
    ctx.fillStyle = isMe ? '#222' : '#fff'; ctx.fillText(label, x, y + 23);
    if (icons.length) { ctx.font = '11px sans-serif'; ctx.fillStyle = '#ffd32a'; ctx.fillText(icons.join(' '), x, y + 37); }
  }

  drawCone(ctx, o) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(o.x - 7, o.y + 3, 14, 4);
    ctx.fillStyle = '#ff6b1a';
    ctx.beginPath(); ctx.moveTo(o.x, o.y - 10); ctx.lineTo(o.x + 7, o.y + 5); ctx.lineTo(o.x - 7, o.y + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(o.x - 4, o.y - 2, 8, 3);
  }

  drawUrn(ctx, o) {
    ctx.fillStyle = 'rgba(162,155,254,0.12)'; ctx.beginPath(); ctx.arc(o.x, o.y, 140, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(162,155,254,0.4)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#b2bec3'; roundRect(ctx, o.x - 8, o.y - 12, 16, 22, 4); ctx.fill();
    ctx.strokeStyle = '#636e72'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const t = (this.time * 0.8 + k / 3) % 1;
      ctx.globalAlpha = 1 - t;
      ctx.beginPath(); ctx.moveTo(o.x - 4 + k * 4, o.y - 14 - t * 16); ctx.quadraticCurveTo(o.x + 2 + k * 4, o.y - 20 - t * 16, o.x - 4 + k * 4, o.y - 26 - t * 16); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  bubble(ctx, x, y, text, bg) {
    ctx.font = '11px "Trebuchet MS", sans-serif';
    const lines = wrap(ctx, text, 150);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
    const h = lines.length * 13 + 8;
    const bx = Math.max(4, Math.min(this.map.world.w - w - 4, x - w / 2));
    const by = Math.max(4, y - h - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, bx + 2, by + 2, w, h, 7); ctx.fill();
    ctx.fillStyle = bg; roundRect(ctx, bx, by, w, h, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, by + h); ctx.lineTo(x + 5, by + h); ctx.lineTo(x, by + h + 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; roundRect(ctx, bx, by, w, h, 7); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 5 + i * 13));
  }

  // Which parked car is the warden standing next to? Used for the info card.
  carInRange(snap, me, range) {
    let best = null; let bd = range;
    for (const c of snap.cars) {
      if (c.state !== 'parked') continue;
      const d = Math.hypot(c.x - me.x, c.y - me.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  zoneOf(snap, spotId) {
    const o = snap.spotTypes.find(([id]) => id === spotId);
    return ZONES[o ? o[1] : this.map.spots[spotId].type];
  }
}
