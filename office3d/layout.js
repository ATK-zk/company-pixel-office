// Pure layout + camera helpers for the 3D office. No three.js import, so Node tests can run them.
// World units are metres; the office floor is centred on the origin (x → east, z → south).

export const ZOOM = { min: 0.6, max: 6, overview: 1 };
export const VIEW = { polar: 55, azimuth: 32 }; // default isometric angles, degrees

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

// Returns a list of human-readable problems; empty means the config is usable.
export function validateDepartments(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object') return ['config must be an object'];
  const o = cfg.office;
  if (!o || !isNum(o.width) || !isNum(o.depth) || o.width <= 0 || o.depth <= 0) errors.push('office.width/depth must be positive numbers');
  if (!Array.isArray(cfg.departments) || !cfg.departments.length) return errors.concat('departments must be a non-empty array');
  const hw = (o && o.width) / 2, hd = (o && o.depth) / 2;
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
    if (!Array.isArray(r) || r.length !== 4 || !r.every(isNum) || r[0] >= r[2] || r[1] >= r[3]) { errors.push(`${at}.rect must be [x0, z0, x1, z1] with x0 < x1, z0 < z1`); return; }
    if (r[0] < -hw || r[2] > hw || r[1] < -hd || r[3] > hd) errors.push(`${at}.rect is outside the office`);
    const s = d.seat;
    if (!Array.isArray(s) || s.length < 2 || !s.slice(0, 3).every(isNum)) errors.push(`${at}.seat must be [x, z, rotY?]`);
    else if (s[0] < r[0] + 1 || s[0] > r[2] - 1 || s[1] < r[1] + 1 || s[1] > r[3] - 1) errors.push(`${at}.seat must sit at least 1 m inside its rect`);
  });
  const rects = cfg.departments.filter(d => Array.isArray(d.rect) && d.rect.length === 4);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i].rect, b = rects[j].rect;
    if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) errors.push(`areas "${rects[i].id}" and "${rects[j].id}" overlap`);
  }
  if (cfg.aisles != null) {
    if (!Array.isArray(cfg.aisles)) errors.push('aisles must be an array');
    else cfg.aisles.forEach((a, i) => {
      if (!Array.isArray(a) || a.length !== 4 || !a.every(isNum)) errors.push(`aisles[${i}] must be [x0, z0, x1, z1]`);
      else if (Math.max(Math.abs(a[0]), Math.abs(a[2])) > hw || Math.max(Math.abs(a[1]), Math.abs(a[3])) > hd) errors.push(`aisles[${i}] is outside the office`);
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

// Orthographic frustum [width, height] at zoom 1 that fits the whole office seen from the given angles.
export function overviewFrustum(office, aspect, polar = VIEW.polar, azimuth = VIEW.azimuth) {
  const a = azimuth * Math.PI / 180, p = polar * Math.PI / 180;
  const across = office.width * Math.abs(Math.cos(a)) + office.depth * Math.abs(Math.sin(a));
  const along = (office.width * Math.abs(Math.sin(a)) + office.depth * Math.abs(Math.cos(a))) * Math.cos(p);
  const h = Math.max(along * 1.15, across * 1.06 / aspect);
  return [h * aspect, h];
}

// Look-at point and zoom that frame one department.
export function focusFor(dept, office) {
  const [x0, z0, x1, z1] = dept.rect;
  const zoom = clampZoom(0.75 * Math.min(office.width / (x1 - x0), office.depth / (z1 - z0)));
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, zoom };
}

export function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// One desk per department seat (owned by its agent). `extra` adds unowned desks for the stress test (?stress=N).
export function workstationTransforms(cfg, extra = 0) {
  const out = cfg.departments.map(d => ({ x: d.seat[0], z: d.seat[1], rotY: d.seat[2] || 0, dept: d.id, agent: d.agent }));
  const n = clamp(Math.floor(extra) || 0, 0, 240);
  if (!n) return out;
  const spots = [];
  for (const d of cfg.departments) {
    const [x0, z0, x1, z1] = d.rect;
    for (let z = z0 + 1.6; z <= z1 - 1.6; z += 2.6) for (let x = x0 + 1.4; x <= x1 - 1.4; x += 2.3) {
      if (Math.abs(x - d.seat[0]) < 2.4 && Math.abs(z - d.seat[1]) < 2.4) continue;
      spots.push({ x, z, rotY: 0, dept: d.id, agent: null });
    }
  }
  return out.concat(spots.slice(0, n));
}
