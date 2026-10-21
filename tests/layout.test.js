import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDepartments, officeBounds, clampTarget, clampZoom, focusFor, overviewFrustum, easeInOut, workstationTransforms, ZOOM } from '../office3d/layout.js';

const cfg = JSON.parse(readFileSync(new URL('../config/departments.json', import.meta.url), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));

test('departments.json is valid', () => assert.deepEqual(validateDepartments(cfg), []));

test('six areas, each mapped to the approved agent', () => {
  const map = Object.fromEntries(cfg.departments.map(d => [d.id, d.agent]));
  assert.deepEqual(map, { research: 'scout', quant: 'quant', strategy: 'lead', risk: 'risk', execution: 'ops', oversight: 'critic' });
});

test('every agent id exists in status.json', () => {
  const status = JSON.parse(readFileSync(new URL('../status.json', import.meta.url), 'utf8'));
  for (const d of cfg.departments) assert.ok(status.team[d.agent], `status.json has no team.${d.agent}`);
});

test('validation catches overlaps, duplicates, bad colours and stray seats', () => {
  const c = clone(cfg);
  c.departments[1].rect = [-10, -14, 6.5, -2];
  c.departments[2].agent = 'scout';
  c.departments[3].color = 'red';
  c.departments[4].seat = [100, 100];
  const errs = validateDepartments(c).join('\n');
  assert.match(errs, /overlap/); assert.match(errs, /assigned twice/); assert.match(errs, /#rrggbb/); assert.match(errs, /inside its rect/);
});

test('validation rejects missing structure', () => {
  assert.ok(validateDepartments(null).length);
  assert.ok(validateDepartments({ office: { width: 10, depth: 10 }, departments: [] }).length);
  assert.ok(validateDepartments({ ...clone(cfg), aisles: [[0, 0, 999, 0]] }).some(e => /aisles\[0\]/.test(e)));
});

test('camera target is clamped to the office plus margin', () => {
  const b = officeBounds(cfg.office, 2);
  assert.deepEqual(clampTarget(0, 0, b), { x: 0, z: 0 });
  assert.deepEqual(clampTarget(500, -500, b), { x: 26, z: -18 });
});

test('zoom stays within limits', () => {
  assert.equal(clampZoom(0.01), ZOOM.min);
  assert.equal(clampZoom(99), ZOOM.max);
  assert.equal(clampZoom(2), 2);
});

test('focus centres on the area and zooms in within limits', () => {
  for (const d of cfg.departments) {
    const f = focusFor(d, cfg.office);
    assert.equal(f.x, (d.rect[0] + d.rect[2]) / 2); assert.equal(f.z, (d.rect[1] + d.rect[3]) / 2);
    assert.ok(f.zoom > ZOOM.overview && f.zoom <= ZOOM.max);
  }
});

test('overview frustum keeps the aspect ratio and grows on narrow screens', () => {
  const [w1, h1] = overviewFrustum(cfg.office, 16 / 9), [w2, h2] = overviewFrustum(cfg.office, 9 / 19);
  assert.ok(Math.abs(w1 / h1 - 16 / 9) < 1e-9); assert.ok(Math.abs(w2 / h2 - 9 / 19) < 1e-9);
  assert.ok(h2 > h1, 'portrait needs a taller frustum to fit the office width');
});

test('easing is bounded and monotonic', () => {
  assert.equal(easeInOut(0), 0); assert.equal(easeInOut(1), 1); assert.equal(easeInOut(-1), 0); assert.equal(easeInOut(2), 1);
  let prev = 0; for (let t = 0; t <= 1; t += 0.05) { const v = easeInOut(t); assert.ok(v >= prev); prev = v; }
});

test('one owned desk per area by default', () => {
  const ws = workstationTransforms(cfg);
  assert.equal(ws.length, 6);
  assert.deepEqual(ws.map(w => w.agent).sort(), ['critic', 'lead', 'ops', 'quant', 'risk', 'scout']);
});

test('stress desks stay inside their area, never overlap and are unowned', () => {
  const ws = workstationTransforms(cfg, 1000);
  assert.ok(ws.length > 6 && ws.length <= 6 + 240);
  const byId = Object.fromEntries(cfg.departments.map(d => [d.id, d]));
  for (const w of ws.slice(6)) {
    const [x0, z0, x1, z1] = byId[w.dept].rect;
    assert.equal(w.agent, null);
    assert.ok(w.x - 0.9 >= x0 && w.x + 0.9 <= x1 && w.z - 0.5 >= z0 && w.z + 1.2 <= z1, `desk at ${w.x},${w.z} leaves ${w.dept}`);
  }
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++)
    assert.ok(Math.abs(ws[i].x - ws[j].x) >= 2.2 || Math.abs(ws[i].z - ws[j].z) >= 2.4, `desks ${i} and ${j} overlap`);
});
