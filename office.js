'use strict';
// Company Pixel Office — layout/system like pixel-office, sprites & animation style from pixel-agents (MIT).
// Read-only view of status.json. No settings, no editor.
const T = 16, COLS = 46, ROWS = 30, TOPM = 16;
const W = COLS * T, H = ROWS * T + TOPM;
const A = 'assets/';

const TEAM = [
  { id: 'david', name: 'David', role_th: 'ซีอีโอ', role_en: 'CEO', pal: 0, hue: 0, color: '#2e5aa8' },
  { id: 'rex', name: 'Rex', role_th: 'ข้อมูลตลาด', role_en: 'Market Data', pal: 1, hue: 0, color: '#23824a' },
  { id: 'lyra', name: 'Lyra', role_th: 'วิจัยสัญญาณ', role_en: 'Quant Research', pal: 2, hue: 0, color: '#c2457a' },
  { id: 'kai', name: 'Kai', role_th: 'ความเสี่ยง', role_en: 'Risk', pal: 3, hue: 0, color: '#c0392b' },
  { id: 'finn', name: 'Finn', role_th: 'ส่งคำสั่ง', role_en: 'Execution', pal: 4, hue: 0, color: '#d07a12' },
  { id: 'jay', name: 'Jay', role_th: 'ปฏิบัติการ', role_en: 'Desk Ops', pal: 5, hue: 0, color: '#7b4fc0' },
  { id: 'quinn', name: 'Quinn', role_th: 'โปรดักต์ / QA', role_en: 'Product & QA', pal: 1, hue: 150, color: '#1f8a8a' },
  { id: 'sage', name: 'Sage', role_th: 'โครงสร้างระบบ', role_en: 'Infra / SRE', pal: 3, hue: 200, color: '#5a6a20' },
];

// ---------- map ----------
const ZONES = {
  main:    { floor: 6, col: { h: 28, s: 45, b: -12, c: -62 } },
  pantry:  { floor: 7, col: { h: 175, s: 30, b: 15, c: -35 } },
  meet:    { floor: 1, col: { h: 209, s: 39, b: -25, c: -60 } },
  lib:     { floor: 3, col: { h: 25, s: 40, b: -10, c: -40 } },
  lounge:  { floor: 2, col: { h: 280, s: 22, b: -15, c: -45 } },
};
const WALL_COL = { h: 214, s: 30, b: -100, c: -55 };
const grid = []; // null = void, 'W' = wall, else zone key
for (let r = 0; r < ROWS; r++) { grid.push([]); for (let c = 0; c < COLS; c++) grid[r].push(null); }
function fillZone(c0, r0, c1, r1, z) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = z; }
fillZone(0, 0, COLS - 1, ROWS - 1, 'W');
fillZone(1, 1, 11, 14, 'pantry'); fillZone(1, 16, 11, 28, 'meet');
fillZone(13, 1, 32, 28, 'main');
fillZone(34, 1, 44, 14, 'lib'); fillZone(34, 16, 44, 28, 'lounge');
// doors
for (const r of [6, 7, 22, 23]) { grid[r][12] = 'main'; grid[r][33] = 'main'; }
for (const c of [5, 6]) grid[15][c] = 'pantry';
for (const c of [39, 40]) grid[15][c] = 'lounge';
const isWall = (c, r) => r >= 0 && c >= 0 && r < ROWS && c < COLS && grid[r][c] === 'W';

