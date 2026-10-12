'use strict';
// Trading HQ — pixel headquarters of an autonomous Polymarket Perps trading team.
// Read-only view of status.json (team status + REAL account equity). Decorative screens are decorative.
// Character sprites & a few furniture sprites from pixel-agents (MIT, see LICENSE-pixel-agents-MIT).
// Everything else (architecture, materials, lighting, props) is drawn procedurally.
const T = 16, COLS = 46, ROWS = 30, TOPM = 40, S = 2;
const W = COLS * T, H = ROWS * T + TOPM;
const A = 'assets/';

// Six-person desk. ids match status.json → team. Sprites are six different pixel-agents sheets.
const TEAM = [
  { id: 'lead', name: 'Desk Lead', role_en: 'Team lead', blurb: 'The only one who talks to the CEO.', pal: 0, color: '#e2b657' },
  { id: 'quant', name: 'Quant', role_en: 'Strategy & engine', blurb: 'Writes and deploys strategy and engine code.', pal: 1, color: '#5ef2d6' },
  { id: 'critic', name: 'Critic', role_en: 'Code review', blurb: 'Reviews code and approves file hashes.', pal: 2, color: '#c79bff' },
  { id: 'risk', name: 'Risk Watch', role_en: 'Health & loss cap', blurb: 'Monitors health checks and the 15% daily loss cap.', pal: 3, color: '#ff7a85' },
  { id: 'scout', name: 'Scout', role_en: 'Trading ideas', blurb: 'Finds trading ideas.', pal: 4, color: '#ffb35c' },
  { id: 'ops', name: 'Ops', role_en: 'Ledger & reports', blurb: 'Ledger, the daily 07:30 report, and expected vs actual.', pal: 5, color: '#8fb4ff' },
];

// short ambient lines (English only). The live task is shown on the card and on select.
const LINES = {
  lead:   { work: ['v3 install, together', 'go-live needs a yes', 'I will brief the CEO', 'hold steady, desk'], idle: ['line to the CEO is quiet', 'waiting on a decision'] },
  quant:  { work: ['DRY_RUN, deploying…', 'engine code landing', 'v3 bits on the box', 'strategy compiling'], idle: ['no live orders yet', 'backtests in my head'] },
  critic: { work: ['checking the hashes', 'manifest, line by line', 'no unsigned files', 'this diff is clean'], idle: ['red pen is capped', 'waiting on a build'] },
  risk:   { work: ['15% cap is armed', 'heartbeat looks good', 'health checks green'], idle: ['waiting on heartbeat', 'loss cap stays 15%', 'no pulse yet… zzz'] },
  scout:  { work: ['idea net is open', 'scanning for a setup'], idle: ['ideas on hold', 'back when we are live', 'notebook stays shut'] },
  ops:    { work: ['ledger is current', '07:30 report staged', 'expected vs actual', 'refreshing the office'], idle: ['report clock is 07:30', 'books can wait'] },
};

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- map ----------
const grid = [];
for (let r = 0; r < ROWS; r++) { grid.push([]); for (let c = 0; c < COLS; c++) grid[r].push('W'); }
function fillZone(c0, r0, c1, r1, z) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = z; }
fillZone(1, 1, 11, 14, 'bar'); fillZone(1, 16, 11, 28, 'war');
fillZone(13, 1, 32, 28, 'floor');
fillZone(34, 1, 44, 14, 'vault'); fillZone(34, 16, 44, 28, 'lounge');
const DOORS = [];
for (const r of [6, 7, 22, 23]) { grid[r][12] = 'floor'; grid[r][33] = 'floor'; DOORS.push([12, r, 'v'], [33, r, 'v']); }
for (const c of [5, 6]) { grid[15][c] = 'bar'; DOORS.push([c, 15, 'h']); }
for (const c of [39, 40]) { grid[15][c] = 'lounge'; DOORS.push([c, 15, 'h']); }
const isWall = (c, r) => r >= 0 && c >= 0 && r < ROWS && c < COLS && grid[r][c] === 'W';
const wallOrOut = (c, r) => r < 0 || c < 0 || r >= ROWS || c >= COLS || grid[r][c] === 'W';

// ---------- drawing helpers ----------
function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
function rr(g, x, y, w, h, rad, col) { g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, rad) : g.rect(x, y, w, h); g.fill(); }
function ell(g, cx, cy, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); }
function glow(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
const GOLD = '#c9a35c', GOLD_HI = '#f0d9a0', BRASS_D = '#7a5f32';

// Bangkok local time drives the skyline. Interior stays obsidian; the windows and a window-wash carry the hour.
// Night numbers are the locked after-dark look. Day lifts the interior; dawn and dusk are blended between the stops below.
const SKY = {
  night: { top: '#070b18', mid: '#151532', bot: '#2a1c38', far: '#131a2c', near: '#0a0d18', star: .55, winOn: 1, antenna: true, winWarm: 'rgba(255,207,122,.9)', winCool: 'rgba(159,216,255,.85)', ambient: '#68707f', lamp: 1.08, wash: '#6e8ec4', washA: .2, moon: true, sun: '#fff6c2', lift: 0, sunInk: '#fff4dc' },
  dawn:  { top: '#4a3a62', mid: '#e08a78', bot: '#f6c9a4', far: '#8a6a78', near: '#4a3848', star: .14, winOn: .32, antenna: false, winWarm: 'rgba(255,207,122,.75)', winCool: 'rgba(159,216,255,.4)', ambient: '#7c756e', lamp: .96, wash: '#ffb090', washA: .34, moon: false, sun: '#ffe0b0', lift: .4, sunInk: '#ffd2ae' },
  day:   { top: '#6aabe6', mid: '#b7d6f6', bot: '#e8f3fc', far: '#93a8be', near: '#5c7086', star: 0, winOn: .04, antenna: false, winWarm: 'rgba(255,244,220,.55)', winCool: 'rgba(210,230,255,.4)', ambient: '#8e97a4', lamp: 1.02, wash: '#ffc98a', washA: .55, moon: false, sun: '#fff6c2', lift: 1, sunInk: '#ffc56a' },
  late:  { top: '#6e9ed4', mid: '#e7c49a', bot: '#f4d2a6', far: '#9a8876', near: '#6a5848', star: 0, winOn: .1, antenna: false, winWarm: 'rgba(255,214,150,.7)', winCool: 'rgba(230,210,180,.35)', ambient: '#948676', lamp: 1.02, wash: '#ffb15e', washA: .62, moon: false, sun: '#ffcc88', lift: 1, sunInk: '#f0a04a' },
  dusk:  { top: '#2c2450', mid: '#d15a48', bot: '#f0a36a', far: '#6a4558', near: '#3a2434', star: .16, winOn: .7, antenna: true, winWarm: 'rgba(255,196,120,.9)', winCool: 'rgba(180,200,255,.55)', ambient: '#756c78', lamp: 1.02, wash: '#ff9a70', washA: .38, moon: false, sun: '#ffd0a0', lift: .32, sunInk: '#ffb080' },
};
// Night and midday hold. Dawn, late afternoon, and dusk ease between the stops.
const SKY_STOPS = [[0, 'night'], [5, 'night'], [6.2, 'dawn'], [7.25, 'day'], [14.25, 'day'], [16.6, 'late'], [17.7, 'dusk'], [19.45, 'night'], [24, 'night']];
let bkkT = 14, phase = 'day', currentPal = SKY.day;
function parseCol(c) {
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
  const p = c.replace(/[rgba()]/g, '').split(',').map(s => Number(s.trim()));
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
function mixCol(a, b, k) {
  const A = parseCol(a), B = parseCol(b), c = A.map((v, i) => v + (B[i] - v) * k);
  if (c[3] > .995) { const h = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'); return '#' + h(c[0]) + h(c[1]) + h(c[2]); }
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
}
function mixPal(a, b, k) {
  const lerp = (x, y) => x + (y - x) * k, o = {};
  for (const key of ['top', 'mid', 'bot', 'far', 'near', 'ambient', 'wash', 'sun', 'sunInk', 'winWarm', 'winCool']) o[key] = mixCol(a[key], b[key], k);
  o.star = lerp(a.star, b.star); o.winOn = lerp(a.winOn, b.winOn); o.lamp = lerp(a.lamp, b.lamp); o.washA = lerp(a.washA, b.washA);
  o.lift = lerp(a.lift || 0, b.lift || 0);
  o.moonA = lerp(a.moon ? 1 : 0, b.moon ? 1 : 0); o.sunA = lerp(a.moon ? 0 : 1, b.moon ? 0 : 1);
  o.antennaA = lerp(a.antenna ? 1 : 0, b.antenna ? 1 : 0);
  o.moon = o.moonA >= .5; o.antenna = o.antennaA >= .5;
  return o;
}
function paletteAt(t) {
  let i = 0; while (i < SKY_STOPS.length - 1 && t >= SKY_STOPS[i + 1][0]) i++;
  const [t0, n0] = SKY_STOPS[i], [t1, n1] = SKY_STOPS[i + 1];
  if (n0 === n1 || t1 === t0) return SKY[n0];
  const k = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))), s = k * k * (3 - 2 * k);
  return mixPal(SKY[n0], SKY[n1], s);
}
function syncPal() { currentPal = paletteAt(bkkT); return currentPal; }
function bangkokNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const h = Number(parts.find(p => p.type === 'hour').value);
  const m = Number(parts.find(p => p.type === 'minute').value);
  return { h, m, t: h + m / 60, label: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') };
}
function phaseOf(t) {
  if (t >= 5.25 && t < 7) return 'dawn';
  if (t >= 7 && t < 17.25) return 'day';
  if (t >= 17.25 && t < 19.25) return 'dusk';
  return 'night';
}
function readPhase() { const bk = bangkokNow(); bkkT = bk.t; phase = phaseOf(bk.t); return bk; }

// ---------- sprites ----------
const SPRITES = {
  PLANT: 'PLANT/PLANT', PLANT2: 'PLANT_2/PLANT_2', LPLANT: 'LARGE_PLANT/LARGE_PLANT', HPLANT: 'HANGING_PLANT/HANGING_PLANT',
  SOFA_F: 'SOFA/SOFA_FRONT', SOFA_B: 'SOFA/SOFA_BACK', SOFA_S: 'SOFA/SOFA_SIDE', CTABLE: 'COFFEE_TABLE/COFFEE_TABLE',
  WCH_F: 'WOODEN_CHAIR/WOODEN_CHAIR_FRONT', WCH_B: 'WOODEN_CHAIR/WOODEN_CHAIR_BACK', WCH_S: 'WOODEN_CHAIR/WOODEN_CHAIR_SIDE', COFFEE: 'COFFEE/COFFEE',
};
const TINT = { WCH_F: { h: 24, s: 14, b: -52, c: 20 }, WCH_B: { h: 24, s: 14, b: -52, c: 20 }, WCH_S: { h: 24, s: 14, b: -52, c: 20 },
  SOFA_F: { h: 352, s: 48, b: -36, c: 10 }, SOFA_B: { h: 352, s: 48, b: -36, c: 10 }, SOFA_S: { h: 352, s: 48, b: -36, c: 10 }, CTABLE: { h: 24, s: 30, b: -44, c: 10 } };
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
    if (s < 0.18 || (h >= 5 && h <= 50)) continue; h = (h + deg) % 360; const [r, gg, b] = hsl2rgb(h, s, l); p[i] = r; p[i + 1] = gg; p[i + 2] = b; }
  g.putImageData(d, 0, 0); return c; }
function flip(cv) { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0); return c; }
const CHARS = {};
async function loadAll(progress) {
  const jobs = []; let done = 0; let total = 1; const tick = () => progress(++done / total);
  for (const [k, p] of Object.entries(SPRITES)) jobs.push(loadImg(A + 'furniture/' + p + '.png').then(i => { IMG[k] = TINT[k] ? colorize(i, TINT[k]) : toCanvas(i); tick(); }));
  const chImgs = []; for (const i of [...new Set(TEAM.map(m => m.pal))]) jobs.push(loadImg(A + `characters/char_${i}.png`).then(im => { chImgs[i] = im; tick(); }));
  total = jobs.length + 1;
  jobs.push((document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()).then(tick));
  await Promise.all(jobs);
  for (const m of TEAM) {
    let sheet = toCanvas(chImgs[m.pal]); if (m.hue) sheet = hueShift(sheet, m.hue);
    const dirs = {}; ['down', 'up', 'right'].forEach((d, di) => { dirs[d] = []; for (let f = 0; f < 7; f++) dirs[d].push(toCanvas(sheet, f * 16, di * 32, 16, 32)); });
    dirs.left = dirs.right.map(flip); CHARS[m.id] = dirs;
  }
}

