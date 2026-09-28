import type { ArenaDef } from '@cc/content-schema';
import { idiv } from '../core/math';

/** Coarse navigation grid (02 §2). Walls are hard blocked, dynamic props are "soft" (cost ×4). */
export interface NavGrid {
  cols: number;
  rows: number;
  cell: number;
  blocked: Uint8Array;
  soft: Uint8Array;
}

export function buildNav(arena: ArenaDef): NavGrid {
  const cell = arena.navCellMm;
  const cols = Math.ceil(arena.sizeMm[0] / cell);
  const rows = Math.ceil(arena.sizeMm[1] / cell);
  const blocked = new Uint8Array(cols * rows);
  for (const [x, y, w, h] of arena.walls) {
    const c0 = Math.max(0, idiv(x, cell));
    const r0 = Math.max(0, idiv(y, cell));
    const c1 = Math.min(cols - 1, idiv(x + w - 1, cell));
    const r1 = Math.min(rows - 1, idiv(y + h - 1, cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) blocked[r * cols + c] = 1;
  }
  return { cols, rows, cell, blocked, soft: new Uint8Array(cols * rows) };
}

export function cellOf(nav: NavGrid, x: number, y: number): number {
  const c = Math.min(nav.cols - 1, Math.max(0, idiv(x, nav.cell)));
  const r = Math.min(nav.rows - 1, Math.max(0, idiv(y, nav.cell)));
  return r * nav.cols + c;
}

export function cellCenter(nav: NavGrid, idx: number): [number, number] {
  const c = idx % nav.cols;
  const r = idiv(idx, nav.cols);
  return [c * nav.cell + idiv(nav.cell, 2), r * nav.cell + idiv(nav.cell, 2)];
}

export function isBlockedAt(nav: NavGrid, x: number, y: number): boolean {
  if (x < 0 || y < 0) return true;
  const c = idiv(x, nav.cell);
  const r = idiv(y, nav.cell);
  if (c >= nav.cols || r >= nav.rows) return true;
  return nav.blocked[r * nav.cols + c] === 1;
}

/** Samples the segment every half cell; true when no hard-blocked cell is crossed. */
export function lineClear(nav: NavGrid, ax: number, ay: number, bx: number, by: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.max(Math.abs(dx), Math.abs(dy));
  const steps = Math.max(1, idiv(len * 2, nav.cell));
  for (let i = 1; i < steps; i++) {
    if (isBlockedAt(nav, ax + idiv(dx * i, steps), ay + idiv(dy * i, steps))) return false;
  }
  return true;
}

/** Nearest unblocked cell to idx (spiral search), or idx itself. */
function nearestOpen(nav: NavGrid, idx: number): number {
  if (!nav.blocked[idx]) return idx;
  const c0 = idx % nav.cols;
  const r0 = idiv(idx, nav.cols);
  for (let rad = 1; rad < 6; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || c < 0 || r >= nav.rows || c >= nav.cols) continue;
        const j = r * nav.cols + c;
        if (!nav.blocked[j]) return j;
      }
    }
  }
  return idx;
}

const NEIGH: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 10],
  [-1, 0, 10],
  [0, 1, 10],
  [0, -1, 10],
  [1, 1, 14],
  [1, -1, 14],
  [-1, 1, 14],
  [-1, -1, 14],
];

/**
 * A* over the grid. Returns cell indices from start (exclusive) to goal (inclusive).
 * Ties broken by lower f, then lower cell index, so results are deterministic.
 */
export function findPath(nav: NavGrid, sx: number, sy: number, gx: number, gy: number): number[] {
  const start = nearestOpen(nav, cellOf(nav, sx, sy));
  const goal = nearestOpen(nav, cellOf(nav, gx, gy));
  if (start === goal) return [goal];
  const n = nav.cols * nav.rows;
  const g = new Int32Array(n).fill(0x3fffffff);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap: number[] = []; // packed: f * 65536 + idx
  const gc = goal % nav.cols;
  const gr = idiv(goal, nav.cols);
  const h = (i: number): number => {
    const dc = Math.abs((i % nav.cols) - gc);
    const dr = Math.abs(idiv(i, nav.cols) - gr);
    return 10 * (dc + dr) - 6 * Math.min(dc, dr);
  };
  const push = (v: number): void => {
    heap.push(v);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p]! <= heap[i]!) break;
      [heap[p], heap[i]] = [heap[i]!, heap[p]!];
      i = p;
    }
  };
  const pop = (): number => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l]! < heap[m]!) m = l;
        if (r < heap.length && heap[r]! < heap[m]!) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i]!, heap[m]!];
        i = m;
      }
    }
    return top;
  };
  g[start] = 0;
  push(h(start) * 65536 + start);
  let expanded = 0;
  while (heap.length > 0 && expanded < 4000) {
    const cur = pop() % 65536;
    if (closed[cur]) continue;
    closed[cur] = 1;
    expanded++;
    if (cur === goal) break;
    const cc = cur % nav.cols;
    const cr = idiv(cur, nav.cols);
    for (const [dc, dr, cost] of NEIGH) {
      const c = cc + dc;
      const r = cr + dr;
      if (c < 0 || r < 0 || c >= nav.cols || r >= nav.rows) continue;
      const j = r * nav.cols + c;
      if (nav.blocked[j] || closed[j]) continue;
      // No corner cutting.
      if (dc !== 0 && dr !== 0 && (nav.blocked[cr * nav.cols + c] || nav.blocked[r * nav.cols + cc])) continue;
      const ng = g[cur]! + cost * (nav.soft[j] ? 4 : 1);
      if (ng < g[j]!) {
        g[j] = ng;
        came[j] = cur;
        push((ng + h(j)) * 65536 + j);
      }
    }
  }
  if (came[goal] === -1) return [goal];
  const path: number[] = [];
  for (let c = goal; c !== start && c !== -1; c = came[c]!) path.push(c);
  path.reverse();
  return path;
}