// ---------- furniture ----------
// [type, col, row, opts]  opts: mirror, wall (bottom-aligned to wall row), owner
const SPRITES = {
  DESK_FRONT: 'DESK/DESK_FRONT', PC_OFF: 'PC/PC_FRONT_OFF', PC_ON1: 'PC/PC_FRONT_ON_1', PC_ON2: 'PC/PC_FRONT_ON_2', PC_ON3: 'PC/PC_FRONT_ON_3',
  BENCH: 'CUSHIONED_BENCH/CUSHIONED_BENCH', BIN: 'BIN/BIN', BOOKSHELF: 'BOOKSHELF/BOOKSHELF', DBOOK: 'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF',
  CACTUS: 'CACTUS/CACTUS', CLOCK: 'CLOCK/CLOCK', COFFEE: 'COFFEE/COFFEE', CTABLE: 'COFFEE_TABLE/COFFEE_TABLE', HPLANT: 'HANGING_PLANT/HANGING_PLANT',
  LPAINT: 'LARGE_PAINTING/LARGE_PAINTING', LPLANT: 'LARGE_PLANT/LARGE_PLANT', PLANT: 'PLANT/PLANT', PLANT2: 'PLANT_2/PLANT_2', POT: 'POT/POT',
  SPAINT: 'SMALL_PAINTING/SMALL_PAINTING', SPAINT2: 'SMALL_PAINTING_2/SMALL_PAINTING_2', STABLE: 'SMALL_TABLE/SMALL_TABLE_FRONT',
  SOFA_F: 'SOFA/SOFA_FRONT', SOFA_B: 'SOFA/SOFA_BACK', SOFA_S: 'SOFA/SOFA_SIDE', TABLE: 'TABLE_FRONT/TABLE_FRONT', WBOARD: 'WHITEBOARD/WHITEBOARD',
  WCH_F: 'WOODEN_CHAIR/WOODEN_CHAIR_FRONT', WCH_B: 'WOODEN_CHAIR/WOODEN_CHAIR_BACK', WCH_S: 'WOODEN_CHAIR/WOODEN_CHAIR_SIDE', CCH_F: 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT',
};
// footprint rows that block (from the bottom) and kind
const META = {
  DESK_FRONT: { bg: 1, kind: 'desk' }, BENCH: { kind: 'chair' }, BIN: {}, BOOKSHELF: { wallItem: 1 }, DBOOK: {}, CACTUS: { bg: 1 }, CLOCK: { wallItem: 1 },
  COFFEE: { surface: 1 }, CTABLE: { kind: 'desk' }, HPLANT: { wallItem: 1 }, LPAINT: { wallItem: 1 }, LPLANT: { bg: 2 }, PLANT: { bg: 1 }, PLANT2: { bg: 1 }, POT: {},
  SPAINT: { wallItem: 1 }, SPAINT2: { wallItem: 1 }, STABLE: { bg: 1, kind: 'desk' }, SOFA_F: { kind: 'chair' }, SOFA_B: { kind: 'chairback' }, SOFA_S: { kind: 'chair' },
  TABLE: { bg: 1, kind: 'desk' }, WBOARD: { wallItem: 1 }, WCH_F: { bg: 1, kind: 'chair' }, WCH_B: { bg: 1, kind: 'chairback' }, WCH_S: { bg: 1, kind: 'chair' }, CCH_F: { kind: 'chair' },
};
const FURN = [];
const SEATS = {};
const DESKS = [[14, 5], [18, 5], [24, 5], [28, 5], [14, 11], [18, 11], [24, 11], [28, 11]];
const OWNERS = ['rex', 'david', 'lyra', 'kai', 'finn', 'jay', 'quinn', 'sage'];
DESKS.forEach(([c, r], i) => {
  FURN.push({ t: 'DESK_FRONT', c, r });
  FURN.push({ t: 'PC', c: c + 1, r, owner: OWNERS[i] });
  FURN.push({ t: 'BENCH', c: c + 1, r: r + 2 });
  SEATS[OWNERS[i]] = { c: c + 1, r: r + 2 };
});
FURN.push(
  // main room
  { t: 'PLANT', c: 22, r: 5 }, { t: 'PLANT2', c: 22, r: 11 }, { t: 'BIN', c: 17, r: 7 }, { t: 'BIN', c: 27, r: 13 }, { t: 'POT', c: 31, r: 7 },
  { t: 'HPLANT', c: 13, r: 0, wall: 1 }, { t: 'CLOCK', c: 23, r: 0, wall: 1 }, { t: 'WBOARD', c: 25, r: 0, wall: 1 }, { t: 'LPAINT', c: 28, r: 0, wall: 1 }, { t: 'HPLANT', c: 32, r: 0, wall: 1 },
  { t: 'SOFA_F', c: 15, r: 19 }, { t: 'SOFA_S', c: 14, r: 20 }, { t: 'CTABLE', c: 15, r: 20 }, { t: 'SOFA_S', c: 17, r: 20, mirror: 1 }, { t: 'SOFA_B', c: 15, r: 22 }, { t: 'COFFEE', c: 16, r: 20 },
  { t: 'TABLE', c: 22, r: 19 }, { t: 'WCH_S', c: 21, r: 20 }, { t: 'WCH_S', c: 21, r: 21 }, { t: 'WCH_S', c: 25, r: 20, mirror: 1 }, { t: 'WCH_S', c: 25, r: 21, mirror: 1 },
  { t: 'STABLE', c: 29, r: 18 }, { t: 'COFFEE', c: 29, r: 18 }, { t: 'LPLANT', c: 30, r: 25 }, { t: 'PLANT', c: 13, r: 26 }, { t: 'CACTUS', c: 19, r: 26 }, { t: 'BIN', c: 32, r: 28 },
  // pantry
  { t: 'SPAINT', c: 9, r: 0, wall: 1 }, { t: 'CLOCK', c: 11, r: 0, wall: 1 },
  { t: 'STABLE', c: 3, r: 6 }, { t: 'WCH_S', c: 2, r: 6 }, { t: 'WCH_S', c: 5, r: 6, mirror: 1 }, { t: 'COFFEE', c: 3, r: 7 },
  { t: 'STABLE', c: 7, r: 9 }, { t: 'WCH_S', c: 6, r: 9 }, { t: 'WCH_S', c: 9, r: 9, mirror: 1 }, { t: 'COFFEE', c: 8, r: 10 },
  { t: 'PLANT2', c: 1, r: 12 }, { t: 'BIN', c: 11, r: 14 }, { t: 'POT', c: 10, r: 4 },
  // meeting room
  { t: 'WBOARD', c: 2, r: 15, wall: 1 }, { t: 'LPAINT', c: 8, r: 15, wall: 1 },
  { t: 'TABLE', c: 5, r: 20 }, { t: 'WCH_S', c: 4, r: 21 }, { t: 'WCH_S', c: 4, r: 22 }, { t: 'WCH_S', c: 8, r: 21, mirror: 1 }, { t: 'WCH_S', c: 8, r: 22, mirror: 1 },
  { t: 'WCH_F', c: 6, r: 18 }, { t: 'WCH_B', c: 6, r: 24 }, { t: 'PLANT', c: 1, r: 27 }, { t: 'PLANT2', c: 11, r: 27 }, { t: 'BOOKSHELF', c: 1, r: 15, wall: 1 },
  // library / research corner
  { t: 'DBOOK', c: 34, r: 1 }, { t: 'DBOOK', c: 36, r: 1 }, { t: 'DBOOK', c: 41, r: 1 }, { t: 'DBOOK', c: 43, r: 1 }, { t: 'CLOCK', c: 39, r: 0, wall: 1 },
  { t: 'STABLE', c: 38, r: 7 }, { t: 'WCH_S', c: 37, r: 7 }, { t: 'WCH_S', c: 40, r: 7, mirror: 1 }, { t: 'COFFEE', c: 39, r: 8 },
  { t: 'LPLANT', c: 43, r: 11 }, { t: 'CACTUS', c: 34, r: 12 }, { t: 'BIN', c: 34, r: 5 },
  // lounge
  { t: 'SPAINT', c: 36, r: 15, wall: 1 }, { t: 'SPAINT2', c: 43, r: 15, wall: 1 }, { t: 'HPLANT', c: 34, r: 15, wall: 1 },
  { t: 'SOFA_F', c: 38, r: 19 }, { t: 'SOFA_S', c: 37, r: 20 }, { t: 'CTABLE', c: 38, r: 20 }, { t: 'SOFA_S', c: 40, r: 20, mirror: 1 }, { t: 'SOFA_B', c: 38, r: 22 }, { t: 'COFFEE', c: 39, r: 21 },
  { t: 'BENCH', c: 35, r: 26 }, { t: 'BENCH', c: 36, r: 26 }, { t: 'LPLANT', c: 42, r: 25 }, { t: 'PLANT', c: 34, r: 17 }, { t: 'PLANT2', c: 44, r: 17 }, { t: 'BIN', c: 44, r: 28 },
);
// procedural props (pixel-office style): kitchen counter, fridge, water cooler, market screen
const PROPS = [
  { kind: 'counter', c: 1, r: 1, w: 6, h: 2 }, { kind: 'fridge', c: 7, r: 1, w: 1, h: 2 }, { kind: 'cooler', c: 9, r: 1, w: 1, h: 2 },
  { kind: 'screen', c: 14, r: 0, w: 8, h: 1 },
];

