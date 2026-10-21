// Pure layout + camera helpers for the 3D office. No three.js import, so Node tests can run them.
// World units are metres; the office floor is centred on the origin (x → east, z → south).
// A desk at (x, z) spans x ± 0.9 and z − 0.5 … z + 1.2 (monitors on the north edge, chair to the south).

export const ZOOM = { min: 0.6, max: 10, overview: 1 };
export const VIEW = { polar: 55, azimuth: 32 }; // default isometric angles, degrees
export const SIDES = ['north', 'south', 'east', 'west'];
export const PANEL_KINDS = ['news', 'quant', 'strategy', 'risk', 'execution', 'oversight', 'summary'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isPoint = p => Array.isArray(p) && p.length >= 2 && p.slice(0, 3).every(isNum);
const isRect = r => Array.isArray(r) && r.length === 4 && r.every(isNum) && r[0] < r[2] && r[1] < r[3];
const inside = (x, z, r, m = 0) => x >= r[0] + m && x <= r[2] - m && z >= r[1] + m && z <= r[3] - m;
const rectsOverlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
export const desksOverlap = (a, b) => Math.abs(a.x - b.x) < 2.0 && Math.abs(a.z - b.z) < 2.2;
const nearDesk = (x, z, d, pad) => x > d.x - 0.9 - pad && x < d.x + 0.9 + pad && z > d.z - 0.5 - pad && z < d.z + 1.2 + pad;

// Returns a list of human-readable problems; empty means the config is usable.
export function validateDepartments(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object') return ['config must be an object'];
  const o = cfg.office;
  if (!o || !isNum(o.width) || !isNum(o.depth) || o.width <= 0 || o.depth <= 0) return ['office.width/depth must be positive numbers'];
  if (o.wall_height != null && (!isNum(o.wall_height) || o.wall_height < 0)) errors.push('office.wall_height must be a non-negative number');
  if (!Array.isArray(cfg.departments) || !cfg.departments.length) return errors.concat('departments must be a non-empty array');
  const officeRect = [-o.width / 2, -o.depth / 2, o.width / 2, o.depth / 2];
  const ids = new Set(), agents = new Set();
  cfg.departments.forEach((d, i) => {
    const at = `departments[${i}]`;
    if (typeof d.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(d.id)) errors.push(`${at}.id is invalid`);
    else if (ids.has(d.id)) errors.push(`${at}.id "${d.id}" is duplicated`); else ids.add(d.id);
    if (typeof d.name !== 'string' || !d.name.trim()) errors.push(`${at}.name is required`);
    if (typeof d.agent !== 'string' || !d.agent) errors.push(`${at}.agent is required`);
    else if (agents.has(d.agent)) errors.push(`${at}.agent "${d.agent}" is assigned twice`); else agents.add(d.agent);
    if (typeof d.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(d.color)) errors.push(`${at}.color must be #rrggbb`);
    const r = d.rect;
    if (!isRect(r)) { errors.push(`${at}.rect must be [x0, z0, x1, z1] with x0 < x1, z0 < z1`); return; }
    if (!inside(r[0], r[1], officeRect) || !inside(r[2], r[3], officeRect)) errors.push(`${at}.rect is outside the office`);
    if (!isPoint(d.seat)) errors.push(`${at}.seat must be [x, z, rotY?]`);
    else if (!inside(d.seat[0], d.seat[1], r, 1)) errors.push(`${at}.seat must sit at least 1 m inside its rect`);
    if (d.free_desks != null && !Array.isArray(d.free_desks)) errors.push(`${at}.free_desks must be an array`);
    (Array.isArray(d.free_desks) ? d.free_desks : []).forEach((p, k) => {
      if (!isPoint(p)) errors.push(`${at}.free_desks[${k}] must be [x, z, rotY?]`);
      else if (!inside(p[0], p[1], r, 1)) errors.push(`${at}.free_desks[${k}] must sit at least 1 m inside its rect`);
    });
    if (d.display != null) {
      if (!isPoint(d.display)) errors.push(`${at}.display must be [x, z, rotY?]`);
      else if (!inside(d.display[0], d.display[1], r, 0.5)) errors.push(`${at}.display must sit inside its rect`);
    }
    if (d.panel != null && !PANEL_KINDS.includes(d.panel)) errors.push(`${at}.panel must be one of ${PANEL_KINDS.join(', ')}`);
    if (d.panel != null && d.display == null) errors.push(`${at}.panel needs a display to show it on`);
    if (d.partition != null) {
      const p = d.partition, side = /^(north|south)$/.test(p.door) ? r[2] - r[0] : r[3] - r[1];
      if (!isNum(p.height) || p.height < 0.5 || p.height > 3) errors.push(`${at}.partition.height must be 0.5–3 m`);
      if (!SIDES.includes(p.door)) errors.push(`${at}.partition.door must be one of ${SIDES.join(', ')}`);
      else if (!isNum(p.door_width) || p.door_width <= 0 || p.door_width >= side) errors.push(`${at}.partition.door_width must fit its side`);
    }
  });
  const depts = cfg.departments.filter(d => isRect(d.rect));
  for (let i = 0; i < depts.length; i++) for (let j = i + 1; j < depts.length; j++)
    if (rectsOverlap(depts[i].rect, depts[j].rect)) errors.push(`areas "${depts[i].id}" and "${depts[j].id}" overlap`);

  const rooms = cfg.rooms == null ? [] : cfg.rooms;
  if (!Array.isArray(rooms)) errors.push('rooms must be an array');
  else rooms.forEach((rm, i) => {
    const at = `rooms[${i}]`;
    if (typeof rm.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(rm.id)) errors.push(`${at}.id is invalid`);
    else if (ids.has(rm.id)) errors.push(`${at}.id "${rm.id}" is duplicated`); else ids.add(rm.id);
    if (typeof rm.name !== 'string' || !rm.name.trim()) errors.push(`${at}.name is required`);
    if (!isRect(rm.rect)) { errors.push(`${at}.rect must be [x0, z0, x1, z1]`); return; }
    if (!inside(rm.rect[0], rm.rect[1], officeRect) || !inside(rm.rect[2], rm.rect[3], officeRect)) errors.push(`${at}.rect is outside the office`);
    for (const d of depts) if (rectsOverlap(rm.rect, d.rect)) errors.push(`${at} overlaps area "${d.id}"`);
    if (!SIDES.includes(rm.door)) errors.push(`${at}.door must be one of ${SIDES.join(', ')}`);
    if (rm.seats != null && (!Number.isInteger(rm.seats) || rm.seats < 0 || rm.seats > 12)) errors.push(`${at}.seats must be an integer 0–12`);
    if (rm.panel != null && !PANEL_KINDS.includes(rm.panel)) errors.push(`${at}.panel must be one of ${PANEL_KINDS.join(', ')}`);
  });

  // desks must not overlap each other; plants must not stand on a desk or chair
  const all = depts.flatMap(d => [d.seat, ...(Array.isArray(d.free_desks) ? d.free_desks : [])].filter(isPoint).map(p => ({ x: p[0], z: p[1], dept: d.id })));
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
    if (desksOverlap(all[i], all[j])) errors.push(`desks at (${all[i].x}, ${all[i].z}) and (${all[j].x}, ${all[j].z}) overlap`);
  for (const d of depts) if (isPoint(d.display)) for (const k of all)
    if (nearDesk(d.display[0], d.display[1], k, 0.3)) errors.push(`display of "${d.id}" overlaps the desk at (${k.x}, ${k.z})`);
  if (cfg.plants != null) {
    if (!Array.isArray(cfg.plants)) errors.push('plants must be an array');
    else cfg.plants.forEach((p, i) => {
      if (!isPoint(p)) { errors.push(`plants[${i}] must be [x, z]`); return; }
      if (!inside(p[0], p[1], officeRect, 0.3)) errors.push(`plants[${i}] is outside the office`);
      for (const k of all) if (nearDesk(p[0], p[1], k, 0.3)) errors.push(`plants[${i}] overlaps the desk at (${k.x}, ${k.z})`);
    });
  }
  if (cfg.aisles != null) {
    if (!Array.isArray(cfg.aisles)) errors.push('aisles must be an array');
    else cfg.aisles.forEach((a, i) => {
      if (!Array.isArray(a) || a.length !== 4 || !a.every(isNum)) errors.push(`aisles[${i}] must be [x0, z0, x1, z1]`);
      else if (!inside(a[0], a[1], officeRect) || !inside(a[2], a[3], officeRect)) errors.push(`aisles[${i}] is outside the office`);
    });
  }
  return errors;
}

export function officeBounds(office, margin = 0) {
  return { minX: -office.width / 2 - margin, maxX: office.width / 2 + margin, minZ: -office.depth / 2 - margin, maxZ: office.depth / 2 + margin };
}

// Keeps the camera's look-at point over the office so the map can't be lost.
export function clampTarget(x, z, b) { return { x: clamp(x, b.minX, b.maxX), z: clamp(z, b.minZ, b.maxZ) }; }
export function clampZoom(z) { return clamp(z, ZOOM.min, ZOOM.max); }

// Orthographic frustum [width, height] at zoom 1 that fits the whole office (walls included) seen from the given angles.
export function overviewFrustum(office, aspect, polar = VIEW.polar, azimuth = VIEW.azimuth) {
  const a = azimuth * Math.PI / 180, p = polar * Math.PI / 180;
  const across = office.width * Math.abs(Math.cos(a)) + office.depth * Math.abs(Math.sin(a));
  const along = (office.width * Math.abs(Math.sin(a)) + office.depth * Math.abs(Math.cos(a))) * Math.cos(p) + (office.wall_height || 0) * Math.sin(p);
  const h = Math.max(along * 1.12, across * 1.04 / aspect);
  return [h * aspect, h];
}

// Look-at point and zoom that frame one area or room (anything with a rect).
export function focusFor(zone, office) {
  const [x0, z0, x1, z1] = zone.rect;
  const zoom = clampZoom(0.75 * Math.min(office.width / (x1 - x0), office.depth / (z1 - z0)));
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, zoom };
}

