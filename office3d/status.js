// Maps status.json → per-agent display state. Pure (no DOM, no three.js) so Node tests can run it.
// Rule: the "working" animation only plays when status.json says the agent is running AND the data is fresh.

export const STALE_MS = 2 * 3600 * 1000;

export const STATES = {
  running: { label: 'Trabajando', color: '#c6ff3d' },
  idle: { label: 'Inactivo', color: '#8b939e' },
  waiting: { label: 'En espera', color: '#8fb4ff' },
  success: { label: 'Completado', color: '#5ef2d6' },
  degraded: { label: 'Degradado', color: '#ffb35c' },
  error: { label: 'Error', color: '#ff5d73' },
  disabled: { label: 'Desactivado', color: '#5a616b' },
  unknown: { label: 'Desconocido', color: '#ffb35c' },
};

const RAW = { WORKING: 'running', RUNNING: 'running', BUSY: 'running', IDLE: 'idle', WAITING: 'waiting', BLOCKED: 'waiting',
  SUCCESS: 'success', DONE: 'success', DEGRADED: 'degraded', ERROR: 'error', FAILED: 'error', DISABLED: 'disabled', OFF: 'disabled', OFFLINE: 'disabled' };

export function mapState(raw) {
  if (raw == null || raw === '') return 'unknown';
  return RAW[String(raw).trim().toUpperCase()] || 'unknown';
}

const TZ = { UTC: 0, GMT: 0, Z: 0, ICT: 7, CET: 1, CEST: 2 };
// "2026-10-13 20:01 ICT" (the format the sync job writes) or a full ISO string. No zone → null (age unknown).
export function parseAsOf(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*([A-Z]{1,4})$/);
  if (m) {
    const off = TZ[m[7]];
    return off === undefined ? null : Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - off, +m[5], +(m[6] || 0));
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s.trim())) return Date.parse(s);
  return null;
}

// status: parsed status.json (or null); ids: agent ids to report; error: message if the fetch failed.
export function agentStatuses(status, ids, { now = Date.now(), staleMs = STALE_MS, error = null } = {}) {
  const out = {}, demo = !!(status && status.demo === true);
  const team = (status && typeof status.team === 'object' && status.team) || {};
  const asOf = parseAsOf(team.as_of), ageMs = asOf == null ? null : Math.max(0, now - asOf);
  const stale = !demo && (ageMs == null || ageMs > staleMs);
  for (const id of ids) {
    const base = { id, raw: null, task: null, asOf, ageMs, stale, demo, animate: false, reason: null };
    if (error || !status) { out[id] = { ...base, state: 'unknown', asOf: null, ageMs: null, stale: true, reason: error ? `no se pudo leer status.json (${error})` : 'sin datos' }; continue; }
    const t = team[id];
    if (!t || typeof t !== 'object') { out[id] = { ...base, state: 'disabled', reason: 'no aparece en status.json' }; continue; }
    const state = mapState(t.state);
    const task = typeof t.task_en === 'string' ? t.task_en : typeof t.task === 'string' ? t.task : null;
    out[id] = { ...base, state, raw: t.state ?? null, task, animate: state === 'running' && !stale,
      reason: state === 'unknown' ? `estado no reconocido: ${t.state == null ? '(vacío)' : t.state}` : null };
  }
  return out;
}

export const HAIR_STYLES = ['short', 'bun', 'long'];
// config/agents.json: one entry (name, role, duty, look) for every agent placed in an area.
export function validateAgents(cfg, departments) {
  const errors = [], hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (!cfg || typeof cfg.agents !== 'object' || !cfg.agents) return ['agents must be an object'];
  if (cfg.stale_after_minutes != null && !(Number.isFinite(cfg.stale_after_minutes) && cfg.stale_after_minutes > 0)) errors.push('stale_after_minutes must be a positive number');
  for (const d of departments) {
    const a = cfg.agents[d.agent], at = `agents.${d.agent}`;
    if (!a) { errors.push(`${at} is missing (used by area "${d.id}")`); continue; }
    for (const k of ['name', 'role', 'duty']) if (typeof a[k] !== 'string' || !a[k].trim()) errors.push(`${at}.${k} is required`);
    const l = a.look || {};
    for (const k of ['skin', 'hair', 'suit', 'shirt']) if (!hex(l[k])) errors.push(`${at}.look.${k} must be #rrggbb`);
    if (!HAIR_STYLES.includes(l.hair_style)) errors.push(`${at}.look.hair_style must be one of ${HAIR_STYLES.join(', ')}`);
  }
  return errors;
}

export function formatAge(ms) {
  if (ms == null) return 'antigüedad desconocida';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'hace menos de 1 min';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

export const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'running', label: 'Trabajando' },
  { id: 'idle', label: 'Inactivos' },
  { id: 'issue', label: 'Error / degradado' },
  { id: 'disabled', label: 'Desactivados' },
  { id: 'stale', label: 'Datos antiguos' },
];
export function matchesFilter(s, f) {
  switch (f) {
    case 'all': return true;
    case 'running': return s.state === 'running';
    case 'idle': return s.state === 'idle' || s.state === 'waiting' || s.state === 'success';
    case 'issue': return s.state === 'error' || s.state === 'degraded' || s.state === 'unknown';
    case 'disabled': return s.state === 'disabled';
    case 'stale': return s.stale;
    default: return true;
  }
}