// ---------- scene items ----------
// item: { z, draw(g,t), block:[c,r,w,h], shadow:[x,y,w,h], lit:[[x,y,w,h]] emissive rects, litOn():bool, lights:[[x,y,r,col,a]], bloom(g,t) }
const ITEMS = [];
const item = o => (ITEMS.push(o), o);
const SEATS = {};
const OWNERS = TEAM.map(m => m.id);
// two rows of three, with a walkway between — one desk per deskmate
const DESKS = [[14, 4], [20, 4], [26, 4], [14, 10], [20, 10], [26, 10]];
let people = [];
const ownerTyping = id => { const p = people.find(q => q.id === id); return !!(p && p.state === 'type'); };

function sprite(key, c, r, o = {}) {
  return item({ key, c, r, block: o.block, shadow: o.shadow, zo: o.z, mirror: o.mirror,
    get z() { return this.zo != null ? this.zo : this.r * T + IMG[this.key].height; },
    draw(g) { const im = IMG[this.key], x = c * T + (o.dx || 0), y = r * T + TOPM + (o.dy || 0);
      if (this.mirror) { g.save(); g.translate(x + im.width, y); g.scale(-1, 1); g.drawImage(im, 0, 0); g.restore(); } else g.drawImage(im, x, y); } });
}
const plant = (c, r) => sprite('PLANT', c, r, { block: [c, r + 1, 1, 1], shadow: [c * T + 3, r * T + TOPM + 26, 10, 5] });
const plant2 = (c, r) => sprite('PLANT2', c, r, { block: [c, r + 1, 1, 1], shadow: [c * T + 3, r * T + TOPM + 26, 10, 5] });
const bigPlant = (c, r) => sprite('LPLANT', c, r, { block: [c, r + 2, 2, 1], shadow: [c * T + 6, r * T + TOPM + 41, 20, 6] });

// --- decorative screen content ---
function screen(g, x, y, w, h, mode, on, t, seed = 0) {
  if (!on) { R(g, x, y, w, h, '#06090c'); g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * .5, y); g.lineTo(x + w * .7, y); g.lineTo(x + w * .2, y + h); g.fill(); return; }
  R(g, x, y, w, h, '#03100f');
  const k = Math.floor(t * 2 + seed);
  if (mode === 0) {
    const n = Math.floor(w / 2.5); for (let i = 0; i < n; i++) { const v = Math.sin((i + k) * 1.7 + seed) * .5 + Math.sin((i + k) * .45 + seed * 3) * .5;
      const up = Math.sin((i + k) * 2.3 + seed) > -.1, ch = 1.5 + Math.abs(v) * (h * .35), cy = y + h * .55 - v * h * .28;
      R(g, x + 1 + i * 2.5, cy - ch / 2, 1.5, ch, up ? '#3ddc97' : '#ff5d73'); } }
  else if (mode === 1) {
    g.beginPath(); for (let i = 0; i <= w; i += 1) { const v = Math.sin((i + t * 6 + seed * 9) * .35) * .3 + Math.sin((i + t * 3) * .11 + seed) * .4; const yy = y + h * .5 - v * h * .45; i ? g.lineTo(x + i, yy) : g.moveTo(x, yy); }
    g.strokeStyle = '#5ef2d6'; g.lineWidth = .6; g.stroke(); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.fillStyle = 'rgba(94,242,214,.12)'; g.fill(); }
  else if (mode === 2) {
    for (let i = 0; i < Math.floor(h / 1.5); i++) { const a = (Math.sin(i * 1.3 + k * .7 + seed) * .5 + .5) * w * .45, b = (Math.cos(i * 1.1 + k * .6 + seed) * .5 + .5) * w * .45;
      R(g, x + w / 2 - a, y + .5 + i * 1.5, a, 1, 'rgba(61,220,151,.75)'); R(g, x + w / 2, y + .5 + i * 1.5, b, 1, 'rgba(255,93,115,.75)'); } }
  else if (mode === 3) {
    const r = mulberry(seed * 31 + 7); for (let i = 0; i < Math.floor(h / 1.6); i++) { const ind = Math.floor(r() * 3) * 1.5, ln = 2 + r() * (w - 5); R(g, x + 1 + ind, y + .8 + i * 1.6, Math.min(ln, w - 2 - ind), .8, r() < .25 ? '#5ef2d6' : r() < .3 ? GOLD : 'rgba(200,215,225,.55)'); }
    if (Math.floor(t * 2) % 2) R(g, x + 3, y + h - 2, 1.5, 1, '#5ef2d6'); }
  else {
    const cols = Math.max(3, Math.floor(w / 3)), rows = Math.max(2, Math.floor(h / 3)); for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const v = Math.sin(i * 1.9 + j * 2.7 + t * .8 + seed);
      R(g, x + .5 + i * (w / cols), y + .5 + j * (h / rows), w / cols - .6, h / rows - .6, v > 0 ? `rgba(61,220,151,${.25 + v * .6})` : `rgba(255,93,115,${.25 - v * .6})`); } }
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, y, w, h * .35);
}

function workstation(c, r, owner, idx, opt = {}) {
  const x = c * T, y = r * T + TOPM, w = (opt.w || 3) * T;
  const mons = opt.mons || [[x + 7, y - 7, 15, 10], [x + 26, y - 7, 15, 10]];
  const on = () => !!opt.always || ownerTyping(owner);
  return item({ z: (r + 2) * T, block: [c, r, opt.w || 3, 2], shadow: [x + 1, y + 21, w - 2, 9],
    lit: mons.map(m => [m[0] - 1, m[1] - 1, m[2] + 2, m[3] + 2]), litOn: on,
    lights: mons.map(m => [m[0] + m[2] / 2, m[1] + m[3] + 6, 26, '#8fe9ff', .32]),
    draw(g, t) {
      R(g, x + 1, y + 14, w - 2, 11, '#22180f'); for (let k = x + 3; k < x + w - 2; k += 2.5) R(g, k, y + 15, .5, 9, 'rgba(0,0,0,.28)');
      R(g, x + 1, y + 24.5, w - 2, .5, '#0a0806');
      R(g, x, y + 2, w, 13, '#15171c'); R(g, x, y + 2, w, .5, '#3d424d'); R(g, x, y + 14.5, w, .5, GOLD); R(g, x, y + 15, w, .5, BRASS_D);
      g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x + 2, y + 3, w * .45, 3);
      R(g, x + w / 2 - 8, y + 9, 16, 3.5, '#23272f'); for (let k = 0; k < 7; k++) R(g, x + w / 2 - 7 + k * 2.1, y + 9.8, 1.4, .7, '#3a3f4a'); for (let k = 0; k < 6; k++) R(g, x + w / 2 - 6.4 + k * 2.1, y + 11, 1.4, .7, '#3a3f4a');
      rr(g, x + w / 2 + 10, y + 9.5, 2.6, 3.4, 1.2, '#2a2e36');
      ell(g, x + 6, y + 10, 1.8, 1.3, '#ece6da'); ell(g, x + 6, y + 9.8, 1.1, .7, '#3a2416');
      if (idx % 3 === 1) { R(g, x + w - 9, y + 8, 6, 4.5, '#1d2a3a'); R(g, x + w - 9, y + 8, .6, 4.5, GOLD); }
      for (const [mx, my, mw, mh] of mons) {
        R(g, mx + mw / 2 - 1, my + mh, 2, 4, '#0c0d10'); R(g, mx + mw / 2 - 4, my + mh + 3.2, 8, 1.4, '#0c0d10');
        rr(g, mx - 1, my - 1, mw + 2, mh + 2, .8, '#07080a'); R(g, mx - .5, my - 1, mw + 1, .4, '#454b57');
        screen(g, mx, my, mw, mh, (idx + (mx > x + 20 ? 2 : 0)) % 5, on(), t, idx * 3 + (mx > x + 20 ? 1 : 0));
      }
      R(g, x + w / 2 - 6, y + 18, 12, 3, '#b8955a'); R(g, x + w / 2 - 6, y + 18, 12, .5, GOLD_HI); R(g, x + w / 2 - 6, y + 20.5, 12, .5, BRASS_D);
    } });
}
function chair(c, r) { const x = c * T, y = r * T + TOPM;
  return item({ z: r * T + 16.6, block: [c, r, 1, 1], shadow: [x + 2, y + 10, 12, 5], draw(g) {
    for (const dx of [3, 6, 10, 13]) R(g, x + dx - .5, y + 13.5, 1, 1, '#08090b');
    R(g, x + 7.5, y + 11, 1, 3, '#2b2f37');
    rr(g, x + 2, y + 6.5, 12, 5.5, 1.5, '#1d2026');
    rr(g, x + 3, y + 2, 10, 10.5, 2.5, '#16181d'); R(g, x + 4, y + 2.4, 8, .5, '#41464f'); R(g, x + 7.75, y + 4, .5, 7, 'rgba(201,163,92,.45)');
  } }); }
function bench(c, r, n) { const x = c * T, y = r * T + TOPM, w = n * T;
  return item({ z: (r + 1) * T, block: [c, r, n, 1], shadow: [x + 1, y + 9, w - 2, 6], draw(g) {
    R(g, x + 3, y + 11, 1, 3, GOLD); R(g, x + w - 4, y + 11, 1, 3, GOLD);
    rr(g, x + 1, y + 3, w - 2, 8.5, 2, '#1c1e24'); R(g, x + 2, y + 3.4, w - 4, .5, '#454a54');
    for (let k = x + T; k < x + w - 2; k += T) R(g, k, y + 4, .5, 6.5, 'rgba(0,0,0,.4)');
    R(g, x + 1, y + 11, w - 2, .5, GOLD);
  } }); }
function roundTable(c, r) { const cx = c * T + 8, cy = r * T + TOPM + 8;
  return item({ z: (r + 1) * T, block: [c, r, 1, 1], shadow: [cx - 6, cy + 3, 12, 5], draw(g) {
    R(g, cx - .8, cy, 1.6, 6, GOLD); ell(g, cx, cy + 6.3, 3, 1, BRASS_D);
    ell(g, cx, cy, 7.5, 4.8, GOLD); ell(g, cx, cy - .3, 7, 4.3, '#14161a'); ell(g, cx - 2, cy - 1.6, 3, 1.2, 'rgba(255,255,255,.06)');
    ell(g, cx + 2.5, cy - .5, 1, .8, '#ece6da'); R(g, cx - 3, cy - 1.5, .7, 2, 'rgba(240,217,160,.8)');
  } }); }
function stool(c, r) { const cx = c * T + 8, cy = r * T + TOPM + 7;
  return item({ z: (r + 1) * T - 1, block: [c, r, 1, 1], shadow: [cx - 4, cy + 4, 8, 4], draw(g) {
    R(g, cx - .5, cy + 1, 1, 6, '#2b2f37'); ell(g, cx, cy + 7, 2.6, .9, GOLD); ell(g, cx, cy, 4.2, 2.8, '#1a1c22'); ell(g, cx, cy - .4, 3.4, 2, '#24272e');
  } }); }
function floorLamp(c, r) { const cx = c * T + 8, by = r * T + TOPM + 13;
  return item({ z: (r + 1) * T, block: [c, r, 1, 1], shadow: [cx - 4, by - 2, 8, 4], lit: [[cx - 4, by - 26, 8, 6]], litOn: () => true,
    lights: [[cx, by - 6, 64, '#ffc27a', .85]], draw(g) {
      ell(g, cx, by, 3.5, 1.3, '#0f1013'); R(g, cx - .4, by - 20, .8, 20, GOLD);
      g.fillStyle = '#efe0bf'; g.beginPath(); g.moveTo(cx - 2.6, by - 26); g.lineTo(cx + 2.6, by - 26); g.lineTo(cx + 4, by - 20); g.lineTo(cx - 4, by - 20); g.fill(); R(g, cx - 4, by - 20.4, 8, .5, '#fff4d6');
    }, bloom(g) { glow(g, cx, by - 23, 14, '#ffcf8a', .35); } }); }