// ---------- image loading / colorize ----------
const IMG = {};
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(src); i.src = src; }); }
function toCanvas(img, sx = 0, sy = 0, w = img.width, h = img.height) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, sx, sy, w, h, 0, 0, w, h); return c; }
function hsl2rgb(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1)); let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0]; else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c]; else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2; return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]; }
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; }
  return [h, s, l]; }
function colorize(src, col) { const c = toCanvas(src), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; let L = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    if (col.c) L = 0.5 + (L - 0.5) * (100 + col.c) / 100; if (col.b) L += col.b / 200; L = Math.max(0, Math.min(1, L));
    const [r, gg, b] = hsl2rgb(col.h, col.s / 100, L); p[i] = r; p[i + 1] = gg; p[i + 2] = b; }
  g.putImageData(d, 0, 0); return c; }
function hueShift(src, deg) { const c = toCanvas(src), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; let [h, s, l] = rgb2hsl(p[i], p[i + 1], p[i + 2]);
    if (s < 0.18 || (h >= 5 && h <= 50)) continue; // keep skin/hair/greys
    h = (h + deg) % 360; const [r, gg, b] = hsl2rgb(h, s, l); p[i] = r; p[i + 1] = gg; p[i + 2] = b; }
  g.putImageData(d, 0, 0); return c; }
