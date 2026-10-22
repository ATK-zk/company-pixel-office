// Recent activity per agent. Two honest sources, kept apart:
//   status.json → team.<id>.recent (published by the sync job; absent today)
//   observed    → changes this browser saw between two successful reads of status.json during the session
// Pure (no DOM, no three.js).
import { STATES } from './status.js';

// Events between two successful readings. Nothing is reported on the first reading.
export function diffStatuses(prev, next, now) {
  const events = [];
  if (!prev) return events;
  for (const [id, b] of Object.entries(next)) {
    const a = prev[id];
    if (!a) continue;
    if (a.state !== b.state) events.push({ id, at: now, text: `Estado: ${STATES[a.state].label} → ${STATES[b.state].label}` });
    if ((a.task || '') !== (b.task || '') && b.task) events.push({ id, at: now, text: `Tarea nueva: ${b.task}` });
  }
  return events;
}

export function appendLog(log, events, max = 20) {
  const out = { ...log };
  for (const e of events) out[e.id] = [e, ...(out[e.id] || [])].slice(0, max);
  return out;
}

// Merged, newest first, each item tagged with its source.
export function recentActivity(status, observed, limit = 8) {
  const items = (status ? status.recent : []).map(r => ({ ...r, src: 'status.json' }))
    .concat((observed || []).map(r => ({ ...r, src: 'observado' })));
  return items.sort((a, b) => (b.at ?? -Infinity) - (a.at ?? -Infinity)).slice(0, limit);
}