export function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// Owned desks first (one per agent, `on: true`), then free desks (`agent: null`, screens off),
// then `extra` unowned desks for the stress test (?stress=N), placed where nothing else stands.
export function workstationTransforms(cfg, extra = 0) {
  const owned = cfg.departments.map(d => ({ x: d.seat[0], z: d.seat[1], rotY: d.seat[2] || 0, dept: d.id, agent: d.agent, on: true }));
  const free = cfg.departments.flatMap(d => (d.free_desks || []).map(p => ({ x: p[0], z: p[1], rotY: p[2] || 0, dept: d.id, agent: null, on: false })));
  const out = owned.concat(free);
  const n = clamp(Math.floor(extra) || 0, 0, 240);
  if (!n) return out;
  const blockers = out.concat(cfg.departments.filter(d => d.display).map(d => ({ x: d.display[0], z: d.display[1] - 1 })));
  const spots = [];
  for (const d of cfg.departments) {
    const [x0, z0, x1, z1] = d.rect;
    for (let z = z0 + 1.6; z <= z1 - 1.6; z += 2.6) for (let x = x0 + 1.4; x <= x1 - 1.4; x += 2.3) {
      const s = { x, z, rotY: 0, dept: d.id, agent: null, on: false };
      if (!blockers.some(b => desksOverlap(b, s)) && !spots.some(b => desksOverlap(b, s))) spots.push(s);
    }
  }
  return out.concat(spots.slice(0, n));
}

// Meeting-room furniture: table in the middle, chairs on the long sides facing it, summary screen on the north wall.
export function roomFurniture(room) {
  const [x0, z0, x1, z1] = room.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const n = room.seats || 0, perSide = Math.ceil(n / 2), w = Math.min(x1 - x0 - 3, Math.max(2, perSide * 1.3)), d = 1.6;
  const chairs = [];
  for (let i = 0; i < n; i++) {
    const side = i < perSide ? 1 : -1, k = i < perSide ? i : i - perSide, count = side === 1 ? perSide : n - perSide;
    const x = cx - w / 2 + (k + 0.5) * (w / count);
    chairs.push({ x, z: cz + side * (d / 2 + 0.45), rotY: side === 1 ? 0 : Math.PI });
  }
  return { table: { x: cx, z: cz, w, d }, chairs, screen: { x: cx, z: z0 + 0.15, w: Math.min(3.2, x1 - x0 - 2) } };
}