function flip(cv) { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0); return c; }

const CHARS = {}; // id -> {down:[7],up:[7],right:[7],left:[7]}
let WALLP = [], FLOORC = {};
async function loadAll() {
  const jobs = [];
  for (const [k, p] of Object.entries(SPRITES)) jobs.push(loadImg(A + 'furniture/' + p + '.png').then(i => { IMG[k] = toCanvas(i); }));
  const chImgs = []; for (let i = 0; i < 6; i++) jobs.push(loadImg(A + `characters/char_${i}.png`).then(im => { chImgs[i] = im; }));
  const floorImgs = []; for (let i = 0; i < 9; i++) jobs.push(loadImg(A + `floors/floor_${i}.png`).then(im => { floorImgs[i] = im; }));
  let wallImg; jobs.push(loadImg(A + 'walls/wall_0.png').then(im => { wallImg = im; }));
  await Promise.all(jobs);
  IMG.PC = IMG.PC_OFF;
  const wc = colorize(wallImg, WALL_COL);
  for (let m = 0; m < 16; m++) WALLP[m] = toCanvas(wc, (m % 4) * 16, Math.floor(m / 4) * 32, 16, 32);
  for (const [z, def] of Object.entries(ZONES)) FLOORC[z] = colorize(floorImgs[def.floor], def.col);
  for (const m of TEAM) {
    let sheet = toCanvas(chImgs[m.pal]); if (m.hue) sheet = hueShift(sheet, m.hue);
    const dirs = {}; ['down', 'up', 'right'].forEach((d, di) => { dirs[d] = []; for (let f = 0; f < 7; f++) dirs[d].push(toCanvas(sheet, f * 16, di * 32, 16, 32)); });
    dirs.left = dirs.right.map(flip); CHARS[m.id] = dirs;
  }
}

