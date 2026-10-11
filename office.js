'use strict';
// Company Pixel Office — layout/system like pixel-office, sprites & animation style from pixel-agents (MIT).
// Read-only view of status.json. No settings, no editor. Luxury hi-tech hacker theme (dark glass, gold + neon).
const T = 16, COLS = 46, ROWS = 30, TOPM = 44;
const W = COLS * T, H = ROWS * T + TOPM;
const A = 'assets/';

const TEAM = [
  { id: 'david', name: 'David', role_en: 'CEO', pal: 0, hue: 0, color: '#2e5aa8' },
  { id: 'rex', name: 'Rex', role_en: 'Market Data', pal: 1, hue: 0, color: '#23824a' },
  { id: 'lyra', name: 'Lyra', role_en: 'Quant Research', pal: 2, hue: 0, color: '#c2457a' },
  { id: 'kai', name: 'Kai', role_en: 'Risk', pal: 3, hue: 0, color: '#c0392b' },
  { id: 'finn', name: 'Finn', role_en: 'Execution', pal: 4, hue: 0, color: '#d07a12' },
  { id: 'jay', name: 'Jay', role_en: 'Desk Ops', pal: 5, hue: 0, color: '#7b4fc0' },
  { id: 'quinn', name: 'Quinn', role_en: 'Product & QA', pal: 1, hue: 150, color: '#1f8a8a' },
  { id: 'sage', name: 'Sage', role_en: 'Infra / SRE', pal: 3, hue: 200, color: '#5a6a20' },
];

// cute speech bubbles: short playful lines per role, picked by status
const LINES = {
  david: { work: ['big picture mode 🧠', 'ship it, team!', 'coffee = strategy ☕', 'all systems go?'], idle: ['thinking like a CEO…', 'who moved my chart?', 'vision board time ✨'] },
  rex:   { work: ['fetching ticks…', 'OI looks spicy 🌶', 'funding check ✔', 'klines go brrr'], idle: ['feed is quiet…', 'waiting on candles 🕯'] },
  lyra:  { work: ['momentum + OI = 💜', 'signal brewing…', 'regime: choppy?', 'backtest says hmm'], idle: ['dreaming of alpha ✨', 'z-score nap time'] },
  kai:   { work: ['risk caps armed 🛡', '$20/day, no more!', 'kill switch ready'], idle: ['guarding the vault 🛡', 'no YOLO allowed', 'all limits green ✔'] },
  finn:  { work: ['post-only, please 🙏', 'adapter humming…', 're-arming dead-man', 'fees counted ✔'], idle: ['orders? none yet', 'finger off the trigger'] },
  jay:   { work: ['heartbeat ok 💓', 'checklist 7/10…', 'monitoring…'], idle: ['daily report soon 📋', 'ops snack break 🍪', 'all quiet on desk'] },
  quinn: { work: ['QA gate check 🔍', 'roadmap tweaks…', 'metrics look neat'], idle: ['waiting for PnL 📈', 'sprint 2 ideas 💡', 'test, test, test'] },
  sage:  { work: ['poller alive ✔', 'uptime 99.9% 😎', 'logs look clean'], idle: ['sudo make coffee ☕', 'watching the droplet', 'zero alerts, nice'] },
};

