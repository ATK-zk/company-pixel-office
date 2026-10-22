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

// ---- optional per-agent fields (docs/STATUS_CONTRACT.md). Absent → null/[]; the UI then says "no disponible". ----
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const str = (v, n = 300) => (typeof v === 'string' && v.trim() ? clip(v.trim(), n) : null);
// Links only to https: or to a relative path inside the site — never javascript:, data: or other schemes.
export function safeUrl(u) {
  if (typeof u !== 'string') return null;
  const s = u.trim();
  return /^https:\/\/[^\s]+$/i.test(s) || /^(\.{0,2}\/)?[\w\-.]+(\/[\w\-.]+)*(\?[\w=&\-.]*)?$/.test(s) ? s : null;
}
function extras(t) {
  const latency = typeof t.latency_ms === 'number' && Number.isFinite(t.latency_ms) && t.latency_ms >= 0 ? t.latency_ms : null;
  const errors = Array.isArray(t.errors) ? t.errors.map(e => str(e, 200)).filter(Boolean).slice(0, 5) : [];
  const metrics = [];
  if (t.metrics && typeof t.metrics === 'object' && !Array.isArray(t.metrics))
    for (const [k, v] of Object.entries(t.metrics).slice(0, 8)) {
      const val = typeof v === 'number' && Number.isFinite(v) ? v : str(v, 60);
      if (val != null && k.length <= 40) metrics.push({ key: k, value: val });
    }
  const recent = Array.isArray(t.recent) ? t.recent.slice(0, 10).map(r => r && typeof r === 'object' ? { at: parseAsOf(r.at), text: str(r.text, 200) } : null).filter(r => r && r.text) : [];
  return { lastResult: str(t.last_result), latencyMs: latency, errors, metrics, evidence: safeUrl(t.evidence), recent };
}
const NO_EXTRAS = { lastResult: null, latencyMs: null, errors: [], metrics: [], evidence: null, recent: [] };

// status: parsed status.json (or null); ids: agent ids to report; error: message if the fetch failed.
// A per-agent `updated_at` overrides team.as_of for that agent's freshness.
export function agentStatuses(status, ids, { now = Date.now(), staleMs = STALE_MS, error = null } = {}) {
  const out = {}, demo = !!(status && status.demo === true);
  const team = (status && typeof status.team === 'object' && status.team) || {};
  const teamAsOf = parseAsOf(team.as_of);
  const fresh = at => { const ageMs = at == null ? null : Math.max(0, now - at); return { asOf: at, ageMs, stale: !demo && (ageMs == null || ageMs > staleMs) }; };
  for (const id of ids) {
    const base = { id, raw: null, task: null, ...fresh(teamAsOf), demo, animate: false, reason: null, ...NO_EXTRAS };
    if (error || !status) { out[id] = { ...base, state: 'unknown', asOf: null, ageMs: null, stale: true, reason: error ? `no se pudo leer status.json (${error})` : 'sin datos' }; continue; }
    const t = team[id];
    if (!t || typeof t !== 'object') { out[id] = { ...base, state: 'disabled', reason: 'no aparece en status.json' }; continue; }
    const state = mapState(t.state), own = parseAsOf(t.updated_at), f = fresh(own != null ? own : teamAsOf);
    const task = typeof t.task_en === 'string' ? t.task_en : typeof t.task === 'string' ? t.task : null;
    out[id] = { ...base, ...f, ...extras(t), state, raw: t.state ?? null, task, animate: state === 'running' && !f.stale,
      reason: state === 'unknown' ? `estado no reconocido: ${t.state == null ? '(vacío)' : t.state}` : null };
  }
  return out;
}

// Trading mode as published by status.json → `mode`. Display only: this view never operates.
export const MODES = { MOCK: '#ffcf5c', PAPER: '#8fb4ff', LIVE: '#ff5d73' };
export function modeInfo(status) {
  const raw = status && typeof status.mode === 'string' ? status.mode.trim().toUpperCase() : '';
  if (!raw) return { mode: null, label: 'Modo no publicado', color: '#6b737d', known: false, live: false };
  if (!MODES[raw]) return { mode: null, label: `Modo desconocido: ${clip(String(status.mode), 20)}`, color: '#ffb35c', known: false, live: false };
  return { mode: raw, label: raw, color: MODES[raw], known: true, live: raw === 'LIVE' };
}

// Data-quality checks on status.json against the contract. Returns [{ level: 'warn' | 'info', text }].
export function validateStatus(status, placedIds) {
  const w = [], warn = text => w.push({ level: 'warn', text }), info = text => w.push({ level: 'info', text });
  if (!status || typeof status !== 'object' || Array.isArray(status)) return [{ level: 'warn', text: 'status.json no es un objeto JSON' }];
  const team = status.team;
  if (!team || typeof team !== 'object') warn('falta team');
  else {
    if (parseAsOf(team.as_of) == null && !status.demo) warn('team.as_of no tiene una hora con zona horaria (p. ej. "2026-10-13 20:01 ICT")');
    for (const id of placedIds) {
      const t = team[id];
      if (!t || typeof t !== 'object') { warn(`team.${id} falta`); continue; }
      if (mapState(t.state) === 'unknown') warn(`team.${id}.state "${t.state ?? ''}" no está en el contrato`);
      if (t.updated_at != null && parseAsOf(t.updated_at) == null) warn(`team.${id}.updated_at no se puede leer`);
      if (t.evidence != null && !safeUrl(t.evidence)) warn(`team.${id}.evidence no es un enlace permitido (https o ruta relativa)`);
    }
    for (const k of Object.keys(team)) if (k !== 'as_of' && !placedIds.includes(k)) info(`team.${k} no tiene puesto en la oficina`);
  }
  if (status.systems != null && (!Array.isArray(status.systems) || status.systems.some(s => !s || typeof s.name !== 'string' || typeof s.ok !== 'boolean')))
    warn('systems debe ser una lista de { name, ok }');
  const nv = status.net_value;
  if (nv != null && (typeof nv !== 'object' || !Number.isFinite(Number(nv.usd)) || parseAsOf(nv.as_of) == null)) warn('net_value necesita usd numérico y as_of con zona');
  if (!status.demo && status.leaderboard_account != null && !/^0x[0-9a-fA-F]{40}$/.test(String(status.leaderboard_account))) warn('leaderboard_account no es una dirección válida');
  const m = modeInfo(status);
  if (!m.known) (status.mode == null ? info : warn)(status.mode == null ? 'mode no publicado (MOCK, PAPER o LIVE)' : `mode "${status.mode}" no está en el contrato`);
  return w;
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
