import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDepartments, officeBounds, clampTarget, clampZoom, focusFor, overviewFrustum, easeInOut, workstationTransforms, roomFurniture, desksOverlap, ZOOM } from '../office3d/layout.js';

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
  c.departments[1].rect = [-12, -11, 7, 0];
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
  assert.deepEqual(clampTarget(500, -500, b), { x: cfg.office.width / 2 + 2, z: -cfg.office.depth / 2 - 2 });
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

test('one owned desk per agent, the rest free with screens off', () => {
  const ws = workstationTransforms(cfg), owned = ws.filter(w => w.on), free = ws.filter(w => !w.on);
  assert.deepEqual(owned.map(w => w.agent).sort(), ['critic', 'lead', 'ops', 'quant', 'risk', 'scout']);
  assert.equal(free.length, cfg.departments.reduce((n, d) => n + (d.free_desks || []).length, 0));
  assert.ok(free.every(w => w.agent === null));
});

test('stress desks stay inside their area, never overlap and are unowned', () => {
  const ws = workstationTransforms(cfg, 1000);
  const base = workstationTransforms(cfg).length;
  assert.ok(ws.length > base && ws.length <= base + 240);
  const byId = Object.fromEntries(cfg.departments.map(d => [d.id, d]));
  for (const w of ws.slice(cfg.departments.length)) {
    const [x0, z0, x1, z1] = byId[w.dept].rect;
    assert.equal(w.agent, null);
    assert.ok(w.x - 0.9 >= x0 && w.x + 0.9 <= x1 && w.z - 0.5 >= z0 && w.z + 1.2 <= z1, `desk at ${w.x},${w.z} leaves ${w.dept}`);
  }
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++)
    assert.ok(!desksOverlap(ws[i], ws[j]), `desks ${i} and ${j} overlap`);
});

test('validation catches desks outside their area, plants on desks, rooms over areas, bad partitions', () => {
  const c = clone(cfg);
  c.departments[0].free_desks.push([0, 0]);
  c.plants.push([c.departments[1].seat[0], c.departments[1].seat[1] + 0.8]);
  c.rooms.push({ id: 'r2', name: 'Otra', rect: [-5, -5, 5, 5], door: 'south' });
  c.departments[2].partition = { height: 9, door: 'up', door_width: 2 };
  c.departments[4].free_desks.push([c.departments[4].seat[0] + 1, c.departments[4].seat[1]]);
  const errs = validateDepartments(c).join('\n');
  assert.match(errs, /free_desks\[2\] must sit/); assert.match(errs, /plants\[\d+\] overlaps/); assert.match(errs, /overlaps area/);
  assert.match(errs, /partition.height/); assert.match(errs, /partition.door must/); assert.match(errs, /desks at .* overlap/);
});

test('room and area ids are unique together', () => {
  const c = clone(cfg); c.rooms[0].id = 'quant';
  assert.ok(validateDepartments(c).some(e => /duplicated/.test(e)));
});

test('meeting room: chairs inside the room, face the table, do not collide', () => {
  for (const rm of cfg.rooms) {
    const f = roomFurniture(rm), [x0, z0, x1, z1] = rm.rect;
    assert.equal(f.chairs.length, rm.seats);
    for (const c of f.chairs) {
      assert.ok(c.x > x0 + 0.5 && c.x < x1 - 0.5 && c.z > z0 + 0.5 && c.z < z1 - 0.5, 'chair outside room');
      assert.equal(c.rotY, c.z > f.table.z ? 0 : Math.PI, 'chair must face the table');
      assert.ok(Math.abs(c.z - f.table.z) > f.table.d / 2, 'chair inside the table');
    }
    for (let i = 0; i < f.chairs.length; i++) for (let j = i + 1; j < f.chairs.length; j++)
      assert.ok(Math.hypot(f.chairs[i].x - f.chairs[j].x, f.chairs[i].z - f.chairs[j].z) >= 0.9);
    assert.ok(f.screen.x - f.screen.w / 2 > x0 && f.screen.x + f.screen.w / 2 < x1);
  }
});

test('walls make the overview frustum taller', () => {
  const a = overviewFrustum({ ...cfg.office, wall_height: 0 }, 3)[1], b = overviewFrustum(cfg.office, 3)[1];
  assert.ok(b > a);
});

test('desk overlap rule', () => {
  assert.ok(desksOverlap({ x: 0, z: 0 }, { x: 1.9, z: 0 }));
  assert.ok(!desksOverlap({ x: 0, z: 0 }, { x: 2.0, z: 0 }));
  assert.ok(!desksOverlap({ x: 0, z: 0 }, { x: 0, z: 2.2 }));
});