// ---------- map ----------
const ZONES = {
  main:    { floor: 6, col: { h: 215, s: 22, b: -34, c: -40 }, neon: '#e8c46a' },
  pantry:  { floor: 7, col: { h: 35, s: 30, b: -40, c: -40 }, neon: '#e8c46a' },
  meet:    { floor: 1, col: { h: 222, s: 35, b: -42, c: -40 }, neon: '#4ad8ff' },
  lib:     { floor: 3, col: { h: 175, s: 30, b: -44, c: -40 }, neon: '#00ffd0' },
  lounge:  { floor: 2, col: { h: 285, s: 32, b: -42, c: -40 }, neon: '#d68cff' },
};
const WALL_COL = { h: 220, s: 18, b: -78, c: -45 };
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
  { t: 'WCH_B', c: 20, r: 24 }, { t: 'WCH_B', c: 22, r: 24 }, { t: 'WCH_B', c: 24, r: 24 }, { t: 'WCH_B', c: 26, r: 24 },
  { t: 'STABLE', c: 30, r: 17 }, { t: 'COFFEE', c: 30, r: 17 }, { t: 'LPLANT', c: 31, r: 25 }, { t: 'PLANT', c: 13, r: 26 }, { t: 'CACTUS', c: 14, r: 17 }, { t: 'BIN', c: 32, r: 28 },
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
  { t: 'CLOCK', c: 39, r: 0, wall: 1 },
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
  { kind: 'ticker', c: 20, r: 0, w: 7, h: 1 },
  { kind: 'aquarium', c: 41, r: 16, w: 3, h: 2 },
  { kind: 'board', c: 17, r: 17, w: 12, h: 5 },
  { kind: 'rack', c: 34, r: 1, w: 2, h: 2 }, { kind: 'rack', c: 36, r: 1, w: 2, h: 2 }, { kind: 'rack', c: 41, r: 1, w: 2, h: 2 }, { kind: 'rack', c: 43, r: 1, w: 2, h: 2 },
  { kind: 'rack', c: 34, r: 9, w: 2, h: 2 }, { kind: 'rack', c: 42, r: 6, w: 2, h: 2 },
  { kind: 'neon', c: 4, r: 15, w: 4, text: 'WAR ROOM', col: '#4ad8ff' },
  { kind: 'neon', c: 37, r: 15, w: 5, text: 'VIP LOUNGE', col: '#d68cff' },
  { kind: 'neon', c: 2, r: 0, w: 4, text: 'EXEC BAR', col: '#e8c46a' },
  { kind: 'neon', c: 37, r: 0, w: 4, text: 'SERVER VAULT', col: '#00ffd0' },
  { kind: 'neon', c: 14, r: 0, w: 5, text: 'TRADING FLOOR', col: '#e8c46a' },
  // brass furniture plaques (English only)
  { kind: 'plaque', c: 2, r: 3, text: 'ESPRESSO' }, { kind: 'plaque', c: 7, r: 3, text: 'CHAMPAGNE' }, { kind: 'plaque', c: 9, r: 3, text: 'H2O' },
  { kind: 'plaque', c: 5, r: 23, text: 'BOARDROOM' }, { kind: 'plaque', c: 23, r: 22, text: 'NET VALUE' },
  { kind: 'plaque', c: 35, r: 3, text: 'NODE-01' }, { kind: 'plaque', c: 42, r: 3, text: 'NODE-02' }, { kind: 'plaque', c: 35, r: 11, text: 'COLD STORE' },
  { kind: 'plaque', c: 39, r: 23, text: 'CIGAR SOFA' }, { kind: 'plaque', c: 42, r: 18, text: 'REEF TANK' },
  { kind: 'plaque', c: 38, r: 9, text: 'QUANT BAR' }, { kind: 'plaque', c: 30, r: 19, text: 'VIP CAFE' },
];
const NOBLOCK = { ticker: 1, neon: 1, plaque: 1 };

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
  for (const p of PROPS) if (!NOBLOCK[p.kind]) for (let dr = (p.kind === 'board' ? p.h - 2 : 0); dr < p.h; dr++) for (let dc = 0; dc < p.w; dc++) blocked[p.r + dr][p.c + dc] = true;
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
// wall chart candles (decorative random walk)
const NC = 24, candles = []; let lastPx = 64000;
function newCandle() { const o = candles.length ? candles[candles.length - 1].c : lastPx; return { o, h: o, l: o, c: o, n: 0 }; }
function tickCandle(k) { const cd = candles[candles.length - 1]; const v = cd.c * (Math.random() - .495) * 0.0035 * k; cd.c = Math.max(1000, cd.c + v); cd.h = Math.max(cd.h, cd.c); cd.l = Math.min(cd.l, cd.c); lastPx = cd.c; }
for (let i = 0; i < NC; i++) { candles.push(newCandle()); for (let j = 0; j < 12; j++) tickCandle(1); }
function buildFloor() { const g = floorLayer.getContext('2d'); g.fillStyle = '#0b1018'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const z = grid[r][c]; if (z && z !== 'W') { g.drawImage(FLOORC[z], c * T, r * T + TOPM);
    // neon grid lines every 2 tiles
    g.fillStyle = ZONES[z].neon + '1a'; if (c % 2 === 0) g.fillRect(c * T, r * T + TOPM, 1, T); if (r % 2 === 0) g.fillRect(c * T, r * T + TOPM, T, 1); } }
  // gold inlay runner + cyan cable on the main floor
  g.fillStyle = '#e8c46a40'; g.fillRect(13 * T, 15 * T + TOPM + 6, 20 * T, 1); g.fillRect(13 * T, 15 * T + TOPM + 9, 20 * T, 1); g.fillStyle = '#00ffd030'; g.fillRect(23 * T + 7, 14 * T + TOPM, 2, 3 * T);
  // gold skirting where floor meets wall (luxury trim)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const z = grid[r][c]; if (!z || z === 'W') continue; g.fillStyle = '#e8c46a55';
    if (isWall(c - 1, r)) g.fillRect(c * T, r * T + TOPM, 1, T); if (isWall(c + 1, r)) g.fillRect(c * T + T - 1, r * T + TOPM, 1, T); if (isWall(c, r + 1)) g.fillRect(c * T, r * T + TOPM + T - 1, T, 1); }
  // soft shadow under top walls
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] !== 'W' && grid[r][c] && isWall(c, r - 1)) { g.fillStyle = '#0000001e'; g.fillRect(c * T, r * T + TOPM, T, 3); }
}
function wallMask(c, r) { let m = 0; if (isWall(c, r - 1)) m |= 1; if (isWall(c + 1, r)) m |= 2; if (isWall(c, r + 1)) m |= 4; if (isWall(c - 1, r)) m |= 8; return m; }
function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
function drawProp(g, p, t) { const x = p.c * T, y = p.r * T + TOPM;
  if (p.kind === 'counter') { const w = p.w * T; R(g, x, y - 6, w, 10, '#3a3a44'); R(g, x, y - 6, w, 2, '#e8c46a'); R(g, x, y + 4, w, 24, '#1c1a20'); R(g, x, y + 4, w, 2, '#e8c46a88');
    for (let k = 0; k < p.w; k++) { R(g, x + k * T + 2, y + 8, 12, 18, '#1c2630'); R(g, x + k * T + 11, y + 15, 2, 4, '#e8c46a'); }
    for (let k = 0; k < 5; k++) { const bx = x + 76 + k * 4, cl = ['#2a6a3a', '#7a1a2a', '#c8a040', '#2a4a7a', '#e8e0c8'][k]; R(g, bx, y - 14, 3, 8, cl); R(g, bx + 1, y - 17, 1, 3, cl); }
    R(g, x + 20, y - 4, 22, 6, '#9aa6b0'); R(g, x + 22, y - 3, 18, 4, '#5a6a7a'); R(g, x + 62, y - 12, 14, 8, '#2a2a2a'); R(g, x + 64, y - 10, 6, 4, '#3fa0ff'); }
  else if (p.kind === 'fridge') { R(g, x + 1, y - 14, 14, 42, '#22262e'); R(g, x + 1, y - 14, 14, 1, '#e8c46a'); R(g, x + 1, y + 4, 14, 1, '#aab4bc'); R(g, x + 12, y - 8, 1, 8, '#7a8690'); R(g, x + 12, y + 8, 1, 10, '#7a8690'); R(g, x + 15, y - 14, 1, 42, '#9aa4ac'); }
  else if (p.kind === 'cooler') { R(g, x + 3, y - 10, 10, 10, '#8ad0f4'); R(g, x + 4, y - 9, 3, 7, '#c8ecff'); R(g, x + 2, y, 12, 26, '#1a2430'); R(g, x + 5, y + 4, 2, 2, '#e04a4a'); R(g, x + 9, y + 4, 2, 2, '#3a7ae0'); }
  else if (p.kind === 'ticker') { const x0 = x + 4, w = p.w * T - 8, y0 = TOPM - 20, h = 30;
    R(g, x0 - 3, y0 - 2, w + 6, h + 4, '#05080c'); R(g, x0 - 2, y0 - 1, w + 4, h + 2, '#e8c46a'); R(g, x0 - 1, y0, w + 2, h, '#010c0a'); R(g, x0, y0 + 1, w, h - 2, '#020f12');
    const cy0 = y0 + 8, ch = h - 10; // chart area (top strip is the DOM header)
    for (let k = 0; k <= 4; k++) R(g, x0 + 1, cy0 + Math.round(k * ch / 4), w - 2, 1, '#00ffd012');
    for (let k = 0; k < 10; k++) R(g, x0 + Math.round(k * w / 10), cy0, 1, ch, '#00ffd00c');
    let lo = Infinity, hi = -Infinity; for (const cd of candles) { lo = Math.min(lo, cd.l); hi = Math.max(hi, cd.h); } const pad = (hi - lo) * .08 + 1; lo -= pad; hi += pad;
    const Y = v => cy0 + ch - (v - lo) / (hi - lo) * ch, cw = (w - 12) / NC;
    candles.forEach((cd, i) => { const up = cd.c >= cd.o, col = up ? '#39ff88' : '#ff3e6a', cx = x0 + 2 + i * cw;
      R(g, Math.round(cx + cw / 2 - .5), Math.round(Y(cd.h)), 1, Math.max(1, Math.round(Y(cd.l) - Y(cd.h))), col);
      const top = Math.round(Y(Math.max(cd.o, cd.c))), bot = Math.round(Y(Math.min(cd.o, cd.c))); R(g, Math.round(cx + 1), top, Math.max(2, Math.round(cw - 2)), Math.max(1, bot - top), col); });
    const ly = Math.round(Y(lastPx)); for (let xx = x0 + 2; xx < x0 + w - 10; xx += 4) R(g, xx, ly, 2, 1, '#ffd84a88'); R(g, x0 + w - 9, ly - 2, 8, 5, '#ffd84a');
    
    // stand-in scanlines
    for (let yy = y0 + 1; yy < y0 + h - 1; yy += 2) R(g, x0, yy, w, 1, '#0000002a'); }
  else if (p.kind === 'board') { const w = p.w * T, bx = x, by = y - 10, bh = (p.h - 1) * T + 4;
    R(g, bx + 10, by + bh, 4, 26, '#1a2228'); R(g, bx + w - 14, by + bh, 4, 26, '#1a2228'); R(g, bx + 4, by + bh + 24, 16, 4, '#0c1216'); R(g, bx + w - 20, by + bh + 24, 16, 4, '#0c1216');
    g.fillStyle = '#e8c46a1c'; g.fillRect(bx - 10, by + bh + 28, w + 20, 6);
    R(g, bx - 3, by - 3, w + 6, bh + 6, '#05080c'); R(g, bx - 2, by - 2, w + 4, bh + 4, Math.floor(t * 1.5) % 2 ? '#e8c46a' : '#c8a040'); R(g, bx, by, w, bh, '#010806');
    // dot-matrix LED background
    for (let yy = by + 2; yy < by + bh - 1; yy += 3) for (let xx = bx + 2; xx < bx + w - 1; xx += 3) R(g, xx, yy, 1, 1, '#0b2a20');
    // marquee strip
    const mq = by + bh - 9; R(g, bx + 1, mq, w - 2, 8, '#02140e'); const off = (t * 18) % 24; for (let xx = bx + 2 - off; xx < bx + w - 2; xx += 24) if (xx > bx) R(g, xx, mq + 3, 10, 2, '#39ff8866');
    R(g, bx + 4, by + 3, 3, 3, Math.floor(t * 2) % 2 ? '#ff3e6a' : '#4a0a18'); }
  else if (p.kind === 'rack') { const rx = x + 2, ry = y - 12, rw = p.w * T - 4, rh = p.h * T + 10;
    R(g, rx, ry, rw, rh, '#0a0f14'); R(g, rx, ry, rw, 1, '#2a3a46'); R(g, rx + 1, ry + 1, rw - 2, rh - 2, '#111a22');
    for (let k = 0; k < 7; k++) { const yy = ry + 3 + k * 5; R(g, rx + 3, yy, rw - 6, 3, '#1c2832');
      for (let j = 0; j < 4; j++) { const on = Math.sin(t * (3 + j + k) + p.c * 7 + k * 3 + j) > 0.2; R(g, rx + 5 + j * 3, yy + 1, 1, 1, on ? (j % 3 ? '#39ff88' : '#00ffd0') : '#0d2a1a'); }
      R(g, rx + rw - 7, yy + 1, 3, 1, Math.sin(t * 9 + k) > .6 ? '#ffb020' : '#3a2a10'); } }
  else if (p.kind === 'aquarium') { const ax = x + 1, ay = y - 10, aw = p.w * T - 2, ah = 24;
    R(g, ax - 1, ay - 1, aw + 2, ah + 2, '#e8c46a'); R(g, ax, ay, aw, ah, '#0a3a5a'); R(g, ax, ay, aw, 3, '#4ad8ff66'); R(g, ax, ay + ah - 4, aw, 4, '#c8a878');
    for (let k = 0; k < 4; k++) { const fx = ax + 4 + ((t * (6 + k * 3) + k * 13) % (aw - 10)), fy = ay + 6 + k * 4; R(g, fx, fy, 4, 2, ['#ff8a3a', '#ffd84a', '#ff5aa8', '#7affd8'][k]); R(g, fx - 1, fy, 1, 2, '#ffffff55'); }
    for (let k = 0; k < 3; k++) R(g, ax + 6 + k * 13, ay + ah - 4 - ((t * 9 + k * 7) % (ah - 6)), 1, 1, '#bff4ff');
    R(g, ax, ay + ah + 1, aw, 12, '#1c1a20'); R(g, ax, ay + ah + 1, aw, 1, '#e8c46a'); }
  else if (p.kind === 'plaque') { const tw = Math.max(20, p.text.length * 5 + 6), px = x + 8 - tw / 2, py = p.r * T + TOPM + 11;
    R(g, px, py, tw, 8, '#14110c'); R(g, px, py, tw, 1, '#e8c46a'); R(g, px, py + 7, tw, 1, '#8a6a2a');
    g.save(); g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.fillStyle = '#f7e3a0'; g.fillText(p.text, px + tw / 2, py + 6); g.restore(); }
  else if (p.kind === 'neon') { const nx = x, ny = TOPM + p.r * T + (p.r === 0 ? -14 : 2), nw = p.w * T, fl = Math.random() < .02 ? .3 : 1;
    g.save(); g.globalAlpha = fl; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.shadowColor = p.col; g.shadowBlur = 6; g.fillStyle = p.col; g.fillText(p.text, nx + nw / 2, ny + 10); g.shadowBlur = 0; g.fillStyle = '#ffffffcc'; g.fillText(p.text, nx + nw / 2, ny + 10); g.restore(); }
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
  for (const p of PROPS) dr.push({ z: NOBLOCK[p.kind] ? (p.r + 1) * T + 0.8 : (p.r + p.h) * T, f: () => drawProp(wg, p, t) });
  for (const p of people) { const s = spriteOf(p), off = p.state === 'type' ? 6 : 0;
    dr.push({ z: p.y + 8.5, f: () => { if (p === sel) { wg.globalAlpha = .9; outline(s, Math.round(p.x - 8), Math.round(p.y + off - 32 + TOPM)); wg.globalAlpha = 1; }
      wg.fillStyle = '#0003'; wg.beginPath(); wg.ellipse(p.x, p.y + 7 + TOPM, 5, 2, 0, 0, 7); if (p.state !== 'type') wg.fill();
      wg.drawImage(s, Math.round(p.x - 8), Math.round(p.y + off - 32 + TOPM)); } }); }
  dr.sort((a, b) => a.z - b.z); for (const d of dr) d.f();
  // neon glow from active monitors + the board
  wg.save(); wg.globalCompositeOperation = 'lighter';
  for (const f of FURN) if (f.t === 'PC') { const o = people.find(p => p.id === f.owner); if (!o || o.state !== 'type') continue; const gx = f.c * T + 8, gy = f.r * T + TOPM + 10;
    const gr = wg.createRadialGradient(gx, gy, 1, gx, gy, 22); gr.addColorStop(0, '#00ffd040'); gr.addColorStop(1, '#00ffd000'); wg.fillStyle = gr; wg.fillRect(gx - 22, gy - 22, 44, 44); }
  { const gx = 23 * T, gy = 18 * T + TOPM, gr = wg.createRadialGradient(gx, gy, 10, gx, gy, 130); gr.addColorStop(0, '#e8c46a22'); gr.addColorStop(1, '#e8c46a00'); wg.fillStyle = gr; wg.fillRect(gx - 130, gy - 130, 260, 260); }
  wg.restore();
  const vg = wg.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); vg.addColorStop(0, '#0000'); vg.addColorStop(1, '#0005'); wg.fillStyle = vg; wg.fillRect(0, 0, W, H);
  // blit
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#080c12'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;
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
function zoomNow(f, sx, sy) { const nz = Math.max(0.5, Math.min(8, cam.z * f)); cam.x = sx - (sx - cam.x) * nz / cam.z; cam.y = sy - (sy - cam.y) * nz / cam.z; cam.z = nz; }
// gentle smooth zoom: requests accumulate into a target, eased a little each frame
const zt = { f: 1, sx: 0, sy: 0 };
function zoomAt(f, sx, sy) { zt.f = Math.max(0.5, Math.min(2, zt.f * f)); zt.sx = sx; zt.sy = sy; }
function zoomStep(dt) { if (Math.abs(zt.f - 1) < 0.0005) { zt.f = 1; return; } const k = 1 - Math.exp(-dt * 7), step = Math.pow(zt.f, k); zoomNow(step, zt.sx, zt.sy); zt.f /= step; }
function focus(p) { const nz = Math.max(cam.z, Math.min(4, innerHeight / 160)); cam.z = nz; cam.x = innerWidth / 2 - p.x * nz; cam.y = innerHeight / 2 - (p.y + TOPM - 12) * nz; }
const toWorld = (sx, sy) => [(sx - cam.x) / cam.z, (sy - cam.y) / cam.z - TOPM];
let drag = null, moved = 0; const ptrs = new Map(); let pinch = null;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 1) { drag = [e.clientX, e.clientY]; moved = 0; } else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } cv.classList.add('drag'); });
cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) { hover(e); return; } ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomNow(Math.pow(d / pinch, 0.6), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = d; moved = 99; return; }
  if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; cam.x += dx; cam.y += dy; moved += Math.abs(dx) + Math.abs(dy); drag = [e.clientX, e.clientY]; } });