// ---------- walkability ----------
const blocked = []; for (let r = 0; r < ROWS; r++) blocked.push(new Array(COLS).fill(false));
function buildBlocked() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) blocked[r][c] = grid[r][c] === 'W' || grid[r][c] === null;
  for (const f of FURN) { const meta = META[f.t] || {}; if (f.wall || meta.surface) continue; const im = IMG[f.t]; const fw = im.width / T, fh = im.height / T; const bg = meta.bg || 0;
    for (let dr = bg; dr < fh; dr++) for (let dc = 0; dc < fw; dc++) { const rr = f.r + dr, cc = f.c + dc; if (rr < ROWS && cc < COLS) blocked[rr][cc] = true; } }
  for (const p of PROPS) if (p.kind !== 'screen') for (let dr = 0; dr < p.h; dr++) for (let dc = 0; dc < p.w; dc++) blocked[p.r + dr][p.c + dc] = true;
}
function bfs(sc, sr, tc, tr) {
  const key = (c, r) => r * COLS + c, prev = new Map(); const q = [[sc, sr]]; prev.set(key(sc, sr), -1);
  while (q.length) { const [c, r] = q.shift(); if (c === tc && r === tr) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const k = key(nc, nr); if (prev.has(k)) continue; if (blocked[nr][nc] && !(nc === tc && nr === tr)) continue; prev.set(k, key(c, r)); q.push([nc, nr]); } }
  if (!prev.has(key(tc, tr))) return null; const path = []; let k = key(tc, tr); while (k !== -1 && k !== key(sc, sr)) { path.push([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
  return path.reverse();
}
const ROAM = [];
function buildRoam() { for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) { const z = grid[r][c]; if (!blocked[r][c] && z && z !== 'W' && !(z === 'main' && r < 15)) ROAM.push([c, r]); } }

// ---------- characters ----------
const STATUS = { team: {} };
const people = TEAM.map((m, i) => ({ ...m, x: 0, y: 0, c: 0, r: 0, dir: 'down', state: 'idle', path: [], fT: 0, frame: 0, wait: 1 + Math.random() * 3, want: 'roam', seated: false }));
function place(p, c, r) { p.c = c; p.r = r; p.x = c * T + 8; p.y = r * T + 8; }
function working(p) { const s = STATUS.team[p.id]; return s && String(s.state).toUpperCase() === 'WORKING'; }
function initPeople() { people.forEach(p => { p.want = working(p) ? 'work' : 'roam';
  if (p.want === 'work') { const s = SEATS[p.id]; place(p, s.c, s.r); p.state = 'type'; p.dir = 'up'; p.seated = true; }
  else { const [c, r] = ROAM[Math.floor(Math.random() * ROAM.length)]; place(p, c, r); } }); }
function update(p, dt) {
  p.want = working(p) ? 'work' : 'roam';
  if (p.state === 'walk') {
    const nx = p.path[0]; if (!nx) { arrive(p); return; }
    const tx = nx[0] * T + 8, ty = nx[1] * T + 8, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = 48 * dt;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left'; else if (dy) p.dir = dy > 0 ? 'down' : 'up';
    if (d <= step) { p.x = tx; p.y = ty; p.c = nx[0]; p.r = nx[1]; p.path.shift(); if (!p.path.length) arrive(p); }
    else { p.x += dx / d * step; p.y += dy / d * step; }
    p.fT += dt; if (p.fT > 0.15) { p.fT -= 0.15; p.frame = (p.frame + 1) % 4; }
    return;
  }
  if (p.want === 'work') {
    const s = SEATS[p.id];
    if (p.c === s.c && p.r === s.r) { p.state = 'type'; p.dir = 'up'; p.seated = true; p.fT += dt; if (p.fT > 0.3) { p.fT -= 0.3; p.frame = (p.frame + 1) % 2; } return; }
    go(p, s.c, s.r); return;
  }
  // roam
  if (p.seated) { p.seated = false; p.state = 'idle'; p.wait = 0.5; }
  p.state = 'idle'; p.wait -= dt;
  if (p.wait <= 0) { const [c, r] = ROAM[Math.floor(Math.random() * ROAM.length)]; go(p, c, r); p.wait = 3 + Math.random() * 7; }
}
function go(p, c, r) { const path = bfs(p.c, p.r, c, r); if (path && path.length) { p.path = path; p.state = 'walk'; p.seated = false; } else p.wait = 1; }
function arrive(p) { p.state = 'idle'; p.frame = 0; if (p.want !== 'work') p.dir = Math.random() < .6 ? 'down' : ['left', 'right', 'up'][Math.floor(Math.random() * 3)]; }
function spriteOf(p) { const d = CHARS[p.id][p.dir];
  if (p.state === 'walk') return d[[0, 1, 2, 1][p.frame]];
  if (p.state === 'type') return d[3 + (p.frame % 2)];
  return d[1]; }

// ---------- rendering ----------
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const world = document.createElement('canvas'); world.width = W; world.height = H; const wg = world.getContext('2d');
const floorLayer = document.createElement('canvas'); floorLayer.width = W; floorLayer.height = H;
let mkt = []; for (let i = 0; i < 60; i++) mkt.push(i ? mkt[i - 1] + (Math.random() - .48) * 3 : 20);
function buildFloor() { const g = floorLayer.getContext('2d'); g.fillStyle = '#120c08'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const z = grid[r][c]; if (z && z !== 'W') g.drawImage(FLOORC[z], c * T, r * T + TOPM); }
  // soft shadow under top walls
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] !== 'W' && grid[r][c] && isWall(c, r - 1)) { g.fillStyle = '#0000002a'; g.fillRect(c * T, r * T + TOPM, T, 4); }
}
function wallMask(c, r) { let m = 0; if (isWall(c, r - 1)) m |= 1; if (isWall(c + 1, r)) m |= 2; if (isWall(c, r + 1)) m |= 4; if (isWall(c - 1, r)) m |= 8; return m; }
function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
function drawProp(g, p, t) { const x = p.c * T, y = p.r * T + TOPM;
  if (p.kind === 'counter') { const w = p.w * T; R(g, x, y - 6, w, 10, '#d8d2c4'); R(g, x, y - 6, w, 2, '#f4f0e6'); R(g, x, y + 4, w, 24, '#8a5a3a'); R(g, x, y + 4, w, 2, '#6a4028');
    for (let k = 0; k < p.w; k++) { R(g, x + k * T + 2, y + 8, 12, 18, '#9e6a46'); R(g, x + k * T + 11, y + 15, 2, 4, '#d8c070'); }
    R(g, x + 20, y - 4, 22, 6, '#9aa6b0'); R(g, x + 22, y - 3, 18, 4, '#5a6a7a'); R(g, x + 62, y - 12, 14, 8, '#2a2a2a'); R(g, x + 64, y - 10, 6, 4, '#3fa0ff'); }
  else if (p.kind === 'fridge') { R(g, x + 1, y - 14, 14, 42, '#e8eef2'); R(g, x + 1, y - 14, 14, 1, '#fff'); R(g, x + 1, y + 4, 14, 1, '#aab4bc'); R(g, x + 12, y - 8, 1, 8, '#7a8690'); R(g, x + 12, y + 8, 1, 10, '#7a8690'); R(g, x + 15, y - 14, 1, 42, '#9aa4ac'); }
  else if (p.kind === 'cooler') { R(g, x + 3, y - 10, 10, 10, '#8ad0f4'); R(g, x + 4, y - 9, 3, 7, '#c8ecff'); R(g, x + 2, y, 12, 26, '#e4e8ec'); R(g, x + 5, y + 4, 2, 2, '#e04a4a'); R(g, x + 9, y + 4, 2, 2, '#3a7ae0'); }
  else if (p.kind === 'screen') { const w = p.w * T; R(g, x, y - 14, w, 24, '#1a1a22'); R(g, x + 2, y - 12, w - 4, 20, '#0a1420');
    g.strokeStyle = '#3fe07a'; g.lineWidth = 1; g.beginPath(); const n = mkt.length, off = (t * 4) % 1; for (let i = 0; i < n; i++) { const px = x + 3 + i * (w - 6) / (n - 1), py = y + 6 - (mkt[i] - 10) * 0.6; i ? g.lineTo(px, Math.max(y - 11, Math.min(y + 7, py))) : g.moveTo(px, Math.max(y - 11, Math.min(y + 7, py))); } g.stroke();
    g.fillStyle = '#ffd88a'; g.font = '6px monospace'; g.fillText('BTC-PERP', x + 4, y - 5); R(g, x + w / 2 - 2, y + 10, 4, 3, '#2a2a32'); }
}
function render(t) {
  wg.drawImage(floorLayer, 0, 0);
  const dr = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === 'W') { const s = WALLP[wallMask(c, r)]; dr.push({ z: (r + 1) * T, f: () => wg.drawImage(s, c * T, r * T + TOPM + T - 32) }); }
  const pcFrame = ['PC_ON1', 'PC_ON2', 'PC_ON3'][Math.floor(t * 3) % 3];
  for (const f of FURN) { const meta = META[f.t] || {}; let key = f.t;
    if (f.t === 'PC') { const o = people.find(p => p.id === f.owner); key = o && o.state === 'type' ? pcFrame : 'PC_OFF'; }
    const im = IMG[key]; let x = f.c * T, y = f.r * T + TOPM, z = f.r * T + im.height;
    if (f.wall) { y = (f.r + 1) * T + TOPM - im.height - 2; z = (f.r + 1) * T + 0.6; }
    else if (f.t === 'PC' || meta.surface) z = f.r * T + 32 + 0.5;
    else if (meta.kind === 'chairback') z = (f.r + im.height / T) * T + 1;
    else if (meta.kind === 'chair') z = (f.r + 1) * T;
    dr.push({ z, f: () => { if (f.mirror) { wg.save(); wg.translate(x + im.width, y); wg.scale(-1, 1); wg.drawImage(im, 0, 0); wg.restore(); } else wg.drawImage(im, x, y); } });
  }
  for (const p of PROPS) dr.push({ z: p.kind === 'screen' ? T + 0.7 : (p.r + p.h) * T, f: () => drawProp(wg, p, t) });
  for (const p of people) { const s = spriteOf(p), off = p.state === 'type' ? 6 : 0;
    dr.push({ z: p.y + 8.5, f: () => { if (p === sel) { wg.globalAlpha = .9; outline(s, Math.round(p.x - 8), Math.round(p.y + off - 32 + TOPM)); wg.globalAlpha = 1; }
      wg.fillStyle = '#0003'; wg.beginPath(); wg.ellipse(p.x, p.y + 7 + TOPM, 5, 2, 0, 0, 7); if (p.state !== 'type') wg.fill();
      wg.drawImage(s, Math.round(p.x - 8), Math.round(p.y + off - 32 + TOPM)); } }); }
  dr.sort((a, b) => a.z - b.z); for (const d of dr) d.f();
  // gentle lighting vignette
  const vg = wg.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); vg.addColorStop(0, '#0000'); vg.addColorStop(1, '#0006'); wg.fillStyle = vg; wg.fillRect(0, 0, W, H);
  // blit
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#120c08'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;
  ctx.setTransform(cam.z * dpr, 0, 0, cam.z * dpr, cam.x * dpr, cam.y * dpr); ctx.drawImage(world, 0, 0);
}
const outCache = new Map();
function outline(s, x, y) { let o = outCache.get(s); if (!o) { o = document.createElement('canvas'); o.width = 18; o.height = 34; const g = o.getContext('2d');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(s, dx, dy); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, 18, 34); outCache.set(s, o); }
  wg.drawImage(o, x - 1, y - 1); }