function art(x, y, w, h, z, kind) {
  return item({ z, lights: [[x + w / 2, y + h + 8, 30, '#ffe2b0', .4]], draw(g) {
    R(g, x - 1.5, y - 1.5, w + 3, h + 3, GOLD); R(g, x - 1.5, y - 1.5, w + 3, .5, GOLD_HI); R(g, x - .5, y - .5, w + 1, h + 1, '#0c0d10');
    if (kind === 0) { R(g, x + 1, y + 1, w - 2, h - 2, '#101114'); g.fillStyle = '#c9a35c'; g.beginPath(); g.arc(x + w * .62, y + h * .45, h * .28, 0, 7); g.fill(); R(g, x + 3, y + h * .72, w - 6, .5, '#e8d6a8'); R(g, x + 3, y + h * .72 + 2, w * .4, .5, '#5a5f6a'); }
    else { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#1a2133'); gr.addColorStop(1, '#3a2a2a'); g.fillStyle = gr; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = '#0b0d12'; for (let i = 0; i < 9; i++) { const bw = 2 + (i * 7 % 4), bh = 3 + (i * 5 % 8); g.fillRect(x + 1 + i * (w - 2) / 9, y + h - 1 - bh, bw, bh); } R(g, x + w * .7, y + 3, 2, 2, '#f0d9a0'); }
    R(g, x + w / 2 - 4, y - 4, 8, 1.2, '#2b2f37');
  }, bloom(g) { glow(g, x + w / 2, y - 3, 10, '#ffe2b0', .25); } });
}

// --- decorative wall chart (small, no labels) ---
const NC = 22, candles = []; let lastPx = 64000;
function newCandle() { const o = candles.length ? candles[candles.length - 1].c : lastPx; return { o, h: o, l: o, c: o }; }
function tickCandle() { const cd = candles[candles.length - 1]; const v = cd.c * (Math.random() - .495) * .0035; cd.c = Math.max(1000, cd.c + v); cd.h = Math.max(cd.h, cd.c); cd.l = Math.min(cd.l, cd.c); lastPx = cd.c; }
for (let i = 0; i < NC; i++) { candles.push(newCandle()); for (let j = 0; j < 12; j++) tickCandle(); }
function wallChart(x, y, w, h, z) {
  return item({ z, lit: [[x, y, w, h]], litOn: () => true, lights: [[x + w / 2, y + h + 14, 40, '#8fe9ff', .35]], draw(g) {
    R(g, x + w * .25, y - 6, .6, 6, '#2b2f37'); R(g, x + w * .75, y - 6, .6, 6, '#2b2f37');
    rr(g, x - 2, y - 2, w + 4, h + 4, 1.5, '#07080a'); R(g, x - 1.5, y - 2, w + 3, .4, '#4a505c'); R(g, x - 2, y + h + 1.6, w + 4, .4, GOLD);
    R(g, x, y, w, h, '#020c0d');
    for (let k = 1; k < 4; k++) R(g, x, y + k * h / 4, w, .3, 'rgba(94,242,214,.08)');
    let lo = Infinity, hi = -Infinity; for (const cd of candles) { lo = Math.min(lo, cd.l); hi = Math.max(hi, cd.h); } const pad = (hi - lo) * .1 + 1; lo -= pad; hi += pad;
    const Y = v => y + 2 + (h - 4) * (1 - (v - lo) / (hi - lo)), cw = (w - 8) / NC;
    candles.forEach((cd, i) => { const col = cd.c >= cd.o ? '#3ddc97' : '#ff5d73', cx = x + 2 + i * cw;
      R(g, cx + cw / 2 - .25, Y(cd.h), .5, Math.max(.5, Y(cd.l) - Y(cd.h)), col);
      const top = Y(Math.max(cd.o, cd.c)), bot = Y(Math.min(cd.o, cd.c)); R(g, cx + .4, top, Math.max(1, cw - .8), Math.max(.5, bot - top), col); });
    const ly = Y(lastPx); for (let xx = x + 1; xx < x + w - 5; xx += 2) R(g, xx, ly, 1, .3, 'rgba(240,217,160,.6)'); R(g, x + w - 5, ly - 1, 4.5, 2, GOLD);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, y, w, h * .4);
  }, bloom(g) { glow(g, x + w / 2, y + h / 2, w * .6, '#5ef2d6', .08); } });
}

// --- exec bar ---
function barCounter() { const x = 1 * T, y = 2 * T + TOPM, w = 7 * T;
  return item({ z: 4 * T, block: [1, 2, 7, 2], shadow: [x, y + 26, w, 6], draw(g) {
    R(g, x, y + 12, w, 16, '#22180f'); for (let k = x + 2; k < x + w; k += 2.5) R(g, k, y + 13, .6, 14, 'rgba(0,0,0,.3)');
    R(g, x, y + 23.5, w, .8, GOLD); R(g, x, y + 27.5, w, .5, '#0a0806');
    R(g, x, y + 1, w, 12, '#1b1c21'); R(g, x, y + 1, w, .5, '#4a4f5a'); R(g, x, y + 12.5, w, .6, GOLD);
    g.strokeStyle = 'rgba(240,217,160,.12)'; g.lineWidth = .4; g.beginPath(); g.moveTo(x + 8, y + 3); g.bezierCurveTo(x + 30, y + 10, x + 50, y + 2, x + 80, y + 9); g.moveTo(x + 60, y + 2); g.lineTo(x + 100, y + 11); g.stroke();
    rr(g, x + 5, y - 3, 14, 10, 1, '#9aa3ad'); R(g, x + 5, y - 3, 14, 1, '#d8dee4'); R(g, x + 7, y + 3, 3, 2, '#2b2f37'); R(g, x + 13, y + 3, 3, 2, '#2b2f37'); R(g, x + 6, y - 1, 12, .5, '#5a636d');
    for (let k = 0; k < 4; k++) { R(g, x + 34 + k * 4, y + 3, 1.6, 4, 'rgba(230,240,245,.55)'); R(g, x + 34.5 + k * 4, y + 7, .6, 1.5, 'rgba(230,240,245,.55)'); }
    ell(g, x + 62, y + 6, 5, 3, '#aeb6bd'); ell(g, x + 62, y + 5.5, 4, 2.2, '#dfe5ea'); R(g, x + 61, y - 3, 2, 8, '#1f3b2a'); R(g, x + 61, y - 4, 2, 1.5, GOLD);
    rr(g, x + 80, y + 3, 10, 6, 1, '#101114'); R(g, x + 82, y + 4.5, 6, .6, GOLD);
    ell(g, x + 98, y + 6, 3, 2, '#ece6da');
  } }); }
function backBar() { const x = 1 * T, y = TOPM - 14, w = 7 * T, h = 28;
  return item({ z: T + .3, lit: [[x + 1, y + 1, w - 2, h - 4]], litOn: () => true, lights: [[x + w / 2, y + h + 18, 70, '#ffb35c', .55]], draw(g) {
    R(g, x, y, w, h, '#0b0c0f');
    const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#2a1a0c'); gr.addColorStop(.5, '#6b4520'); gr.addColorStop(1, '#2a1a0c'); g.fillStyle = gr; g.fillRect(x + 1.5, y + 1.5, w - 3, h - 5);
    const rnd = mulberry(11); const pal = ['#8a4a12', '#2f5a34', '#d9c9a0', '#6a1424', '#b07a2a', '#1d2a3f'];
    for (const sh of [y + 11, y + 21.5]) { R(g, x + 1.5, sh, w - 3, .6, '#f0d9a0');
      for (let bx = x + 3; bx < x + w - 4; bx += 3 + rnd() * 2) { const bh = 5 + rnd() * 3.5, col = pal[Math.floor(rnd() * pal.length)]; R(g, bx, sh - bh, 2, bh, col); R(g, bx + .6, sh - bh - 1.5, .8, 1.5, col); R(g, bx + .3, sh - bh + 1, .4, bh - 2, 'rgba(255,255,255,.35)'); } }
    R(g, x, y + h - 3.5, w, 3.5, '#121318'); R(g, x, y + h - 3.5, w, .5, GOLD);
  }, bloom(g) { glow(g, x + w / 2, y + h / 2, w * .55, '#ffb35c', .1); } }); }
function wineFridge(c, r) { const x = c * T + 1, y = r * T + TOPM - 12, w = 14, h = 2 * T + 9;
  return item({ z: (r + 2) * T, block: [c, r, 1, 2], shadow: [x - 1, y + h - 3, w + 2, 5], lit: [[x + 2, y + 3, w - 4, h - 9]], litOn: () => true, lights: [[x + w / 2, y + h + 4, 28, '#ffb35c', .4]], draw(g) {
    rr(g, x, y, w, h, 1, '#101216'); R(g, x, y, w, .5, '#4a4f5a');
    R(g, x + 2, y + 3, w - 4, h - 9, '#3b250f'); for (let k = 0; k < 7; k++) { const yy = y + 5 + k * 4; R(g, x + 2, yy + 2, w - 4, .4, 'rgba(240,217,160,.4)'); for (let j = 0; j < 3; j++) ell(g, x + 4.5 + j * 2.8, yy + 1, 1.1, 1.1, ['#5a1020', '#2f5a34', '#c9a35c'][(k + j) % 3]); }
    R(g, x + w - 3.2, y + 8, .7, 10, GOLD); R(g, x + 1, y + h - 5, w - 2, .5, GOLD);
  } }); }
function pendant(cx, cy) { return item({ z: -1, draw() {}, lights: [[cx, cy + 16, 48, '#ffd29a', .7]], bloom(g) { glow(g, cx, cy, 9, '#ffd29a', .3); ell(g, cx, cy, 2.6, 1.6, '#f6e2b8'); ell(g, cx, cy - .4, 2.6, 1, GOLD); } }); }

// --- war room ---
function confTable() { const x = 4 * T + 2, y = 19 * T + TOPM, w = 4 * T - 4, h = 6 * T - 4;
  return item({ z: 25 * T, block: [4, 19, 4, 6], shadow: [x - 1, y + h - 2, w + 2, 8], draw(g, t) {
    R(g, x + 1, y + h - 4, w - 2, 5, '#1d1610'); R(g, x + 1, y + h, w - 2, .5, '#0a0806');
    rr(g, x, y, w, h - 3, 2, GOLD); rr(g, x + .6, y + .6, w - 1.2, h - 4.2, 1.6, '#111317');
    R(g, x + w / 2 - .25, y + 4, .5, h - 12, 'rgba(201,163,92,.6)');
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x + 2, y + 2, w * .4, h - 8);
    ell(g, x + w / 2, y + 14, 5, 2.5, '#0b0d10'); ell(g, x + w / 2, y + 14, 3.6, 1.6, 'rgba(94,242,214,.6)');
    for (let k = 0; k < 3; k++) { const a = t * .8 + k * 2.1; ell(g, x + w / 2 + Math.cos(a) * 3, y + 11.5 + Math.sin(a) * 1.2, .7, .7, '#5ef2d6'); }
    for (const [tx, ty] of [[x + 4, y + 18], [x + 4, y + 50], [x + w - 10, y + 18], [x + w - 10, y + 50], [x + w / 2 - 3, y + 4], [x + w / 2 - 3, y + h - 15]]) { R(g, tx, ty, 6, 4, '#1a1d24'); R(g, tx + .5, ty + .5, 5, 3, '#0d2224'); }
    for (const [gx, gy] of [[x + 12, y + 26], [x + w - 13, y + 40], [x + 12, y + 56]]) ell(g, gx, gy, 1.2, 1.2, 'rgba(230,240,245,.6)');
  }, bloom(g, t) { glow(g, x + w / 2, y + 12, 16, '#5ef2d6', .12 + .04 * Math.sin(t * 2)); } }); }
function wallScreen(x, y, w, h, z) {
  return item({ z, lit: [[x, y, w, h]], litOn: () => true, lights: [[x + w / 2, y + h + 14, 50, '#8fe9ff', .4]], draw(g, t) {
    rr(g, x - 2, y - 2, w + 4, h + 4, 1.5, '#07080a'); R(g, x - 2, y + h + 1.5, w + 4, .5, GOLD);
    R(g, x, y, w, h, '#03100f');
    screen(g, x + 1, y + 1, w * .58, h - 2, 4, true, t, 5);
    screen(g, x + w * .6 + 1, y + 1, w * .4 - 2, (h - 3) / 2, 1, true, t, 2);
    screen(g, x + w * .6 + 1, y + h / 2 + .5, w * .4 - 2, (h - 3) / 2, 0, true, t, 9);
  }, bloom(g) { glow(g, x + w / 2, y + h / 2, w * .6, '#5ef2d6', .07); } });
}
// --- server vault ---
function rack(c, r) { const x = c * T + 1, y = r * T + TOPM - 14, w = 2 * T - 2, h = 2 * T + 12;
  return item({ z: (r + 2) * T, block: [c, r, 2, 2], shadow: [x - 1, y + h - 3, w + 2, 6], lit: [[x + 2, y + 5, w - 4, h - 9]], litOn: () => true,
    lights: [[x + w / 2, y + h + 6, 30, '#5ef2d6', .3]], draw(g, t) {
      R(g, x, y, w, h, '#0a0c10'); R(g, x, y, w, 4, '#1b1f27'); R(g, x, y, w, .5, '#4a505c'); R(g, x, y + 4, w, .4, '#050608');
      R(g, x + 1.5, y + 5, w - 3, h - 8, '#0e1116');
      for (let k = 0; k < 9; k++) { const yy = y + 6 + k * 3.8; R(g, x + 2.5, yy, w - 5, 3, '#141820'); R(g, x + 2.5, yy, w - 5, .3, '#262c36');
        for (let j = 0; j < 5; j++) { const on = Math.sin(t * (2 + j * .7 + k * .3) + c * 7 + k * 3 + j * 1.7) > .1; R(g, x + 4 + j * 2, yy + 1.2, .9, .9, on ? (j === 4 ? '#ffb547' : j % 2 ? '#3ddc97' : '#5ef2d6') : '#16241f'); }
        R(g, x + w - 9, yy + 1.2, 5, .6, 'rgba(255,255,255,.08)'); }
      R(g, x + w - 2.5, y + 12, .6, 12, GOLD); R(g, x, y + h - 1, w, 1, '#050608');
    } }); }
