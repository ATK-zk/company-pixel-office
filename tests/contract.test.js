import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agentStatuses, modeInfo, validateStatus, safeUrl, parseAsOf } from '../office3d/status.js';
import { diffStatuses, appendLog, recentActivity } from '../office3d/activity.js';
import { dashboardRows } from '../office3d/dashboard.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const status = read('../status.json'), demo = read('../config/status.demo.json'), cfg = read('../config/departments.json');
const ids = cfg.departments.map(d => d.agent);
const clone = o => JSON.parse(JSON.stringify(o));
const emptyMarket = { portfolio: null, leaderboard: null, errors: {}, fetchedAt: {}, history: [] };

test('today’s status.json has no optional fields: everything reads as not available', () => {
  const s = agentStatuses(status, ids, { now: Date.UTC(2026, 9, 22) });
  for (const id of ids) {
    assert.equal(s[id].lastResult, null); assert.equal(s[id].latencyMs, null); assert.equal(s[id].evidence, null);
    assert.deepEqual(s[id].errors, []); assert.deepEqual(s[id].metrics, []); assert.deepEqual(s[id].recent, []);
  }
});

test('optional per-agent fields are parsed and bounded', () => {
  const st = clone(status);
  Object.assign(st.team.quant, {
    last_result: 'x'.repeat(500), latency_ms: 1840, errors: ['a', '', 7, 'b', 'c', 'd', 'e', 'f'],
    metrics: { backtests: 3, coverage: '92 %', bad: { nested: 1 }, ['k'.repeat(50)]: 1 },
    evidence: 'https://example.org/run/1', recent: [{ at: '2026-10-22T08:00:00Z', text: 'cargado' }, { at: 'nunca', text: 'sin hora' }, { text: '' }],
  });
  st.team.risk.latency_ms = -5; st.team.risk.errors = 'not a list';
  const s = agentStatuses(st, ids);
  assert.equal(s.quant.lastResult.length, 300); assert.equal(s.quant.latencyMs, 1840);
  assert.deepEqual(s.quant.errors, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(s.quant.metrics, [{ key: 'backtests', value: 3 }, { key: 'coverage', value: '92 %' }]);
  assert.equal(s.quant.evidence, 'https://example.org/run/1');
  assert.deepEqual(s.quant.recent, [{ at: Date.UTC(2026, 9, 22, 8), text: 'cargado' }, { at: null, text: 'sin hora' }]);
  assert.equal(s.risk.latencyMs, null); assert.deepEqual(s.risk.errors, []);
});

test('evidence links: only https or relative paths', () => {
  for (const ok of ['https://github.com/x/y', 'status.json', 'config/status.demo.json', './a/b.json', '../c.json', 'logs/run.json?id=3'])
    assert.equal(safeUrl(ok), ok, ok);
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,hi', 'http://example.org', '//evil.example', 'https://a b', '', null, 42, 'vbscript:x'])
    assert.equal(safeUrl(bad), null, String(bad));
});

test('per-agent updated_at overrides team.as_of for freshness', () => {
  const st = clone(status); st.team.risk.updated_at = '2026-10-22 07:00 ICT';
  const now = parseAsOf('2026-10-22 07:30 ICT');
  const s = agentStatuses(st, ids, { now });
  assert.equal(s.risk.stale, false); assert.equal(s.risk.animate, true, 'WORKING + fresh → animates');
  assert.equal(s.ops.stale, true, 'others still use team.as_of');
  st.team.risk.updated_at = 'yesterday';
  assert.equal(agentStatuses(st, ids, { now }).risk.stale, true, 'unreadable updated_at falls back to team.as_of');
});

test('mode: absent, known, LIVE and unknown', () => {
  assert.deepEqual(modeInfo(status), { mode: null, label: 'Modo no publicado', color: '#6b737d', known: false, live: false });
  assert.equal(modeInfo({ mode: 'paper' }).mode, 'PAPER');
  const live = modeInfo({ mode: 'LIVE' }); assert.equal(live.live, true); assert.equal(live.known, true);
  assert.equal(modeInfo({ mode: 'turbo' }).known, false); assert.match(modeInfo({ mode: 'turbo' }).label, /desconocido/);
  assert.equal(modeInfo(null).known, false);
});

test('data quality: today’s file only lacks the mode; broken files are reported', () => {
  assert.deepEqual(validateStatus(status, ids), [{ level: 'info', text: 'mode no publicado (MOCK, PAPER o LIVE)' }]);
  const bad = clone(status);
  delete bad.team.scout; bad.team.critic.state = 'PARTYING'; bad.team.as_of = '13 Oct'; bad.team.ghost = { state: 'IDLE' };
  bad.team.quant.evidence = 'javascript:alert(1)'; bad.systems = [{ name: 'x' }]; bad.net_value.usd = 'lots'; bad.leaderboard_account = '0x1'; bad.mode = 'TURBO';
  const t = validateStatus(bad, ids).map(x => `${x.level}:${x.text}`).join('\n');
  for (const re of [/team.as_of/, /team.scout falta/, /PARTYING/, /team.ghost no tiene puesto/, /evidence no es un enlace/, /systems/, /net_value/, /leaderboard_account/, /warn:mode "TURBO"/]) assert.match(t, re);
  assert.deepEqual(validateStatus([], ids), [{ level: 'warn', text: 'status.json no es un objeto JSON' }]);
});

test('demo fixture follows the contract and stays labelled', () => {
  // ops is left out on purpose so the demo shows the "disabled" state; that is the only warning
  assert.deepEqual(validateStatus(demo, ids).filter(x => x.level === 'warn'), [{ level: 'warn', text: 'team.ops falta' }]);
  const s = agentStatuses(demo, ids);
  assert.equal(s.quant.latencyMs, 1840); assert.ok(s.quant.metrics.every(m => m.key.startsWith('[DEMO]')));
  assert.ok(s.risk.errors[0].startsWith('[DEMO]')); assert.equal(modeInfo(demo).mode, 'PAPER');
});

test('activity: nothing on the first reading, then state and task changes', () => {
  const t0 = parseAsOf(status.team.as_of);
  const a = agentStatuses(status, ids, { now: t0 });
  assert.deepEqual(diffStatuses(null, a, 1), []);
  assert.deepEqual(diffStatuses(a, a, 1), []);
  const st = clone(status); st.team.quant.state = 'WORKING'; st.team.quant.task_en = 'Nueva tarea X';
  const ev = diffStatuses(a, agentStatuses(st, ids, { now: t0 }), 5);
  assert.deepEqual(ev.map(e => e.text), ['Estado: Inactivo → Trabajando', 'Tarea nueva: Nueva tarea X']);
  assert.ok(ev.every(e => e.id === 'quant' && e.at === 5));
  let log = {}; for (let i = 0; i < 30; i++) log = appendLog(log, [{ id: 'quant', at: i, text: String(i) }]);
  assert.equal(log.quant.length, 20); assert.equal(log.quant[0].text, '29');
});

test('activity: published and observed items are merged, newest first, with their source', () => {
  const s = { recent: [{ at: 10, text: 'pub' }, { at: null, text: 'sin hora' }] };
  const items = recentActivity(s, [{ at: 20, text: 'obs' }]);
  assert.deepEqual(items.map(i => `${i.text}/${i.src}`), ['obs/observado', 'pub/status.json', 'sin hora/status.json']);
  assert.deepEqual(recentActivity({ recent: [] }, undefined), []);
});

test('data panel: mode row follows the contract, quality group lists the checks', () => {
  const by = (rows, l) => rows.find(r => r.label === l);
  let rows = dashboardRows({ market: emptyMarket, status, statusError: null, placedIds: ids });
  assert.equal(by(rows, 'Modo operativo').value, 'No publicado'); assert.equal(by(rows, 'Modo operativo').src, 'none');
  assert.ok(rows.some(r => r.group && /Calidad/.test(r.group)));
  assert.ok(rows.some(r => r.label === 'Nota' && /mode no publicado/.test(r.value)));
  rows = dashboardRows({ market: emptyMarket, status: { ...status, mode: 'LIVE' }, statusError: null, placedIds: ids });
  const m = by(rows, 'Modo operativo');
  assert.equal(m.value, 'LIVE'); assert.equal(m.src, 'sync'); assert.equal(m.warn, true); assert.match(m.note, /no opera/);
});