function endPtr(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { cv.classList.remove('drag'); if (drag && moved < 6) click(e.clientX, e.clientY); drag = null; } }
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.0011), e.clientX, e.clientY); }, { passive: false });
cv.addEventListener('dblclick', () => { zt.f = 1; fit(); });
document.getElementById('zin').onclick = () => zoomAt(1.12, innerWidth / 2, innerHeight / 2);
document.getElementById('zout').onclick = () => zoomAt(1 / 1.12, innerWidth / 2, innerHeight / 2);
document.getElementById('zreset').onclick = () => { zt.f = 1; fit(); };
function pick(sx, sy) { const [wx, wy] = toWorld(sx, sy); let best = null; for (const p of people) { const off = p.state === 'type' ? 6 : 0; if (wx >= p.x - 8 && wx <= p.x + 8 && wy >= p.y + off - 26 && wy <= p.y + off + 2) if (!best || p.y > best.y) best = p; } return best; }
function hover(e) { cv.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : ''; }
let sel = null;
function click(sx, sy) { const p = pick(sx, sy); select(p); }
function select(p) { sel = p; const card = document.getElementById('card'); if (!p) { card.classList.add('hidden'); return; } showCard(); card.classList.remove('hidden'); }
document.getElementById('cardx').onclick = () => select(null);
function showCard() { if (!sel) return; const s = STATUS.team[sel.id] || {}; const w = working(sel);
  document.getElementById('cname').innerHTML = `<span style="color:${sel.color}">${sel.name}</span>`;
  document.getElementById('crole').textContent = sel.role_en;
  document.getElementById('cstat').textContent = w ? '🟢 WORKING' : '🟡 IDLE';
  document.getElementById('cact').textContent = s.task_en || '—';
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
    const show = cam.z >= 0.7 || p === sel; L.bub.style.display = show ? '' : 'none';
    if (show) { L.bub.style.transformOrigin = '50% 100%'; L.bub.style.transform = `translate(${Math.round(sx - L.bub.offsetWidth / 2)}px,${Math.round(top - L.bub.offsetHeight - 6)}px) scale(${sc})`; } } }