// ---------- camera ----------
let dpr = 1; const cam = { x: 0, y: 0, z: 1 };
function resize() { dpr = window.devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
function fit() { const z = Math.min((innerWidth > 900 ? innerWidth - 260 : innerWidth) / W, (innerHeight - 40) / H); cam.z = z; const spare = innerWidth - W * z; cam.x = innerWidth > 900 ? Math.max(spare / 2, Math.min(250, spare)) : spare / 2; cam.y = Math.max(0, (innerHeight - 30 - H * z) / 2); }
function zoomAt(f, sx, sy) { const nz = Math.max(0.5, Math.min(8, cam.z * f)); cam.x = sx - (sx - cam.x) * nz / cam.z; cam.y = sy - (sy - cam.y) * nz / cam.z; cam.z = nz; }
function focus(p) { const nz = Math.max(cam.z, Math.min(4, innerHeight / 160)); cam.z = nz; cam.x = innerWidth / 2 - p.x * nz; cam.y = innerHeight / 2 - (p.y + TOPM - 12) * nz; }
const toWorld = (sx, sy) => [(sx - cam.x) / cam.z, (sy - cam.y) / cam.z - TOPM];
let drag = null, moved = 0; const ptrs = new Map(); let pinch = null;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 1) { drag = [e.clientX, e.clientY]; moved = 0; } else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } cv.classList.add('drag'); });
cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) { hover(e); return; } ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt(d / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = d; moved = 99; return; }
  if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; cam.x += dx; cam.y += dy; moved += Math.abs(dx) + Math.abs(dy); drag = [e.clientX, e.clientY]; } });
