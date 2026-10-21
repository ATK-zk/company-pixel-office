import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapState, parseAsOf, agentStatuses, formatAge, matchesFilter, validateAgents, STATES, FILTERS, STALE_MS } from '../office3d/status.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const status = read('../status.json'), demo = read('../config/status.demo.json');
const cfg = read('../config/departments.json'), agentsCfg = read('../config/agents.json');
const ids = cfg.departments.map(d => d.agent);
const clone = o => JSON.parse(JSON.stringify(o));

test('raw states map to the display states', () => {
  assert.equal(mapState('WORKING'), 'running'); assert.equal(mapState('working '), 'running');
  assert.equal(mapState('IDLE'), 'idle'); assert.equal(mapState('ERROR'), 'error'); assert.equal(mapState('DISABLED'), 'disabled');
  assert.equal(mapState('WAITING'), 'waiting'); assert.equal(mapState('DEGRADED'), 'degraded'); assert.equal(mapState('DONE'), 'success');
  assert.equal(mapState('PARTYING'), 'unknown'); assert.equal(mapState(null), 'unknown'); assert.equal(mapState(''), 'unknown');
  for (const s of ['running', 'idle', 'waiting', 'success', 'degraded', 'error', 'disabled', 'unknown']) assert.ok(STATES[s], s);
});

test('as_of: ICT and ISO parse, zone-less or junk does not', () => {
  assert.equal(parseAsOf('2026-10-13 20:01 ICT'), Date.UTC(2026, 9, 13, 13, 1));
  assert.equal(parseAsOf('2026-10-13T13:01:00Z'), Date.UTC(2026, 9, 13, 13, 1));
  assert.equal(parseAsOf('2026-10-13T20:01:00+07:00'), Date.UTC(2026, 9, 13, 13, 1));
  assert.equal(parseAsOf('2026-10-13 20:01'), null);
  assert.equal(parseAsOf('2026-10-13 20:01 XYZ'), null);
  assert.equal(parseAsOf('demo'), null); assert.equal(parseAsOf(undefined), null);
});

test('real status.json from 13 Oct read on 22 Oct: everything stale, nobody animates', () => {
  const s = agentStatuses(status, ids, { now: Date.UTC(2026, 9, 22, 0, 0) });
  for (const id of ids) { assert.equal(s[id].stale, true, id); assert.equal(s[id].animate, false, id); assert.equal(s[id].demo, false); }
  assert.equal(s.risk.state, 'running'); assert.equal(s.ops.state, 'running'); assert.equal(s.quant.state, 'idle');
  assert.match(s.quant.task, /DRY desk42/);
});

test('fresh data: only WORKING agents animate', () => {
  const now = parseAsOf(status.team.as_of) + 30 * 60000;
  const s = agentStatuses(status, ids, { now });
  for (const id of ids) {
    assert.equal(s[id].stale, false);
    assert.equal(s[id].animate, status.team[id].state === 'WORKING', id);
  }
});

test('the staleness threshold is respected', () => {
  const t = parseAsOf(status.team.as_of);
  assert.equal(agentStatuses(status, ['risk'], { now: t + STALE_MS - 1 }).risk.stale, false);
  assert.equal(agentStatuses(status, ['risk'], { now: t + STALE_MS + 1 }).risk.stale, true);
  assert.equal(agentStatuses(status, ['risk'], { now: t + 10 * 60000, staleMs: 5 * 60000 }).risk.stale, true);
});

test('missing agent → disabled, unknown state → unknown with reason, no time → stale', () => {
  const st = clone(status); delete st.team.scout; st.team.critic.state = 'PARTYING'; st.team.as_of = '2026-10-13 20:01';
  const s = agentStatuses(st, ids, { now: Date.UTC(2026, 9, 13, 13, 2) });
  assert.equal(s.scout.state, 'disabled'); assert.match(s.scout.reason, /no aparece/);
  assert.equal(s.critic.state, 'unknown'); assert.match(s.critic.reason, /PARTYING/);
  assert.ok(ids.every(id => s[id].stale && !s[id].animate));
});

test('fetch failure → every agent unknown and stale, with the error in the reason', () => {
  const s = agentStatuses(null, ids, { error: 'HTTP 500' });
  for (const id of ids) { assert.equal(s[id].state, 'unknown'); assert.equal(s[id].stale, true); assert.equal(s[id].animate, false); assert.match(s[id].reason, /HTTP 500/); }
});

test('demo fixture is flagged as demo and never as real fresh data', () => {
  assert.equal(demo.demo, true);
  const s = agentStatuses(demo, ids, { now: Date.UTC(2030, 0, 1) });
  for (const id of ids) assert.equal(s[id].demo, true);
  assert.equal(s.quant.animate, true); assert.equal(s.risk.state, 'error'); assert.equal(s.ops.state, 'disabled');
  for (const t of Object.values(demo.team)) if (typeof t === 'object') assert.match(t.task_en, /^\[DEMO\]/);
});

test('ages read naturally', () => {
  assert.equal(formatAge(null), 'antigüedad desconocida');
  assert.equal(formatAge(20000), 'hace menos de 1 min');
  assert.equal(formatAge(5 * 60000), 'hace 5 min');
  assert.equal(formatAge(3 * 3600000), 'hace 3 h');
  assert.equal(formatAge(9 * 86400000), 'hace 9 d');
});

test('filters', () => {
  const s = st => ({ state: st, stale: false });
  assert.ok(matchesFilter(s('running'), 'running')); assert.ok(!matchesFilter(s('idle'), 'running'));
  assert.ok(matchesFilter(s('waiting'), 'idle')); assert.ok(matchesFilter(s('unknown'), 'issue')); assert.ok(matchesFilter(s('disabled'), 'disabled'));
  assert.ok(matchesFilter({ state: 'idle', stale: true }, 'stale')); assert.ok(!matchesFilter(s('idle'), 'stale'));
  for (const f of FILTERS) assert.ok(matchesFilter(s('idle'), 'all') && typeof f.label === 'string');
});

test('agents.json covers every placed agent with a valid look', () => {
  assert.deepEqual(validateAgents(agentsCfg, cfg.departments), []);
  const bad = clone(agentsCfg); delete bad.agents.ops; bad.agents.quant.look.hair_style = 'mohawk'; bad.agents.lead.look.skin = 'pink';
  const errs = validateAgents(bad, cfg.departments).join('\n');
  assert.match(errs, /agents.ops is missing/); assert.match(errs, /hair_style/); assert.match(errs, /look.skin/);
});
