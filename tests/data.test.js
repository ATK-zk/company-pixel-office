import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePortfolio, parseLeaderboard, syncedNetValue, lossCap, discrepancy, pushSample, fmtUsd, fmtPct, isAddress, toMs, createMarket, API } from '../office3d/data.js';
import { dashboardRows } from '../office3d/dashboard.js';

const status = JSON.parse(readFileSync(new URL('../status.json', import.meta.url), 'utf8'));
// Shapes as returned by the public API on 2026-10-22 (values trimmed).
const PORTFOLIO = { positions: [], equity: '0.00000066108411993026145029', timestamp: 1792623822325 };
const LEADERBOARD = { window: 'all', total: 31785, timestamp: 1792623786531, entries: [],
  account: { rank: 1013, account: status.leaderboard_account, pnl: '-134.23866033891588', notional: '129721.592076', roi: '-0.31116' } };
const emptyMarket = { portfolio: null, leaderboard: null, errors: {}, fetchedAt: {}, history: [] };

test('portfolio: string equity, ms timestamps, position count', () => {
  const p = parsePortfolio(PORTFOLIO);
  assert.ok(Math.abs(p.equity - 6.61e-7) < 1e-9); assert.equal(p.positions, 0); assert.equal(p.ts, 1792623822325);
  assert.equal(parsePortfolio({ equity: 5, timestamp: 1792623822 }).ts, 1792623822000, 'seconds are converted to ms');
  assert.throws(() => parsePortfolio({ equity: 'abc' })); assert.throws(() => parsePortfolio(null));
});

test('leaderboard: with and without our account', () => {
  const l = parseLeaderboard(LEADERBOARD);
  assert.equal(l.found, true); assert.equal(l.rank, 1013); assert.ok(Math.abs(l.pnl + 134.2387) < 1e-3); assert.equal(l.total, 31785);
  const none = parseLeaderboard({ total: 10, entries: [] });
  assert.equal(none.found, false); assert.ok(Number.isNaN(none.rank));
  assert.throws(() => parseLeaderboard(null));
});

test('status.json net value and the daily loss-cap formula', () => {
  const nv = syncedNetValue(status);
  assert.equal(nv.usd, 400); assert.equal(nv.dayPnl, -32.89); assert.equal(nv.asOf, Date.UTC(2026, 9, 12, 6, 21));
  const cap = lossCap(nv);
  assert.ok(Math.abs(cap.pct - (-32.89 / 432.89 * 100)) < 1e-9); assert.equal(cap.breached, false);
  assert.ok(cap.used > 0.5 && cap.used < 0.51);
  assert.equal(lossCap({ usd: 80, dayPnl: -20 }).breached, true);
  assert.equal(lossCap({ usd: 100, dayPnl: 10 }).used, 0);
  assert.equal(lossCap({ usd: NaN, dayPnl: 1 }), null); assert.equal(lossCap(null), null);
  assert.equal(syncedNetValue({}), null);
});

test('discrepancy between provider and status.json', () => {
  const nv = syncedNetValue(status);
  const d = discrepancy(6.6e-7, nv);
  assert.ok(d && Math.round(d.pct) === -100);
  assert.equal(discrepancy(401, nv), null, 'within 5 %');
  assert.ok(discrepancy(430, nv));
  assert.equal(discrepancy(NaN, nv), null); assert.equal(discrepancy(1, null), null);
});

test('helpers', () => {
  let h = []; for (let i = 0; i < 200; i++) h = pushSample(h, i, i, 180);
  assert.equal(h.length, 180); assert.equal(h[0].v, 20);
  assert.equal(pushSample([], NaN, 0).length, 0);
  assert.equal(fmtUsd(6.6e-7), '0,00 $'); assert.equal(fmtUsd(-32.89, { sign: true }), '−32,89 $'); assert.equal(fmtUsd(NaN), '—');
  assert.equal(fmtPct(-7.6), '−7,6 %');
  assert.ok(isAddress(status.leaderboard_account)); assert.ok(!isAddress('0x123')); assert.ok(!isAddress(undefined));
  assert.equal(toMs('x'), null);
});