function endPtr(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { cv.classList.remove('drag'); if (drag && moved < 6) click(e.clientX, e.clientY); drag = null; } }
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
cv.addEventListener('dblclick', fit);
document.getElementById('zin').onclick = () => zoomAt(1.25, innerWidth / 2, innerHeight / 2);
document.getElementById('zout').onclick = () => zoomAt(0.8, innerWidth / 2, innerHeight / 2);
document.getElementById('zreset').onclick = fit;
function pick(sx, sy) { const [wx, wy] = toWorld(sx, sy); let best = null; for (const p of people) { const off = p.state === 'type' ? 6 : 0; if (wx >= p.x - 8 && wx <= p.x + 8 && wy >= p.y + off - 26 && wy <= p.y + off + 2) if (!best || p.y > best.y) best = p; } return best; }
function hover(e) { cv.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : ''; }
let sel = null;
function click(sx, sy) { const p = pick(sx, sy); select(p); }
function select(p) { sel = p; const card = document.getElementById('card'); if (!p) { card.classList.add('hidden'); return; } showCard(); card.classList.remove('hidden'); }
document.getElementById('cardx').onclick = () => select(null);
function showCard() { if (!sel) return; const s = STATUS.team[sel.id] || {}; const w = working(sel);
  document.getElementById('cname').innerHTML = `<span style="color:${sel.color}">${sel.name}</span>`;
  document.getElementById('crole').textContent = `${sel.role_th} / ${sel.role_en}`;
  document.getElementById('cstat').textContent = w ? '🟢 ทำงาน · WORKING' : '🟡 ว่าง · IDLE';
  document.getElementById('cact').innerHTML = `${esc(s.task_th || '—')}<br><span style="color:#a8946a">${esc(s.task_en || '')}</span>`;
  const a = document.getElementById('avatar').getContext('2d'); a.clearRect(0, 0, 16, 24); a.drawImage(CHARS[sel.id].down[1], 0, 0, 16, 24, 0, 0, 16, 24); }
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------- HUD ----------
const labels = document.getElementById('labels'); const LBL = {};
function buildHUD() { const menu = document.getElementById('menu');
  for (const p of people) { const b = document.createElement('button'); b.className = 'ib'; b.id = 'ib-' + p.id; const c = document.createElement('canvas'); c.width = 16; c.height = 24; c.getContext('2d').drawImage(CHARS[p.id].down[1], 0, 0, 16, 24, 0, 0, 16, 24);
    b.appendChild(c); const i = document.createElement('i'); i.textContent = p.name; b.appendChild(i); b.onclick = () => { focus(p); select(p); }; menu.appendChild(b);
    const tag = document.createElement('div'); tag.className = 'tag'; tag.innerHTML = `<i></i>${p.name}`; const bub = document.createElement('div'); bub.className = 'bub'; labels.append(bub, tag); LBL[p.id] = { tag, bub }; } }