const OV = [];
function overlay(id, wx, wy, ww, wh) { const el = document.getElementById(id); el.style.width = ww + 'px'; el.style.height = wh + 'px'; OV.push({ el, wx, wy }); }
function placeOverlays() { for (const o of OV) o.el.style.transform = `translate(${cam.x + o.wx * cam.z}px,${cam.y + o.wy * cam.z}px) scale(${cam.z})`; }
const money = v => (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function refreshBoard() { const nv = STATUS.net_value || {}; const v = Number(nv.usd), d = Number(nv.day_pnl_usd);
  document.getElementById('bval').textContent = isFinite(v) ? money(v) : '$—';
  const de = document.getElementById('bday'); de.textContent = isFinite(d) ? (d >= 0 ? '+' : '') + money(d).replace('-', '−') : '—'; de.className = d > 0 ? 'up' : d < 0 ? 'dn' : '';
  document.getElementById('bnote').textContent = nv.as_of ? `● LIVE EQUITY · POLYMARKET PERPS · ${nv.as_of}` : ''; }
function tickTicker() { const last = candles[candles.length - 1], first = candles[0]; const ch = (last.c - first.o) / first.o * 100;
  document.getElementById('tpx').textContent = last.c.toLocaleString('en-US', { maximumFractionDigits: 1 });
  const e = document.getElementById('tch'); e.textContent = (ch >= 0 ? '▲ ' : '▼ ') + ch.toFixed(2) + '%'; e.className = ch >= 0 ? 'up' : 'dn'; }
let bubK = 0;
function bubText(p) { const s = STATUS.team[p.id] || {}, w = working(p), L = LINES[p.id] || { work: [], idle: [] };
  const pool = (w ? L.work : L.idle).concat(s.task_en ? [s.task_en] : []); if (!pool.length) return w ? 'working…' : 'chilling…';
  const i = (bubK + people.indexOf(p) * 3) % pool.length; const kind = (bubK + people.indexOf(p)) % 3; return { line: pool[i], icon: w ? (kind ? '💬' : '💻') : (kind ? '💭' : '☕') }; }
function refreshBubbles() { for (const p of people) { const b = bubText(p), L = LBL[p.id]; if (!L) continue; L.bub.className = 'bub' + (b.icon === '💭' ? ' think' : '');
  L.bub.innerHTML = `<span class="bi">${b.icon}</span> ${esc(b.line)}`; } }
function refreshHUD() { refreshBoard(); refreshBubbles(); let n = 0;
  for (const p of people) { const w = working(p); if (w) n++; const L = LBL[p.id];
    L.tag.className = 'tag' + (w ? ' w' : '');
    document.getElementById('ib-' + p.id).classList.toggle('w', w); }
  document.getElementById('wcount').textContent = `${n}/${people.length} ONLINE`; document.getElementById('wbar').style.width = (n / people.length * 100) + '%';
  const sys = (STATUS.systems || []).map(s => `${s.ok ? '✅' : '⚠️'} ${esc(s.name)}`).join(' · ');
  document.getElementById('upd').innerHTML = `${sys ? sys + '<br>' : ''}SYNC ${esc(STATUS.updated || '—')}`; showCard(); }
async function poll() { try { const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const j = await r.json(); STATUS.team = j.team || {}; STATUS.systems = j.systems; STATUS.updated = j.updated; STATUS.net_value = j.net_value; refreshHUD(); } } catch (e) { } }
function tickClock() { const d = new Date(); document.getElementById('clock').textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }); }