test('only the two public read-only endpoints are used', () => {
  for (const url of Object.values(API)) assert.match(url, /^https:\/\/api\.perpetuals\.polymarket\.com\/v1\/info\/(portfolio|leaderboard)\?/);
});

test('data panel: nothing is shown without a source, missing data is labelled', () => {
  const market = { ...emptyMarket, portfolio: parsePortfolio(PORTFOLIO), leaderboard: parseLeaderboard(LEADERBOARD) };
  const rows = dashboardRows({ market, status, statusError: null }).filter(r => !r.group);
  for (const r of rows) {
    if (r.src === 'none') assert.ok(r.value === '—' || r.value === 'No publicado', `${r.label} has no source but shows ${r.value}`);
    else assert.notEqual(r.value, '—', `${r.label} claims ${r.src} but is empty`);
  }
  const by = l => rows.find(r => r.label === l);
  assert.equal(by('Equity').src, 'real'); assert.equal(by('Equity según status.json').src, 'sync');
  assert.ok(by('Discrepancia de equity'), 'the 400 $ vs 0 $ gap is flagged');
  assert.equal(by('Modo operativo').value, 'No publicado');
  for (const l of ['P&L realizado / no realizado', 'Drawdown actual y máximo', 'Operaciones y tasa de acierto']) assert.equal(by(l).src, 'none');
});

test('data panel without provider data shows no REAL values', () => {
  const rows = dashboardRows({ market: { ...emptyMarket, errors: { portfolio: 'HTTP 503' } }, status, statusError: null });
  assert.ok(!rows.some(r => r.src === 'real'));
  assert.equal(rows.find(r => r.label === 'Equity').note, 'HTTP 503');
});

test('market poller: fetches both endpoints, keeps history, reports errors, stops cleanly', async () => {
  const realFetch = globalThis.fetch, calls = [];
  let fail = false;
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (fail) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, json: async () => (String(url).includes('portfolio') ? PORTFOLIO : LEADERBOARD) };
  };
  let m;
  try {
    let changes = 0;
    m = createMarket({ onChange: () => changes++, portfolioMs: 1e6, leaderboardMs: 1e6 });
    m.setAddress('0x123');
    assert.match(m.state.errors.address, /leaderboard_account/); assert.equal(calls.length, 0);
    m.setAddress(status.leaderboard_account);
    await new Promise(r => setTimeout(r, 20));
    assert.equal(calls.length, 2); assert.ok(calls.every(u => u.endsWith(status.leaderboard_account)));
    assert.equal(m.state.history.length, 1); assert.equal(m.state.leaderboard.rank, 1013); assert.deepEqual(m.state.errors, {});
    fail = true; m.setAddress('0x0000000000000000000000000000000000000001');
    await new Promise(r => setTimeout(r, 20));
    assert.equal(m.state.portfolio, null); assert.match(m.state.errors.portfolio, /HTTP 503/);
    assert.ok(changes >= 4);
    // a slow answer for the previous account must not land on the new one
    let release; fail = false;
    globalThis.fetch = url => new Promise(res => { release = () => res({ ok: true, json: async () => (String(url).includes('portfolio') ? PORTFOLIO : LEADERBOARD) }); });
    m.setAddress(status.leaderboard_account);
    const slow = release;
    m.setAddress('0x0000000000000000000000000000000000000002');
    slow(); await new Promise(r => setTimeout(r, 20));
    assert.equal(m.state.portfolio, null, 'stale answer was dropped');
    assert.equal(m.state.address, '0x0000000000000000000000000000000000000002');
  } finally { if (m) m.stop(); globalThis.fetch = realFetch; }
});