// --- lounge ---
function aquarium(c, r) { const x = c * T + 1, y = r * T + TOPM - 14, w = 3 * T - 2, th = 22;
  return item({ z: (r + 2) * T, block: [c, r, 3, 2], shadow: [x - 1, y + 38, w + 2, 6], lit: [[x, y, w, th]], litOn: () => true, lights: [[x + w / 2, y + th + 12, 60, '#4ad8ff', .55]], draw(g, t) {
    R(g, x - 1, y - 1, w + 2, th + 2, '#0c0d10'); const gr = g.createLinearGradient(0, y, 0, y + th); gr.addColorStop(0, '#0f6a8a'); gr.addColorStop(1, '#06283a'); g.fillStyle = gr; g.fillRect(x, y, w, th);
    R(g, x, y, w, 1.5, 'rgba(160,240,255,.5)'); R(g, x, y + th - 3, w, 3, '#b8a27a');
    for (let k = 0; k < 4; k++) { const sx = x + 6 + k * 11; for (let j = 0; j < 4; j++) R(g, sx + Math.sin(t * 1.5 + j + k) * .8, y + th - 4 - j * 2.2, 1, 2.2, '#1f8a5a'); }
    const fc = ['#ff8a3a', '#ffd84a', '#ff5aa8', '#7affd8', '#ffffff'];
    for (let k = 0; k < 5; k++) { const sp = 5 + k * 2.3, fx = x + 3 + ((t * sp + k * 17) % (w - 9)), fy = y + 5 + k * 2.8 + Math.sin(t * 2 + k) * .8; R(g, fx, fy, 3.5, 1.6, fc[k]); R(g, fx - 1, fy + .3, 1, 1, fc[k]); }
    for (let k = 0; k < 4; k++) R(g, x + 5 + k * 12, y + th - 4 - ((t * 7 + k * 5) % (th - 6)), .7, .7, '#d8f8ff');
    R(g, x, y + th + 1, w, 14, '#15171c'); R(g, x, y + th + 1, w, .6, GOLD); for (let k = 1; k < 3; k++) R(g, x + k * w / 3, y + th + 3, .4, 10, '#0a0b0e');
  }, bloom(g) { glow(g, x + w / 2, y + th / 2, w * .7, '#4ad8ff', .1); } }); }
function sideTable(c, r) { const cx = c * T + 8, cy = r * T + TOPM + 9;
  return item({ z: (r + 1) * T, block: [c, r, 1, 1], shadow: [cx - 5, cy + 2, 10, 4], draw(g) {
    R(g, cx - 5, cy - 2, 10, 6, '#15171c'); R(g, cx - 5, cy - 2, 10, .5, GOLD); R(g, cx - 4, cy + 4, .8, 3, GOLD); R(g, cx + 3.2, cy + 4, .8, 3, GOLD);
    R(g, cx - 3, cy - 6, 1.6, 4, '#3a2a12'); R(g, cx - 2.6, cy - 7.5, .8, 1.5, GOLD); R(g, cx + 1, cy - 4, 1.4, 2.5, 'rgba(230,240,245,.6)');
  } }); }

// ---------- build the scene ----------
DESKS.forEach(([c, r], i) => { workstation(c, r, OWNERS[i], i); chair(c + 1, r + 2); SEATS[OWNERS[i]] = { c: c + 1, r: r + 2 }; });
plant2(18, 7); plant2(24, 7); plant(31, 6); plant(13, 16); plant(32, 16);
bigPlant(13, 25); bigPlant(31, 25);
// centre of the floor: exactly one desk per teammate above; below, a client lounge instead of spare desks
sprite('SOFA_F', 22, 18, { block: [22, 18, 2, 1], z: 19 * T }); sprite('SOFA_S', 21, 19, { block: [21, 19, 1, 2], z: 21 * T });
sprite('SOFA_S', 24, 19, { mirror: 1, block: [24, 19, 1, 2], z: 21 * T }); sprite('CTABLE', 22, 19, { block: [22, 19, 2, 2], z: 21 * T - 1 });
sprite('SOFA_B', 22, 21, { block: [22, 21, 2, 1], z: 22 * T }); sprite('COFFEE', 22, 19, { z: 21 * T - .5, dx: 8, dy: 6 });
floorLamp(20, 18); floorLamp(26, 18); plant2(17, 19); plant2(28, 19);
bench(18, 24, 4); bench(25, 24, 4);
wallChart(20 * T + 6, TOPM - 13, 6 * T - 12, 22, T + .4);
roundTable(30, 19); sprite('COFFEE', 30, 18, { z: 20 * T + .1, dy: 3 });
backBar(); barCounter(); wineFridge(9, 1); bigPlant(10, 1);
stool(2, 4); stool(4, 4); stool(6, 4);
roundTable(4, 8); sprite('WCH_S', 3, 7, { block: [3, 8, 1, 1], z: 9 * T - .5 }); sprite('WCH_S', 5, 7, { mirror: 1, block: [5, 8, 1, 1], z: 9 * T - .5 });
roundTable(8, 11); sprite('WCH_S', 7, 10, { block: [7, 11, 1, 1], z: 12 * T - .5 }); sprite('WCH_S', 9, 10, { mirror: 1, block: [9, 11, 1, 1], z: 12 * T - .5 });
pendant(4 * T + 8, 8 * T + TOPM - 10); pendant(8 * T + 8, 11 * T + TOPM - 10);
plant(1, 12); plant2(10, 12);
art(1 * T + 6, 15 * T + TOPM - 13, 26, 16, 16 * T + .3, 0);
confTable();
wallScreen(7 * T + 3, 15 * T + TOPM - 12, 5 * T - 6, 24, 16 * T + .3);
for (const r of [20, 23]) { sprite('WCH_S', 3, r - 1, { block: [3, r, 1, 1], z: (r + 1) * T - .5 }); sprite('WCH_S', 8, r - 1, { mirror: 1, block: [8, r, 1, 1], z: (r + 1) * T - .5 }); }
sprite('WCH_F', 5, 17, { block: [5, 18, 1, 1], z: 19 * T - .5 }); sprite('WCH_F', 6, 17, { block: [6, 18, 1, 1], z: 19 * T - .5 });
sprite('WCH_B', 5, 24, { block: [5, 25, 1, 1], z: 26 * T + .5 }); sprite('WCH_B', 6, 24, { block: [6, 25, 1, 1], z: 26 * T + .5 });
plant(1, 26); bigPlant(10, 25);
for (const c of [34, 36, 38, 41, 43]) rack(c, 1);
for (const c of [38, 40, 42]) rack(c, 10);
bigPlant(35, 6);
plant2(44, 6);
aquarium(41, 16);
art(35 * T + 4, 15 * T + TOPM - 13, 34, 16, 16 * T + .3, 1);
sprite('SOFA_F', 38, 19, { block: [38, 19, 2, 1], z: 20 * T }); sprite('SOFA_S', 37, 20, { block: [37, 20, 1, 2], z: 22 * T });
sprite('SOFA_S', 40, 20, { mirror: 1, block: [40, 20, 1, 2], z: 22 * T }); sprite('CTABLE', 38, 20, { block: [38, 20, 2, 2], z: 22 * T - 1 });
sprite('SOFA_B', 38, 22, { block: [38, 22, 2, 1], z: 23 * T }); sprite('COFFEE', 38, 20, { z: 22 * T - .5, dx: 8, dy: 6 });
floorLamp(36, 19); floorLamp(42, 19);
sideTable(43, 24); bench(35, 27, 2);
bigPlant(42, 25); plant(34, 16);

// static light rig (warm downlights + window wash)
const LIGHTS = [];
DESKS.forEach(([c, r]) => LIGHTS.push([c * T + 24, r * T + TOPM + 26, 58, '#ffe6c4', .62]));
for (let x = 14 * T; x <= 32 * T; x += 48) LIGHTS.push([x, TOPM + 22, 52, '#fff1d6', .5, 'wash']);
LIGHTS.push([23 * T, 20 * T + TOPM, 70, '#ffe6c4', .55], [20 * T, 25 * T + TOPM, 72, '#ffe6c4', .45], [27 * T, 25 * T + TOPM, 72, '#ffe6c4', .45], [23 * T, 15 * T + TOPM, 60, '#ffe6c4', .3]);
LIGHTS.push([30 * T + 8, 19 * T + TOPM, 40, '#ffd29a', .5], [14 * T, 20 * T + TOPM, 50, '#ffe6c4', .35], [31 * T, 22 * T + TOPM, 50, '#ffe6c4', .35]);
LIGHTS.push([4 * T, 4 * T + TOPM, 64, '#ffcf8a', .75], [6 * T, 13 * T + TOPM, 50, '#ffcf8a', .4]);
LIGHTS.push([6 * T, 22 * T + TOPM, 96, '#fff0d8', .95], [6 * T, 27 * T + TOPM, 50, '#fff0d8', .3]);
LIGHTS.push([39 * T, 6 * T + TOPM, 80, '#8fe9ff', .5], [40 * T, 12 * T + TOPM, 60, '#8fe9ff', .4], [36 * T, 8 * T + TOPM, 40, '#ffe6c4', .4]);
LIGHTS.push([39 * T, 21 * T + TOPM, 70, '#ffcf8a', .45], [37 * T, 26 * T + TOPM, 50, '#ffcf8a', .35]);
for (const [c, r] of DOORS) LIGHTS.push([c * T + 8, r * T + TOPM + 8, 22, '#ffe6c4', .25]);
const AMBIENT = '#7a8194';

// ---------- walkability ----------
const blocked = []; for (let r = 0; r < ROWS; r++) blocked.push(new Array(COLS).fill(false));
function buildBlocked() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) blocked[r][c] = grid[r][c] === 'W';
  for (const it of ITEMS) if (it.block) { const [c0, r0, w, h] = it.block; for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) if (r < ROWS && c < COLS) blocked[r][c] = true; }
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
function buildRoam() { for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) { const z = grid[r][c]; if (!blocked[r][c] && z !== 'W' && !(z === 'floor' && r < 15) && c !== 12 && c !== 33 && r !== 15) ROAM.push([c, r]); } }

// ---------- characters ----------
const STATUS = { team: {} };
people = TEAM.map(m => ({ ...m, x: 0, y: 0, c: 0, r: 0, dir: 'down', state: 'idle', path: [], fT: 0, frame: 0, wait: 1 + Math.random() * 3, want: 'roam', mode: 'roam', modeT: 10 + Math.random() * 40, seated: false }));
function place(p, c, r) { p.c = c; p.r = r; p.x = c * T + 8; p.y = r * T + 8; }
function working(p) { const s = STATUS.team[p.id]; return !!(s && String(s.state).toUpperCase() === 'WORKING'); }
// motion schedule: working teammates mostly sit at their desk but periodically get up for a short wander
// (stretch, coffee, chat); idle teammates mostly roam but now and then drop into their own chair for a while.
const rnd = (a, b) => a + Math.random() * (b - a);
function roamingWorkers() { return people.filter(q => q.want === 'work' && q.mode === 'roam').length; }
function setMode(p, m) { p.mode = m;
  if (p.want === 'work') p.modeT = m === 'desk' ? rnd(40, 80) : rnd(8, 15);
  else p.modeT = m === 'desk' ? rnd(12, 26) : rnd(25, 60);
  if (m === 'roam') p.wait = rnd(0.2, 1.2); }
