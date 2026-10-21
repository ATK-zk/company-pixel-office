// Financial data for screens and the data panel. Every value carries its origin:
//   real  — read now from the public Polymarket Perps API (no auth, read-only GET, same endpoints as the 2D office)
//   sync  — copied into status.json by the external sync job (can be old)
//   calc  — computed in the browser from the values above (formula documented next to it)
//   none  — no connected source; shown as "sin datos", never invented
// Nothing here can send orders: the only network calls are GETs to the two public endpoints and status.json.
import { parseAsOf } from './status.js';

export const API = {
  portfolio: 'https://api.perpetuals.polymarket.com/v1/info/portfolio?address=',
  leaderboard: 'https://api.perpetuals.polymarket.com/v1/info/leaderboard?window=all&sort_by=notional&limit=1&address=',
};
export const SOURCE = {
  real: { label: 'REAL · proveedor', color: '#c6ff3d' },
  sync: { label: 'status.json', color: '#8fb4ff' },
  calc: { label: 'CALCULADO', color: '#5ef2d6' },
  demo: { label: 'DEMO', color: '#ffcf5c' },
  none: { label: 'SIN DATOS', color: '#6b737d' },
};
export const DAILY_LOSS_CAP_PCT = 15; // README: Risk Watch monitors "the 15% daily loss cap"

export const isAddress = a => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
const num = v => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : NaN; };
export const toMs = t => { const n = num(t); return Number.isNaN(n) ? null : n < 1e12 ? n * 1000 : n; };

export function parsePortfolio(j) {
  const equity = num(j && j.equity);
  if (Number.isNaN(equity)) throw new Error('respuesta de portfolio sin equity numérica');
  return { equity, positions: Array.isArray(j.positions) ? j.positions.length : null, ts: toMs(j.timestamp) };
}
export function parseLeaderboard(j) {
  if (!j || typeof j !== 'object') throw new Error('respuesta de leaderboard vacía');
  const a = j.account && typeof j.account === 'object' ? j.account : null;
  return { found: !!a, rank: a ? num(a.rank) : NaN, notional: a ? num(a.notional) : NaN, pnl: a ? num(a.pnl) : NaN, roi: a ? num(a.roi) : NaN,
    total: num(j.total), ts: toMs(j.timestamp) };
}
export function syncedNetValue(status) {
  const nv = status && status.net_value;
  if (!nv || typeof nv !== 'object') return null;
  return { usd: num(nv.usd), dayPnl: num(nv.day_pnl_usd), positions: num(nv.positions), asOf: parseAsOf(nv.as_of), asOfRaw: nv.as_of || null, source: nv.source || null };
}

// Day P&L as a share of start-of-day equity (usd − day_pnl), against the daily loss cap.
export function lossCap(nv, capPct = DAILY_LOSS_CAP_PCT) {
  if (!nv || !Number.isFinite(nv.usd) || !Number.isFinite(nv.dayPnl)) return null;
  const start = nv.usd - nv.dayPnl;
  if (!(start > 0)) return null;
  const pct = nv.dayPnl / start * 100;
  return { pct, capPct, used: pct < 0 ? Math.min(1, -pct / capPct) : 0, breached: -pct >= capPct };
}

// Two sources disagree on equity by more than tolPct (relative to the larger of |synced| and $1).
export function discrepancy(realEquity, synced, tolPct = 5) {
  if (!Number.isFinite(realEquity) || !synced || !Number.isFinite(synced.usd)) return null;
  const diff = realEquity - synced.usd, base = Math.max(1, Math.abs(synced.usd));
  return Math.abs(diff) / base * 100 > tolPct ? { diff, pct: diff / base * 100 } : null;
}

export function pushSample(hist, v, t, max = 180) {
  if (!Number.isFinite(v)) return hist;
  const h = hist.concat({ v, t });
  return h.length > max ? h.slice(h.length - max) : h;
}

export function fmtUsd(v, { sign = false } = {}) {
  if (!Number.isFinite(v)) return '—';
  const r = Math.abs(v) < 0.005 ? 0 : v;
  const s = Math.abs(r).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (r < 0 ? '−' : sign && r > 0 ? '+' : '') + s + ' $';
}
export function fmtCompactUsd(v) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v), s = a >= 1e9 ? (a / 1e9).toFixed(2) + ' B' : a >= 1e6 ? (a / 1e6).toFixed(2) + ' M' : a >= 1e4 ? (a / 1e3).toFixed(1) + ' K' : a.toFixed(2);
  return (v < 0 ? '−' : '') + s.replace('.', ',') + ' $';
}
export const fmtPct = (v, d = 1) => Number.isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ',') + ' %' : '—';

async function getJson(url, ms = 8000) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) { throw new Error(e.name === 'AbortError' ? 'tiempo de espera agotado' : e.message || String(e)); }
  finally { clearTimeout(timer); }
}

// Polls the two public endpoints for the account in status.json. Keeps the last good value after an error.
export function createMarket({ onChange, portfolioMs = 20000, leaderboardMs = 120000 }) {
  const state = { address: null, portfolio: null, leaderboard: null, errors: {}, fetchedAt: {}, history: [] };
  let timers = [], busy = {}, gen = 0; // gen changes with the account, so late answers for an old one are dropped
  async function run(kind) {
    if (busy[kind] || !isAddress(state.address)) return;
    const g = gen, addr = state.address;
    busy[kind] = true;
    try {
      const j = await getJson(API[kind] + addr);
      if (g !== gen) return;
      if (kind === 'portfolio') { state.portfolio = parsePortfolio(j); state.history = pushSample(state.history, state.portfolio.equity, state.portfolio.ts || Date.now()); }
      else state.leaderboard = parseLeaderboard(j);
      delete state.errors[kind]; state.fetchedAt[kind] = Date.now();
    } catch (e) {
      if (g !== gen) return;
      state.errors[kind] = e.message;
    } finally { if (g === gen) busy[kind] = false; }
    onChange(state);
  }
  return {
    state,
    setAddress(addr) {
      if (addr === state.address) return;
      state.address = isAddress(addr) ? addr : null; state.portfolio = state.leaderboard = null; state.history = [];
      timers.forEach(clearInterval); timers = []; gen++; busy = {};
      if (!state.address) { state.errors = { address: 'status.json no tiene una dirección de cuenta válida (leaderboard_account)' }; onChange(state); return; }
      state.errors = {};
      run('portfolio'); run('leaderboard');
      timers.push(setInterval(() => run('portfolio'), portfolioMs), setInterval(() => run('leaderboard'), leaderboardMs));
    },
    stop() { timers.forEach(clearInterval); timers = []; },
  };
}