// ---------- main ----------
let last = 0, candleT = 0, tkT = 0;
function frame(ts) { const t = ts / 1000, dt = Math.min(.05, t - (last || t)); last = t;
  for (const p of people) update(p, dt); zoomStep(dt);
  if (Math.random() < dt * 6) tickCandle(1); candleT += dt; if (candleT > 2.5) { candleT = 0; candles.shift(); candles.push(newCandle()); }
  if ((tkT += dt) > .4) { tkT = 0; tickTicker(); }
  render(t); placeLabels(); placeOverlays(); requestAnimationFrame(frame); }
(async () => {
  resize(); fit(); addEventListener('resize', () => { resize(); fit(); });
  await loadAll(); buildBlocked(); buildRoam(); buildFloor(); buildHUD();
  overlay('ovTicker', 20 * T + 4, TOPM - 20, 7 * T - 8, 8); overlay('ovBoard', 17 * T, 17 * T + TOPM - 10, 12 * T, 4 * T - 6);
  await poll(); initPeople(); refreshHUD(); tickClock(); setInterval(tickClock, 15000); setInterval(poll, 60000); setInterval(() => { bubK++; refreshBubbles(); }, 5000);
  setTimeout(() => { const h = document.getElementById('hint'); if (h) h.style.opacity = 0; }, 7000);
  requestAnimationFrame(frame);
})();