function initPeople() { people.forEach(p => { p.want = working(p) ? 'work' : 'roam';
  if (p.want === 'work') { const s = SEATS[p.id]; place(p, s.c, s.r); p.state = 'type'; p.dir = 'up'; p.seated = true; p.mode = 'desk'; p.modeT = rnd(6, 45); }
  else { const [c, r] = ROAM[Math.floor(Math.random() * ROAM.length)]; place(p, c, r); p.mode = 'roam'; p.modeT = rnd(10, 50); } }); }
function update(p, dt) {
  const want = working(p) ? 'work' : 'roam';
  if (want !== p.want) { p.want = want; setMode(p, want === 'work' ? 'desk' : 'roam'); }
  p.modeT -= dt;
  if (p.modeT <= 0 && !(p.state === 'walk' && p.mode === 'desk')) {
    if (p.mode === 'desk') { if (p.want === 'work' && roamingWorkers() >= 2) p.modeT = rnd(4, 8); else setMode(p, 'roam'); }
    else if (p.want === 'work' || Math.random() < 0.65) { setMode(p, 'desk'); if (p.state === 'walk') p.path = []; }
    else p.modeT = rnd(10, 25);
  }
  if (p.state === 'walk') {
    const nx = p.path[0]; if (!nx) { arrive(p); return; }
    const tx = nx[0] * T + 8, ty = nx[1] * T + 8, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = 40 * dt;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left'; else if (dy) p.dir = dy > 0 ? 'down' : 'up';
    if (d <= step) { p.x = tx; p.y = ty; p.c = nx[0]; p.r = nx[1]; p.path.shift(); if (!p.path.length) arrive(p); }
    else { p.x += dx / d * step; p.y += dy / d * step; }
    p.fT += dt; if (p.fT > 0.16) { p.fT -= 0.16; p.frame = (p.frame + 1) % 4; }
    return;
  }
  if (p.mode === 'desk') {
    const s = SEATS[p.id];
    if (p.c === s.c && p.r === s.r) { p.state = 'type'; p.dir = 'up'; p.seated = true;
      if (p.want === 'work') { p.fT += dt; if (p.fT > 0.3) { p.fT -= 0.3; p.frame = (p.frame + 1) % 2; } }
      else { p.fT += dt; if (p.fT > 1.6) { p.fT = 0; p.frame = Math.random() < .25 ? 1 : 0; } } // idle at desk: mostly still, the odd tap
      return; }
    go(p, s.c, s.r); return;
  }
  if (p.seated) { p.seated = false; p.state = 'idle'; p.wait = Math.min(p.wait, 0.5); }
  p.state = 'idle'; p.wait -= dt;
  if (p.wait <= 0) { const [c, r] = ROAM[Math.floor(Math.random() * ROAM.length)]; go(p, c, r); p.wait = p.want === 'work' ? rnd(1.5, 4) : rnd(4, 12); }
}
function go(p, c, r) { const path = bfs(p.c, p.r, c, r); if (path && path.length) { p.path = path; p.state = 'walk'; p.seated = false; } else p.wait = 1; }
function arrive(p) { p.state = 'idle'; p.frame = 0; if (p.mode !== 'desk') p.dir = Math.random() < .6 ? 'down' : ['left', 'right', 'up'][Math.floor(Math.random() * 3)]; }
function spriteOf(p) { const d = CHARS[p.id][p.dir];
  if (p.state === 'walk') return d[[0, 1, 2, 1][p.frame]];
  if (p.state === 'type') return d[3 + (p.frame % 2)];
  return d[1]; }

// ---------- static layers ----------
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const world = mk(W * S, H * S), wg = world.getContext('2d');
const floorLayer = mk(W * S, H * S);
const lightStatic = mk(W, H), lightDyn = mk(W, H), lg = lightDyn.getContext('2d');
const MATERIAL = { floor: 'marble', bar: 'parquet', lounge: 'parquet2', war: 'carpet', vault: 'steel' };
function paintMaterial(g, kind, x, y, w, h, rnd) {
  if (kind === 'marble') {
    R(g, x, y, w, h, '#15171c');
    for (let ty = y; ty < y + h; ty += 32) for (let tx = x; tx < x + w; tx += 32) { const v = 20 + Math.floor(rnd() * 7); R(g, tx, ty, 32, 32, `rgb(${v},${v + 2},${v + 6})`); g.fillStyle = 'rgba(255,255,255,.018)'; g.fillRect(tx, ty, 32, 14); }
    g.fillStyle = '#0c0d10'; for (let ty = y; ty < y + h; ty += 32) g.fillRect(x, ty, w, .5); for (let tx = x; tx < x + w; tx += 32) g.fillRect(tx, y, .5, h);
    g.lineWidth = .5; for (let k = 0; k < w * h / 4200; k++) { let px = x + rnd() * w, py = y + rnd() * h, a = rnd() * 6.28; g.strokeStyle = rnd() < .5 ? 'rgba(217,181,106,.09)' : 'rgba(255,255,255,.04)'; g.beginPath(); g.moveTo(px, py);
      for (let s = 0; s < 6; s++) { a += (rnd() - .5) * 1.1; px += Math.cos(a) * (6 + rnd() * 14); py += Math.sin(a) * (6 + rnd() * 14); g.lineTo(px, py); } g.stroke(); }
  } else if (kind === 'parquet' || kind === 'parquet2') {
    const pal = kind === 'parquet' ? ['#2c1f16', '#33241a', '#291c14', '#382819'] : ['#24191a', '#2b1e1d', '#211617', '#30211f'];
    for (let by = y; by < y + h; by += 8) for (let bx = x; bx < x + w; bx += 8) { const hor = ((bx - x) / 8 + (by - y) / 8) % 2 === 0;
      for (let k = 0; k < 3; k++) { const col = pal[Math.floor(rnd() * pal.length)], q = 8 / 3; if (hor) { R(g, bx, by + k * q, 8, q, col); R(g, bx, by + k * q, 8, .3, 'rgba(255,255,255,.04)'); R(g, bx, by + (k + 1) * q - .3, 8, .3, 'rgba(0,0,0,.35)'); }
        else { R(g, bx + k * q, by, q, 8, col); R(g, bx + k * q, by, .3, 8, 'rgba(255,255,255,.04)'); R(g, bx + (k + 1) * q - .3, by, .3, 8, 'rgba(0,0,0,.35)'); } } }
  } else if (kind === 'carpet') {
    R(g, x, y, w, h, '#23262f'); for (let k = 0; k < w * h / 6; k++) R(g, x + rnd() * w, y + rnd() * h, .5, .5, rnd() < .5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.18)');
    g.strokeStyle = 'rgba(217,181,106,.05)'; g.lineWidth = .4; g.beginPath(); for (let k = -h; k < w; k += 12) { g.moveTo(x + k, y); g.lineTo(x + k + h, y + h); g.moveTo(x + k + h, y); g.lineTo(x + k, y + h); } g.stroke();
  } else if (kind === 'steel') {
    for (let ty = y; ty < y + h; ty += 16) for (let tx = x; tx < x + w; tx += 16) { R(g, tx, ty, 16, 16, '#1a1f26'); R(g, tx, ty, 16, .5, '#2b323c'); R(g, tx, ty, .5, 16, '#2b323c'); R(g, tx, ty + 15.5, 16, .5, '#0e1115'); R(g, tx + 15.5, ty, .5, 16, '#0e1115');
      if (((tx + ty) / 16) % 2 === 0) for (let py = ty + 3; py < ty + 13; py += 1.5) for (let px = tx + 3; px < tx + 13; px += 1.5) R(g, px, py, .5, .5, 'rgba(0,0,0,.4)'); }
  }
}
function bakeFloor() {
  const g = floorLayer.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); const rnd = mulberry(1337);
  for (const z of Object.keys(MATERIAL)) {
    let c0 = 99, r0 = 99, c1 = -1, r1 = -1; g.save(); g.beginPath();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === z) { g.rect(c * T, r * T + TOPM, T, T); c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); }
    g.clip(); paintMaterial(g, MATERIAL[z], c0 * T, r0 * T + TOPM, (c1 - c0 + 1) * T, (r1 - r0 + 1) * T, rnd); g.restore();
  }
  { const x = 36 * T + 4, y = 18 * T + TOPM + 4, w = 6 * T - 8, h = 6 * T - 4; R(g, x, y, w, h, '#121828'); g.strokeStyle = 'rgba(217,181,106,.7)'; g.lineWidth = .6; g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.strokeStyle = 'rgba(217,181,106,.35)'; g.lineWidth = .4; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    for (let k = 0; k < 900; k++) R(g, x + rnd() * w, y + rnd() * h, .5, .5, 'rgba(255,255,255,.025)'); }
  { const x = 2 * T + 6, y = 17 * T + TOPM + 8, w = 8 * T - 12, h = 9 * T - 4; g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(217,181,106,.3)'; g.lineWidth = .5; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
  g.strokeStyle = 'rgba(217,181,106,.42)'; g.lineWidth = .6; g.strokeRect(14 * T + 4, 15 * T + TOPM + 6, 18 * T - 8, 12 * T + 2); g.strokeStyle = 'rgba(217,181,106,.2)'; g.lineWidth = .4; g.strokeRect(14 * T + 7, 15 * T + TOPM + 9, 18 * T - 14, 12 * T - 4);
  for (const [cx, cy] of [[14 * T + 4, 15 * T + TOPM + 6], [32 * T - 4, 15 * T + TOPM + 6], [14 * T + 4, 27 * T + TOPM + 8], [32 * T - 4, 27 * T + TOPM + 8]]) { g.fillStyle = GOLD; g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillRect(-1.5, -1.5, 3, 3); g.restore(); }
  { const gr = g.createLinearGradient(0, 2 * T + TOPM, 0, 15 * T + TOPM); gr.addColorStop(0, 'rgba(217,181,106,0)'); gr.addColorStop(.5, 'rgba(217,181,106,.06)'); gr.addColorStop(1, 'rgba(217,181,106,0)'); g.fillStyle = gr; g.fillRect(21 * T + 4, 1 * T + TOPM, 3 * T - 8, 14 * T); }
  for (const yy of [4 * T + TOPM + 2, 9 * T + TOPM + 6]) { R(g, 34 * T + 4, yy, 11 * T - 8, .6, 'rgba(94,242,214,.35)'); R(g, 34 * T + 4, yy + .6, 11 * T - 8, 1.5, 'rgba(94,242,214,.06)'); }
  for (const [c, r, o] of DOORS) { g.fillStyle = 'rgba(201,163,92,.75)'; if (o === 'v') g.fillRect(c * T + 7.5, r * T + TOPM, 1, T); else g.fillRect(c * T, r * T + TOPM + 7.5, T, 1); }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (grid[r][c] === 'W') continue; const x = c * T, y = r * T + TOPM;
    if (isWall(c, r - 1)) { const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, T, 12); }
    if (isWall(c - 1, r)) { const gr = g.createLinearGradient(x, 0, x + 6, 0); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, 6, T); }
    if (isWall(c + 1, r)) { const gr = g.createLinearGradient(x + T, 0, x + T - 6, 0); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + T - 6, y, 6, T); } }
  g.save(); g.filter = 'blur(2.5px)'; g.fillStyle = 'rgba(0,0,0,.5)'; for (const it of ITEMS) if (it.shadow) { const [x, y, w, h] = it.shadow; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 3) : g.rect(x, y, w, h); g.fill(); } g.restore();
}
const WINDOWS = []; for (let c = 13; c <= 32; c++) WINDOWS.push([c * T, TOPM, T, T]);
function bakeLight() {
  const g = lightStatic.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.rect(0, TOPM - 16, W, ROWS * T + 16); g.clip();
  const pal = currentPal || SKY.night;
  g.fillStyle = pal.ambient || AMBIENT; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
  for (const [x, y, r, col, a, kind] of LIGHTS) glow(g, x, y, r, kind === 'wash' ? pal.wash : col, kind === 'wash' ? pal.washA : a * pal.lamp);
  for (const it of ITEMS) if (it.lights && !it.litOn) for (const [x, y, r, col, a] of it.lights) glow(g, x, y, r, col, a * pal.lamp);
  g.fillStyle = '#fff'; for (const [x, y, w, h] of WINDOWS) g.fillRect(x, y, w, h);
  g.restore();
}
const sky = [mk(480 * S, 16 * S), mk(480 * S, 16 * S)];
let skylineBuilt = false;
const SKYLINE = [[], []], STARS = [];
function ensureSkyline() {
  if (skylineBuilt) return;
  skylineBuilt = true;
  const rnd = mulberry(99);
  for (let k = 0; k < 40; k++) STARS.push([rnd() * 480, rnd() * 6]);
  for (let li = 0; li < 2; li++) {
    let x = 0;
    while (x < 480) {
      const bw = 4 + rnd() * (li ? 12 : 8), bh = li ? 5 + rnd() * 9 : 3 + rnd() * 7, wins = [];
      if (li) for (let wy = 16 - bh + 1; wy < 15.5; wy += 1.5) for (let wx = x + 1; wx < x + bw - 1; wx += 1.5) if (rnd() < .28) wins.push([wx, wy, rnd()]);
      const ant = !!(li && bh > 12 && rnd() < .5);
      SKYLINE[li].push({ x, bw, bh, wins, ant });
      x += bw + (li ? rnd() * 3 : 0);
    }
  }
}
function paintSkyBody(g, pal) {
  const moonA = pal.moonA != null ? pal.moonA : (pal.moon ? 1 : 0);
  const sunA = pal.sunA != null ? pal.sunA : (pal.moon ? 0 : 1);
  if (moonA > .04) {
    const span = (24 - 19.25) + 5.25;
    const u = Math.max(0, Math.min(1, bkkT >= 19.25 ? (bkkT - 19.25) / span : (bkkT + (24 - 19.25)) / span));
    const x = 28 + u * 420, y = 3.2;
    g.save(); g.globalAlpha = moonA;
    R(g, x, y, 4, 4, '#e7eefc'); R(g, x + 2, y, 2, 3, pal.top); R(g, x + 1, y + 1, 1, 1, '#ffffff');
    g.restore();
  }
  if (sunA > .04) {
    const u = Math.max(0, Math.min(1, (bkkT - 5.25) / 14));
    const x = 24 + u * 430, y = 8.2 - Math.sin(u * Math.PI) * 5.5;
    g.save(); g.globalAlpha = sunA;
    R(g, x - 2, y + 1, 7, 1, pal.sun); R(g, x, y - 1, 3, 5, pal.sun); R(g, x + 1, y + 1, 1, 1, '#fffef6');
    g.restore();
  }
}
function bakeSky() {
  ensureSkyline();
  const pal = currentPal || SKY.night;
  sky.forEach((cv, li) => {
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(S, 0, 0, S, 0, 0);
    if (li === 0) {
      const gr = g.createLinearGradient(0, 0, 0, 16);
      gr.addColorStop(0, pal.top); gr.addColorStop(.62, pal.mid); gr.addColorStop(1, pal.bot);
      g.fillStyle = gr; g.fillRect(0, 0, 480, 16);
      if (pal.star) { g.fillStyle = `rgba(255,255,255,${pal.star})`; for (const [sx, sy] of STARS) g.fillRect(sx, sy, .5, .5); }
      paintSkyBody(g, pal);
    }
    for (const b of SKYLINE[li]) {
      R(g, b.x, 16 - b.bh, b.bw, b.bh, li ? pal.near : pal.far);
      if (li) for (const [wx, wy, rv] of b.wins) if (rv < pal.winOn) R(g, wx, wy, .6, .6, rv < pal.winOn * .72 ? pal.winWarm : pal.winCool);
      const antA = pal.antennaA != null ? pal.antennaA : (pal.antenna ? 1 : 0);
      if (b.ant && antA > .08) R(g, b.x + b.bw / 2, 16 - b.bh - 1.5, .6, 1.5, antA > .99 ? '#ff4d5e' : `rgba(255,77,94,${antA})`);
    }
  });
}