function placeLabels() { const sc = Math.max(.75, Math.min(1.2, cam.z / 2.2));
  for (const p of people) { const L = LBL[p.id], off = p.state === 'type' ? 6 : 0; const sx = cam.x + p.x * cam.z, top = cam.y + (p.y + off - 30 + TOPM) * cam.z, bot = cam.y + (p.y + off + 4 + TOPM) * cam.z;
    L.tag.style.transform = `translate(${Math.round(sx - L.tag.offsetWidth / 2 * sc)}px,${Math.round(bot)}px) scale(${sc})`; L.tag.style.transformOrigin = '0 0';
    const show = (working(p) && cam.z >= 1.2) || p === sel; L.bub.style.display = show ? '' : 'none';
    if (show) L.bub.style.transform = `translate(${Math.round(sx - L.bub.offsetWidth / 2)}px,${Math.round(top - L.bub.offsetHeight - 8)}px)`; } }
function refreshHUD() { let n = 0;
  for (const p of people) { const s = STATUS.team[p.id] || {}; const w = working(p); if (w) n++; const L = LBL[p.id];
    L.tag.className = 'tag' + (w ? ' w' : ''); L.bub.innerHTML = `<b style="color:${p.color}">${p.name}</b>${w ? '💻 ' : '☕ '}${esc(s.task_th || (w ? 'ทำงาน' : 'ว่าง'))}`;
    document.getElementById('ib-' + p.id).classList.toggle('w', w); }
  document.getElementById('wcount').textContent = `${n}/${people.length} ทำงาน`; document.getElementById('wbar').style.width = (n / people.length * 100) + '%';
  const sys = (STATUS.systems || []).map(s => `${s.ok ? '✅' : '⚠️'} ${esc(s.name)}`).join(' · ');
  document.getElementById('upd').innerHTML = `${sys ? sys + '<br>' : ''}อัปเดต ${esc(STATUS.updated || '—')}`; showCard(); }
async function poll() { try { const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const j = await r.json(); STATUS.team = j.team || {}; STATUS.systems = j.systems; STATUS.updated = j.updated; refreshHUD(); } } catch (e) { } }
function tickClock() { const d = new Date(); document.getElementById('clock').textContent = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }); }

// ---------- main ----------
let last = 0;
function frame(ts) { const t = ts / 1000, dt = Math.min(.05, t - (last || t)); last = t;
  for (const p of people) update(p, dt);
  if (Math.random() < dt * 2) { mkt.shift(); mkt.push(mkt[mkt.length - 1] + (Math.random() - .48) * 3); }
  render(t); placeLabels(); requestAnimationFrame(frame); }
(async () => {
  resize(); fit(); addEventListener('resize', () => { resize(); fit(); });
  await loadAll(); buildBlocked(); buildRoam(); buildFloor(); buildHUD();
  await poll(); initPeople(); refreshHUD(); tickClock(); setInterval(tickClock, 15000); setInterval(poll, 15000);
  setTimeout(() => { const h = document.getElementById('hint'); if (h) h.style.opacity = 0; }, 7000);
  requestAnimationFrame(frame);
})();