// ---------- rendering ----------
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
function drawWall(g, c, r, camCX) {
  const x = c * T, y = r * T + TOPM;
  if (!wallOrOut(c, r + 1) || r === ROWS - 1) {
    const isWin = r === 0 && grid[1][c] === 'floor';
    if (isWin) {
      g.save(); g.beginPath(); g.rect(x, y, T, T); g.clip();
      for (let li = 0; li < 2; li++) { const off = ((camCX * (li ? .16 : .07)) % 480 + 480) % 480; g.drawImage(sky[li], -off, y, 480, 16); g.drawImage(sky[li], 480 - off, y, 480, 16); }
      g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + 8, y); g.lineTo(x + 3, y + T); g.lineTo(x - 2, y + T); g.fill();
      g.restore();
      if (c % 2 === 1) R(g, x, y, .8, T, '#2a2418'); R(g, x, y + T - 1.2, T, 1.2, '#0b0c0f'); R(g, x, y + T - 1.6, T, .4, GOLD);
    } else if (r === ROWS - 1 || c === 0 || c === COLS - 1) {
      R(g, x, y, T, T, '#0c0e12'); for (let k = 1; k < 4; k++) R(g, x + k * 4, y, .4, T, 'rgba(255,255,255,.025)'); R(g, x, y + T - .5, T, .5, '#050608');
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + T); gr.addColorStop(0, '#1d2027'); gr.addColorStop(1, '#14161b'); g.fillStyle = gr; g.fillRect(x, y, T, T);
      for (let k = 2; k < T; k += 4) R(g, x + k, y + 1, .4, T - 4, 'rgba(255,255,255,.035)');
      R(g, x, y + T - 3, T, 3, '#0b0c0f'); R(g, x, y + T - 3, T, .5, GOLD);
    }
  }
  R(g, x, y - T, T, T, '#0f1115');
  if (!isWall(c - 1, r)) R(g, x, y - T, .6, T, '#2c313b');
  if (!isWall(c + 1, r)) R(g, x + T - .6, y - T, .6, T, '#2c313b');
  if (!wallOrOut(c, r - 1) || r === 0) R(g, x, y - T, T, .6, '#2c313b');
  if (!wallOrOut(c, r + 1)) R(g, x, y - .6, T, .6, '#8a6d3b');
}
const dust = []; { const rnd = mulberry(5); for (let i = 0; i < 46; i++) dust.push({ x: 14 * T + rnd() * 18 * T, y: 3 * T + TOPM + rnd() * 24 * T, s: 1 + rnd() * 2, p: rnd() * 6, v: 2 + rnd() * 3 }); }
function render(t) {
  const camCX = (innerWidth / 2 - cam.x) / cam.z;
  wg.setTransform(S, 0, 0, S, 0, 0); wg.clearRect(0, 0, W, H); wg.imageSmoothingEnabled = false;
  wg.drawImage(floorLayer, 0, 0, W, H);
  const dr = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === 'W') dr.push({ z: (r + 1) * T, f: () => drawWall(wg, c, r, camCX) });
  for (const it of ITEMS) dr.push({ z: it.z, f: () => it.draw(wg, t) });
  for (const p of people) { const s = spriteOf(p), off = p.state === 'type' ? 6 : 0, sx = Math.round(p.x - 8), sy = Math.round(p.y + off - 32 + TOPM);
    dr.push({ z: p.y + 8.5, f: () => {
      if (p.state !== 'type') ell(wg, p.x, p.y + 7 + TOPM, 5, 2, 'rgba(0,0,0,.4)');
      if (p === sel) { if (!off) ell(wg, p.x, p.y + 7 + TOPM, 7, 2.6, hexA(p.color, .55)); outline(s, sx, sy); }
      else if (p === hov) outlineColored(s, sx, sy, p.color);
      wg.drawImage(s, sx, sy);
      if (!working(p) && p.state !== 'walk') drawZzz(wg, p.x + 4, sy, t + p.c);
    } }); }
  dr.sort((a, b) => a.z - b.z); for (const d of dr) d.f();
  lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H); lg.drawImage(lightStatic, 0, 0);
  lg.save(); lg.beginPath(); lg.rect(0, TOPM - 16, W, ROWS * T + 16); lg.clip(); lg.globalCompositeOperation = 'lighter';
  for (const it of ITEMS) { if (!it.litOn || !it.litOn()) continue; if (it.lights) for (const [x, y, r, col, a] of it.lights) glow(lg, x, y, r, col, a); if (it.lit) { lg.fillStyle = '#fff'; for (const [x, y, w, h] of it.lit) lg.fillRect(x, y, w, h); } }
  if (sel) glow(lg, sel.x, sel.y + TOPM - 6, 26, '#ffffff', .35);
  lg.restore();
  wg.save(); wg.globalCompositeOperation = 'multiply'; wg.imageSmoothingEnabled = true; wg.drawImage(lightDyn, 0, 0, W, H); wg.restore();
  paintDaylight(wg);
  wg.save(); wg.globalCompositeOperation = 'lighter'; for (const it of ITEMS) if (it.bloom) it.bloom(wg, t);
  for (const p of people) if (working(p) && p.state !== 'walk') glow(wg, p.x, p.y + TOPM - 8, 18, p.color, .16 + .1 * Math.sin(t * 3.1 + p.c));
  for (const d of dust) { const a = .08 + .08 * Math.sin(t * d.s + d.p); R(wg, d.x + Math.sin(t * .2 + d.p) * 6, d.y + ((t * d.v) % 40) - 20, .6, .6, `rgba(255,236,200,${a})`); }
  drawSteam(wg, t);
  wg.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); drawVoid();
  ctx.setTransform(cam.z * dpr, 0, 0, cam.z * dpr, cam.x * dpr, cam.y * dpr);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 50 * cam.z * dpr; ctx.shadowOffsetY = 18 * cam.z * dpr; ctx.fillStyle = '#000'; ctx.fillRect(0, TOPM - 16, W, ROWS * T + 16); ctx.restore();
  ctx.strokeStyle = 'rgba(217,181,106,.28)'; ctx.lineWidth = .5; ctx.strokeRect(-8, TOPM - 24, W + 16, ROWS * T + 32);
  ctx.fillStyle = 'rgba(217,181,106,.7)'; for (const [x, y] of [[-8, TOPM - 24], [W + 8, TOPM - 24], [-8, H + 8], [W + 8, H + 8]]) { ctx.fillRect(x - 4, y - .25, 8, .5); ctx.fillRect(x - .25, y - 4, .5, 8); }
  ctx.imageSmoothingEnabled = false; ctx.drawImage(world, 0, 0, W, H);
}
let dotPat = null, crossPat = null;
function drawVoid() { const w = cv.width, h = cv.height;
  const gr = ctx.createRadialGradient(w * .55, h * .5, 0, w * .55, h * .5, Math.max(w, h) * .75); gr.addColorStop(0, '#0d1118'); gr.addColorStop(1, '#040507'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  if (!dotPat) { const a = mk(24, 24), g = a.getContext('2d'); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(12, 12, 1, 1); dotPat = ctx.createPattern(a, 'repeat');
    const b = mk(120, 120), g2 = b.getContext('2d'); g2.fillStyle = 'rgba(217,181,106,.12)'; g2.fillRect(56, 60, 9, 1); g2.fillRect(60, 56, 1, 9); crossPat = ctx.createPattern(b, 'repeat'); }
  for (const [pat, k, sz] of [[dotPat, .35, 24], [crossPat, .6, 120]]) { ctx.save(); ctx.translate(((cam.x * k) % sz) * dpr, ((cam.y * k) % sz) * dpr); ctx.scale(dpr, dpr); ctx.fillStyle = pat; ctx.fillRect(-sz * 2, -sz * 2, w / dpr + sz * 4, h / dpr + sz * 4); ctx.restore(); }
}
const outCache = new Map();
function outline(s, x, y) { let o = outCache.get(s); if (!o) { o = mk(18, 34); const g = o.getContext('2d');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(s, dx, dy); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#f0d9a0'; g.fillRect(0, 0, 18, 34); outCache.set(s, o); }
  wg.drawImage(o, x - 1, y - 1); }
const tintCache = new Map();
function outlineColored(s, x, y, col) {
  let m = tintCache.get(s); if (!m) { m = new Map(); tintCache.set(s, m); }
  let o = m.get(col); if (!o) { o = mk(18, 34); const g = o.getContext('2d');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(s, dx, dy); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 18, 34); m.set(col, o); }
  wg.drawImage(o, x - 1, y - 1);
}
const STEAM = [[1 * T + 12, 2 * T + TOPM - 6], [22 * T + 16, 19 * T + TOPM + 4], [38 * T + 16, 20 * T + TOPM + 4]];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawZzz(g, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const ph = reduceMotion ? .2 + i * .2 : (t * .42 + i * .28) % 1;
    const yy = Math.round(y - 8 - ph * 11), xx = Math.round(x + i * 3.5), a = reduceMotion ? .8 : (1 - ph) * .92;
    g.fillStyle = `rgba(226,232,242,${a})`;
    g.fillRect(xx, yy, 3, 1); g.fillRect(xx + 2, yy + 1, 1, 1); g.fillRect(xx + 1, yy + 2, 1, 1); g.fillRect(xx, yy + 3, 3, 1);
  }
}
function sunAngle() {
  const u = Math.max(0, Math.min(1, (bkkT - 11) / 6.2));
  return { reach: Math.round(96 + u * 72), slant: Math.round(4 + u * 20) };
}
// Soft pixel shafts from the north windows. A wide faint pass, then a narrower core, then a patch on the floor.
function paintShaft(g, x, y0, reach, slant, col, k) {
  const steps = 9;
  for (const [grow, alpha] of [[10, 0.12], [0, 0.3]]) {
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, fade = 1 - t0 * 0.78;
      const yA = Math.round(y0 + reach * t0), yB = Math.round(y0 + reach * (i + 1) / steps);
      const xA = Math.round(x + slant * t0) - (grow >> 1), w = Math.round(12 + 18 * t0) + grow;
      g.fillStyle = hexA(col, alpha * fade * k);
      g.fillRect(xA, yA, w, Math.max(1, yB - yA));
    }
  }
  const px = Math.round(x + slant * 0.68), py = Math.round(y0 + reach * 0.84);
  g.fillStyle = hexA(col, 0.16 * k); g.fillRect(px - 8, py - 2, 36, 12);
  g.fillStyle = hexA(col, 0.26 * k); g.fillRect(px, py, 18, 6);
}
function paintDaylight(g) {
  const k = currentPal && currentPal.lift || 0;
  if (k < .02) return;
  const ink = currentPal.sunInk || '#ffc56a';
  const { reach, slant } = sunAngle();
  const y0 = TOPM + 15;
  g.save();
  g.beginPath(); g.rect(13 * T, TOPM + 14, 20 * T, reach + 22); g.clip();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = hexA('#fff1c8', 0.18 * k);
  g.fillRect(13 * T, TOPM + 14, 20 * T, 2);
  for (const c of [15, 18.5, 24, 30]) paintShaft(g, c * T, y0, reach, slant, ink, k);
  g.restore();
}
function drawSteam(g, t) {
  for (const [x, y] of STEAM) for (let k = 0; k < 3; k++) {
    const ph = reduceMotion ? .3 + k * .2 : (t * .32 + k * .34 + x * .01) % 1;
    R(g, Math.round(x + Math.sin(t * 1.4 + k) * 1.4), Math.round(y - ph * 12), 2, 2, `rgba(236,242,246,${(1 - ph) * .32})`);
  }
}

// ---------- camera ----------
let dpr = 1; const cam = { x: 0, y: 0, z: 1 };
const isWide = () => innerWidth >= 1000;
function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
// HUD is laid out as one composition with the office: [roster | gap | framed map | gap | controls], centred as a unit.
const HUD = { RW: 264, G: 20, CW: 52, M: 24, Tp: 92, B: 34 }; let LAY = null;
function fitTarget() { const top = TOPM - 24, hh = H - top + 8, fwW = W + 16;
  if (isWide()) { const { RW, G, CW, M, Tp, B } = HUD, aw = innerWidth - 2 * M - RW - CW - 2 * G, ah = innerHeight - Tp - B;
    const z = Math.max(.3, Math.min(aw / fwW, ah / hh)), fw = fwW * z, fh = hh * z, x0 = Math.max(M, (innerWidth - (RW + G + fw + G + CW)) / 2);
    const fx = x0 + RW + G, fy = Tp + Math.max(0, (ah - fh) / 2); LAY = { x0, fx, fy, fw, fh };
    return { z, x: fx + 8 * z, y: fy - top * z }; }
  LAY = null; const L = 12, Tp = 64, Rt = 12, B = 104, aw = innerWidth - L - Rt, ah = innerHeight - Tp - B;
  if (innerWidth < 700 && innerHeight > innerWidth) { const z = Math.min(aw / (23 * T), ah / hh * 1.6); return { z, x: L + aw / 2 - 23 * T * z, y: Tp + ah / 2 - (17 * T + TOPM) * z }; }
  const z = Math.max(.3, Math.min(aw / fwW, ah / hh)); return { z, x: L + (aw - W * z) / 2, y: Tp + (ah - hh * z) / 2 - top * z }; }
function layoutHUD() { const ids = ['top', 'roster', 'ctrl', 'nowp', 'hint'], el = Object.fromEntries(ids.map(i => [i, document.getElementById(i)]));
  if (!LAY) { ids.forEach(i => el[i].removeAttribute('style')); document.body.classList.remove('anch'); return; }
  const { x0, fx, fy, fw, fh } = LAY, px = v => Math.round(v) + 'px'; document.body.classList.add('anch');
  Object.assign(el.roster.style, { left: px(x0), top: px(fy), height: px(fh) });
  Object.assign(el.top.style, { left: px(fx), width: px(fw), right: 'auto', top: px(Math.max(8, fy - 66)) });
  Object.assign(el.ctrl.style, { left: px(fx + fw + HUD.G), right: 'auto', top: px(fy + fh / 2) });
  Object.assign(el.nowp.style, { right: px(innerWidth - (fx + fw + HUD.G) + 10), top: px(fy + fh / 2 + 66) });
  Object.assign(el.hint.style, { left: px(fx + fw / 2), bottom: px(Math.max(6, innerHeight - (fy + fh) - 28)) }); }
function fit() { Object.assign(cam, fitTarget()); layoutHUD(); }
function zoomNow(f, sx, sy) { const nz = Math.max(0.3, Math.min(7, cam.z * f)); cam.x = sx - (sx - cam.x) * nz / cam.z; cam.y = sy - (sy - cam.y) * nz / cam.z; cam.z = nz; }
const zt = { f: 1, sx: 0, sy: 0 }; let ct = null;
function zoomAt(f, sx, sy) { ct = null; zt.f = Math.max(0.6, Math.min(1.8, zt.f * f)); zt.sx = sx; zt.sy = sy; }
function glide(z, x, y, dur = 1.1) { zt.f = 1; ct = { z0: cam.z, x0: cam.x, y0: cam.y, z, x, y, k: 0, dur }; }
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
let drag = null, moved = 0, inertia = null, lastMove = [0, 0, 0]; const ptrs = new Map(); let pinch = null;
function camStep(dt) {
  if (ct) { ct.k = Math.min(1, ct.k + dt / ct.dur); const e = ease(ct.k); cam.z = ct.z0 + (ct.z - ct.z0) * e; cam.x = ct.x0 + (ct.x - ct.x0) * e; cam.y = ct.y0 + (ct.y - ct.y0) * e; if (ct.k >= 1) ct = null; }
  if (Math.abs(zt.f - 1) > .0005) { const k = 1 - Math.exp(-dt * 3.2), step = Math.pow(zt.f, k); zoomNow(step, zt.sx, zt.sy); zt.f /= step; } else zt.f = 1;
  if (inertia && !drag) { cam.x += inertia[0] * dt; cam.y += inertia[1] * dt; const d = Math.exp(-dt * 5); inertia[0] *= d; inertia[1] *= d; if (Math.hypot(inertia[0], inertia[1]) < 4) inertia = null; }
}
function fitSmooth() { const f = fitTarget(); glide(f.z, f.x, f.y); }
function focus(p) { const nz = Math.max(cam.z, Math.min(4.2, innerHeight / 150)); const cx = LAY ? LAY.fx + LAY.fw / 2 : innerWidth / 2, cy = innerHeight / 2 - (isWide() ? 0 : 40);
  glide(nz, cx - p.x * nz, cy - (p.y + TOPM - 14) * nz); }
const toWorld = (sx, sy) => [(sx - cam.x) / cam.z, (sy - cam.y) / cam.z - TOPM];
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); ct = null; inertia = null; if (ptrs.size === 1) { drag = [e.clientX, e.clientY]; moved = 0; lastMove = [0, 0, performance.now()]; } else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } cv.classList.add('drag'); });
cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) { hover(e); return; } ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomNow(Math.pow(d / pinch, .6), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = d; moved = 99; return; }
  if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1], now = performance.now(), dtm = Math.max(1, now - lastMove[2]); cam.x += dx; cam.y += dy; moved += Math.abs(dx) + Math.abs(dy); drag = [e.clientX, e.clientY]; lastMove = [dx / dtm * 1000, dy / dtm * 1000, now]; } });
function endPtr(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { cv.classList.remove('drag'); if (drag && moved < 6) click(e.clientX, e.clientY); else if (drag && performance.now() - lastMove[2] < 60) inertia = [lastMove[0] * .6, lastMove[1] * .6]; drag = null; } }
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * .0007), e.clientX, e.clientY); }, { passive: false });
cv.addEventListener('dblclick', () => fitSmooth());
const $ = id => document.getElementById(id);
$('zin').onclick = () => zoomAt(1.25, innerWidth / 2, innerHeight / 2);
$('zout').onclick = () => zoomAt(1 / 1.25, innerWidth / 2, innerHeight / 2);
$('zreset').onclick = () => { select(null); fitSmooth(); };
addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') $('zin').click(); else if (e.key === '-') $('zout').click(); else if (e.key === '0' || e.key === 'Escape') { select(null); fitSmooth(); } });
function pick(sx, sy) { const [wx, wy] = toWorld(sx, sy); let best = null; for (const p of people) { const off = p.state === 'type' ? 6 : 0; if (wx >= p.x - 8 && wx <= p.x + 8 && wy >= p.y + off - 26 && wy <= p.y + off + 4) if (!best || p.y > best.y) best = p; } return best; }
let hov = null, sel = null;
function setHover(p) {
  if (hov === p) return;
  if (hov && LBL[hov.id]) LBL[hov.id].tag.classList.remove('hot');
  hov = p;
  if (p && LBL[p.id]) LBL[p.id].tag.classList.add('hot');
}
function hover(e) { const p = pick(e.clientX, e.clientY); setHover(p); cv.style.cursor = p ? 'pointer' : ''; }
function click(sx, sy) { const p = pick(sx, sy); select(p); if (p) focus(p); }
function select(p) { sel = p; document.querySelectorAll('.ib').forEach(b => b.classList.toggle('sel', !!p && b.dataset.id === p.id));
  for (const q of people) if (LBL[q.id]) LBL[q.id].tag.classList.toggle('on', q === p);
  const card = $('card');
  if (!p) { card.classList.add('hidden'); return; } showCard(); card.classList.remove('hidden');
  const task = (STATUS.team[p.id] || {}).task_en; showBub(p, 6, task || null); }
$('cardx').onclick = () => select(null);
function avatar(cvs, id) { const a = cvs.getContext('2d'); a.clearRect(0, 0, cvs.width, cvs.height); a.imageSmoothingEnabled = false; a.drawImage(CHARS[id].down[1], 0, 6, 16, 20, 0, 0, cvs.width, cvs.height); }
function roleOf(p) { const s = STATUS.team[p.id] || {}; return s.role || p.role_en; }
function showCard() { if (!sel) return; const s = STATUS.team[sel.id] || {}; const w = working(sel);
  $('cname').textContent = sel.name; $('crole').textContent = roleOf(sel); $('cduty').textContent = sel.blurb || '';
  $('card').style.setProperty('--acc', sel.color); $('card').classList.toggle('working', w); $('card').classList.toggle('idle', !w);
  $('cstat').innerHTML = w ? '<i class="on"></i>WORKING' : '<i></i><span class="zs">zzz</span>IDLE';
  $('cact').textContent = s.task_en || '—'; avatar($('avatar'), sel.id); }
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------- HUD ----------
const labels = $('labels'); const LBL = {}; const OV = [];
const ROOMS = [['EXECUTIVE BAR', 6 * T + 8, 13 * T + TOPM + 2, '01'], ['WAR ROOM', 6 * T + 8, 27 * T + TOPM + 2, '02'], ['TRADING FLOOR', 23 * T, 26 * T + TOPM + 6, '03'], ['SERVER VAULT', 39 * T + 8, 13 * T + TOPM + 2, '04'], ['VIP LOUNGE', 39 * T + 8, 28 * T + TOPM - 2, '05']];
function buildHUD() { const menu = $('menu');
  for (const p of people) { const b = document.createElement('button'); b.className = 'ib'; b.dataset.id = p.id; b.style.setProperty('--acc', p.color);
    const c = mk(32, 40); avatar(c, p.id); b.innerHTML = `<span class="av"></span><span class="nm"><b>${esc(p.name)}</b><small>${esc(p.role_en)}</small></span><span class="st"><i></i><em>IDLE</em></span>`;
    b.querySelector('.av').appendChild(c); b.onclick = () => { focus(p); select(p); };
    b.onmouseenter = () => setHover(p); b.onmouseleave = () => { if (hov === p) setHover(null); };
    menu.appendChild(b);
    const tag = document.createElement('div'); tag.className = 'tag'; tag.style.setProperty('--acc', p.color);
    tag.innerHTML = `<i></i><span class="tg"><b>${esc(p.name)}</b><small>${esc(p.role_en)}</small></span><em class="zs">z</em>`;
    const bub = document.createElement('div'); bub.className = 'bub'; labels.append(bub, tag); LBL[p.id] = { tag, bub, until: 0, on: false }; }
  for (const [txt, cx, cy, sub] of ROOMS) { const el = document.createElement('div'); el.className = 'ov room'; el.innerHTML = `<span>${sub}</span><b>${txt}</b>`; el.style.width = '160px'; el.style.height = '12px'; $('ovl').appendChild(el); OV.push({ el, wx: cx - 80, wy: cy }); } }
function placeLabels() { const sc = Math.max(.82, Math.min(1.2, cam.z / 2.05)), showTags = cam.z >= .85;
  for (const p of people) { const L = LBL[p.id], off = p.state === 'type' ? 6 : 0; const sx = cam.x + p.x * cam.z, top = cam.y + (p.y + off - 30 + TOPM) * cam.z, bot = cam.y + (p.y + off + 5 + TOPM) * cam.z;
    L.tag.classList.toggle('off', !(showTags || p === sel || p === hov));
    L.tag.style.transform = `translate(${Math.round(sx - L.tag.offsetWidth * sc / 2)}px,${Math.round(bot)}px) scale(${sc})`;
    if (L.on || L.bub.classList.contains('in')) L.bub.style.transform = `translate(${Math.round(sx - L.bub.offsetWidth * sc / 2)}px,${Math.round(top - L.bub.offsetHeight * sc - 4)}px) scale(${sc})`; } }
function placeOverlays() { for (const o of OV) o.el.style.transform = `translate(${cam.x + o.wx * cam.z}px,${cam.y + o.wy * cam.z}px) scale(${cam.z})`; }

// speech bubbles: a few at a time, staggered — usually 1–2, at most 3 ambient bubbles at once (never the whole team); starts are spaced >= 1.2 s apart, each fades in, lingers ~3.5–5 s, fades out
let bubK = 0, clock = 0; const BUB = { act: new Set(), next: 1.5, cool: {} }; const BUB_MAX = 3;
function bubText(p) { const w = working(p), L = LINES[p.id] || { work: ['on it'], idle: ['standing by'] };
  const pool = w ? L.work : L.idle; bubK++;
  return { line: pool[(bubK + people.indexOf(p)) % pool.length] || (w ? 'working…' : 'standing by'), think: !w && Math.random() < .45 }; }
function showBub(p, dur, forceLine) { const L = LBL[p.id]; if (!L) return; const b = forceLine ? { line: forceLine, think: false } : bubText(p);
  L.bub.innerHTML = `<i style="background:${p.color}"></i>${esc(b.line)}` + (b.think ? '<u class="t1"></u><u class="t2"></u>' : '');
  L.bub.className = 'bub' + (b.think ? ' think' : '') + (forceLine ? ' task' : ''); void L.bub.offsetWidth; L.bub.classList.add('in'); L.on = true; L.until = clock + dur; }
function hideBub(p) { const L = LBL[p.id]; if (L && L.on) { L.on = false; L.bub.classList.remove('in'); } }
function bubbleTick(dt) { clock += dt;
  for (const p of people) { const L = LBL[p.id]; if (L && L.on && clock >= L.until) { hideBub(p); if (BUB.act.delete(p)) BUB.cool[p.id] = clock + 7 + Math.random() * 6; } }
  if (clock < BUB.next) return;
  const n = BUB.act.size, cap = Math.min(BUB_MAX, Math.max(1, people.length - 2));
  // the more bubbles already up, the less likely another joins: 0 -> always, 1 -> 65%, 2 -> 30%, 3 -> never
  const join = n === 0 ? 1 : n === 1 ? .65 : n === 2 ? .3 : 0;
  if (n < cap && Math.random() < join) { const pool = people.filter(p => p !== sel && !LBL[p.id].on && clock >= (BUB.cool[p.id] || 0));
    if (pool.length) { const p = pool[Math.floor(Math.random() * pool.length)]; BUB.act.add(p); showBub(p, 3.5 + Math.random() * 1.5); } }
  BUB.next = clock + (n === 0 ? 1.2 + Math.random() * 1.8 : 1.4 + Math.random() * 2.6); }

const money = v => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let navShown = null, navAnim = null;
function setNav(v) { if (!isFinite(v)) { $('tNav').textContent = '—'; return; }
  if (navShown != null && Math.abs(navShown - v) < .001) return;
  if (navShown != null) { const b = $('tNav'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
  navAnim = { from: navShown == null ? v * .992 : navShown, to: v, k: 0 }; }
function navStep(dt) { if (!navAnim) return; navAnim.k = Math.min(1, navAnim.k + dt / 1.8); const e = 1 - Math.pow(1 - navAnim.k, 4); navShown = navAnim.from + (navAnim.to - navAnim.from) * e;
  $('tNav').textContent = money(navShown); if (navAnim.k >= 1) navAnim = null; }
function parseIct(s) { const m = /(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)/.exec(s || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], m[4] - 7, +m[5]) : NaN; }
function refreshBoard() { const nv = STATUS.net_value || {}; const v = Number(nv.usd), d = Number(nv.day_pnl_usd);
  setNav(v);
  const ok = isFinite(d), ds = ok ? (d > 0 ? '+' : d < 0 ? '−' : '') + money(d) : '—', dc = d > 0 ? 'up' : d < 0 ? 'dn' : '';
  $('tDay').textContent = ok ? ds + ' today' : ''; $('tDay').className = dc;
  const asOf = nv.as_of || STATUS.updated || ''; const age = (Date.now() - parseIct(asOf)) / 60000; const live = isFinite(age) && age < 90;
  for (const el of document.querySelectorAll('.livetag')) { el.classList.toggle('stale', !live); el.querySelector('em').textContent = live ? 'LIVE' : 'LAST SYNC'; }
  $('syncT').textContent = asOf ? asOf.slice(11, 16) + ' ICT' : '—'; }
function refreshHUD() { refreshBoard(); let n = 0;
  for (const p of people) { const w = working(p); if (w) n++; const role = roleOf(p), task = (STATUS.team[p.id] || {}).task_en || '';
    LBL[p.id].tag.classList.toggle('w', w); LBL[p.id].tag.classList.toggle('idle', !w);
    const ts = LBL[p.id].tag.querySelector('small'); if (ts) ts.textContent = role;
    const b = document.querySelector(`.ib[data-id="${p.id}"]`); b.classList.toggle('w', w); b.classList.toggle('idle', !w);
    b.querySelector('em').textContent = w ? 'WORKING' : 'IDLE'; b.querySelector('small').textContent = role; b.title = task ? role + ' — ' + task : role; }
  $('wcount').innerHTML = `<b>${n}</b> / ${people.length} WORKING`;
  const at = STATUS.team && typeof STATUS.team.as_of === 'string' ? STATUS.team.as_of : '';
  $('statusAt').textContent = at ? 'Status updated ' + at : '';
  $('sys').innerHTML = (STATUS.systems || []).map(s => `<span class="${s.ok ? 'ok' : 'bad'}"><i></i>${esc(s.name)}</span>`).join('');
  showCard(); }
// ---------- all-time volume ranking (public Polymarket Perps leaderboard, same data as polymarket.com/leaderboard/perps/all/volume) ----------
const LB_API = 'https://api.perpetuals.polymarket.com/v1/info/leaderboard?window=all&sort_by=notional&limit=1';
const compact = v => { const a = Math.abs(v); return '$' + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); };
async function pollRank() { const q = new URLSearchParams(location.search), addr = (q.get('addr') || STATUS.account || '').trim();
  try { const r = await fetch(LB_API + (/^0x[0-9a-fA-F]{40}$/.test(addr) ? '&address=' + addr : ''), { cache: 'no-store' }); if (!r.ok) return; const j = await r.json();
    const tot = Number(j.total), me = j.account || null, vol = me ? Number(me.notional) : NaN, rk = me && me.rank != null ? Number(me.rank) : NaN;
    $('tVol').textContent = isFinite(vol) ? compact(vol) : '—';
    $('tRank').textContent = isFinite(rk) ? '#' + rk.toLocaleString('en-US') : '—';
    $('tOf').textContent = isFinite(tot) ? 'of ' + tot.toLocaleString('en-US') : '';
    $('rankBox').title = me ? 'All-time perps volume rank · Polymarket leaderboard' : 'Account address not linked yet — set leaderboard_account in status.json';
  } catch (e) { } }
async function poll() { try { const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const j = await r.json(); STATUS.team = j.team || {}; STATUS.systems = j.systems; STATUS.updated = j.updated; STATUS.net_value = j.net_value; STATUS.account = j.leaderboard_account || ''; } } catch (e) { } refreshHUD(); }
let skyReady = false, bakedStamp = '';
function lightStamp() {
  const moving = (bkkT >= 5 && bkkT < 7.5) || (bkkT >= 14.2 && bkkT < 19.6);
  return moving ? 't' + Math.floor(bkkT * 30) : phase;
}
function paintPhase() {
  const bk = readPhase();
  syncPal();
  $('clock').textContent = bk.label;
  $('phaseLbl').textContent = phase.toUpperCase();
  document.body.dataset.phase = phase;
  const pip = $('phasePip'); if (pip) pip.title = 'Bangkok ' + phase;
  const stamp = lightStamp();
  if (skyReady && stamp !== bakedStamp) { bakedStamp = stamp; bakeSky(); bakeLight(); }
}
function tickClock() { paintPhase(); }

// ---------- main ----------
let last = 0, candleT = 0;
function frame(ts) { const t = ts / 1000, dt = Math.min(.05, t - (last || t)); last = t;
  for (const p of people) update(p, dt); camStep(dt); navStep(dt); bubbleTick(dt);
  if (Math.random() < dt * 5) tickCandle(); candleT += dt; if (candleT > 3) { candleT = 0; candles.shift(); candles.push(newCandle()); }
  render(t); placeLabels(); placeOverlays(); requestAnimationFrame(frame); }
(async () => {
  resize(); fit(); addEventListener('resize', () => { resize(); if (!sel) { ct = null; fit(); } else { fitTarget(); layoutHUD(); } });
  const t0 = performance.now();
  try { await loadAll(k => { $('spbar').style.width = Math.round(k * 100) + '%'; }); }
  catch (e) { $('spmsg').textContent = 'ASSET LOAD FAILED — PLEASE REFRESH'; return; }
  paintPhase();
  buildBlocked(); buildRoam(); bakeFloor(); bakeSky(); bakeLight();
  bakedStamp = lightStamp();
  skyReady = true; buildHUD();
  await poll(); initPeople(); tickClock(); setInterval(tickClock, 10000); setInterval(poll, 60000); pollRank(); setInterval(pollRank, 120000);
  const f = fitTarget(); const q = new URLSearchParams(location.search); if (q.has('shot')) document.body.classList.add('noanim'); if (q.has('cx')) { const z = +q.get('z') || 3; Object.assign(f, { z, x: innerWidth / 2 - (+q.get('cx')) * T * z, y: innerHeight / 2 - ((+q.get('cy')) * T + TOPM) * z }); } Object.assign(cam, { z: f.z * .86, x: f.x + W * f.z * .07, y: f.y + H * f.z * .07 });
  requestAnimationFrame(frame);
  if (q.has('shot')) { Object.assign(cam, f); document.body.classList.add('ready'); }
  else setTimeout(() => { document.body.classList.add('ready'); const g = q.has('cx') ? f : fitTarget(); glide(g.z, g.x, g.y, 1.8); }, Math.max(150, 800 - (performance.now() - t0)));
  setTimeout(() => $('hint').classList.add('gone'), 9000);
})();

// ---------- zoom controls hide/show (remembered per browser) ----------
(function () { const nav = document.getElementById('ctrl'), b = document.getElementById('ztog'); if (!nav || !b) return;
  const apply = h => { nav.classList.toggle('zhide', h); document.body.classList.toggle('zhide', h); const t = h ? 'Show view & sound controls' : 'Hide view & sound controls'; b.title = t; b.setAttribute('aria-label', t); b.setAttribute('aria-expanded', String(!h));
    try { localStorage.setItem('pxo.zoomHidden', h ? '1' : '0'); } catch (e) { } if (typeof layoutHUD === 'function') try { layoutHUD(); } catch (e) { } };
  let h = false; try { h = localStorage.getItem('pxo.zoomHidden') === '1'; } catch (e) { }
  apply(h); b.addEventListener('click', e => { e.stopPropagation(); apply(!nav.classList.contains('zhide')); }); })();
