// Data panel outside the 3D scene (spec §9): every metric with its source and time; missing ones say so.
import { SOURCE, syncedNetValue, lossCap, discrepancy, fmtUsd, fmtCompactUsd, fmtPct, DAILY_LOSS_CAP_PCT } from './data.js';
import { formatAge, modeInfo, validateStatus } from './status.js';

const h = (tag, props = {}, ...kids) => { const el = Object.assign(document.createElement(tag), props); el.append(...kids.filter(k => k != null)); return el; };
const at = t => t ? new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

// Pure: the rows the panel shows, so tests can check that nothing is shown without a source.
export function dashboardRows({ market, status, statusError, placedIds = [] }) {
  const p = market.portfolio, lb = market.leaderboard, nv = syncedNetValue(status), cap = lossCap(nv), err = market.errors;
  const lbOk = !!(lb && lb.found);
  const provErr = err.address || err.portfolio;
  const rows = [
    { group: 'Cuenta' },
    { label: 'Equity', value: p ? fmtUsd(p.equity) : '—', src: p ? 'real' : 'none', when: p && p.ts, note: p ? null : provErr || 'cargando' },
    { label: 'Equity según status.json', value: nv ? fmtUsd(nv.usd) : '—', src: nv ? 'sync' : 'none', when: nv && nv.asOf, note: nv && nv.asOf ? formatAge(Date.now() - nv.asOf) : null },
  ];
  const disc = discrepancy(p && p.equity, nv);
  if (disc) rows.push({ label: 'Discrepancia de equity', value: `${fmtUsd(disc.diff, { sign: true })} (${fmtPct(disc.pct, 0)})`, src: 'calc', warn: true, note: 'proveedor − status.json; status.json puede estar desactualizado' });
  rows.push(
    { label: 'Posiciones abiertas', value: p && p.positions != null ? String(p.positions) : '—', src: p && p.positions != null ? 'real' : 'none', when: p && p.ts },
    { label: 'Exposición total', value: p && p.positions === 0 ? fmtUsd(0) : '—', src: p && p.positions === 0 ? 'calc' : 'none', note: p && p.positions === 0 ? 'sin posiciones abiertas' : 'requiere el detalle de posiciones' },
    { group: 'Resultados' },
    { label: 'P&L acumulado', value: lbOk ? fmtUsd(lb.pnl, { sign: true }) : '—', src: lbOk ? 'real' : 'none', when: lb && lb.ts, note: 'definición del proveedor (leaderboard, todo el período)' },
    { label: 'ROI acumulado', value: lbOk && Number.isFinite(lb.roi) ? fmtPct(lb.roi * 100) : '—', src: lbOk ? 'real' : 'none', when: lb && lb.ts },
    { label: 'P&L del día', value: nv ? fmtUsd(nv.dayPnl, { sign: true }) : '—', src: nv ? 'sync' : 'none', when: nv && nv.asOf },
    { label: `Uso del límite diario (${DAILY_LOSS_CAP_PCT} %)`, value: cap ? `${fmtPct(cap.pct)} · ${Math.round(cap.used * 100)} % del límite` : '—', src: cap ? 'calc' : 'none', warn: cap && cap.breached, note: 'P&L del día / (equity − P&L del día), con datos de status.json' },
    { label: 'P&L realizado / no realizado', value: '—', src: 'none', note: 'las fuentes conectadas no lo separan' },
    { label: 'Drawdown actual y máximo', value: '—', src: 'none', note: 'requiere historial de equity persistente' },
    { label: 'Operaciones y tasa de acierto', value: '—', src: 'none', note: 'no hay registro de operaciones conectado' },
    { group: 'Mercado' },
    { label: 'Volumen total', value: lbOk ? fmtCompactUsd(lb.notional) : '—', src: lbOk ? 'real' : 'none', when: lb && lb.ts },
    { label: 'Ranking de volumen', value: lbOk ? `#${lb.rank.toLocaleString('es-ES')} de ${Number.isFinite(lb.total) ? lb.total.toLocaleString('es-ES') : '—'}` : '—', src: lbOk ? 'real' : 'none', when: lb && lb.ts },
    { group: 'Operación' },
    (() => { const m = modeInfo(status); return m.known
      ? { label: 'Modo operativo', value: m.label, src: 'sync', warn: m.live, note: m.live ? 'informado por status.json; esta vista no opera ni puede enviar órdenes' : 'informado por status.json; esta vista no envía órdenes' }
      : { label: 'Modo operativo', value: 'No publicado', src: 'none', note: (status && status.mode != null ? m.label + '. ' : '') + 'status.json no indica MOCK, PAPER o LIVE. Esta vista es de solo lectura y no envía órdenes.' }; })(),
    { label: 'Costes de modelos y latencia', value: '—', src: 'none', note: 'sin telemetría conectada' },
  );
  const sys = status && Array.isArray(status.systems) ? status.systems : [];
  for (const s of sys) rows.push({ label: `Sistema: ${s.name}`, value: s.ok ? 'OK' : 'FALLO', src: 'sync', warn: !s.ok, note: 'según el último status.json' });
  if (statusError) rows.push({ label: 'status.json', value: 'sin conexión', src: 'none', warn: true, note: statusError });
  if (status) {
    const q = validateStatus(status, placedIds);
    rows.push({ group: 'Calidad de status.json (contrato v1)' });
    if (!q.length) rows.push({ label: 'Comprobaciones', value: 'Sin avisos', src: 'calc' });
    for (const x of q) rows.push({ label: x.level === 'warn' ? 'Aviso' : 'Nota', value: x.text, src: 'calc', warn: x.level === 'warn' });
  }
  return rows;
}

export function renderDashboard(el, model) {
  const list = h('dl');
  for (const r of dashboardRows(model)) {
    if (r.group) { list.append(h('dt', { className: 'grp', textContent: r.group })); continue; }
    const tag = h('span', { className: 'chip', textContent: SOURCE[r.src].label }); tag.style.setProperty('--c', SOURCE[r.src].color);
    const sub = [r.when ? at(r.when) : null, r.note].filter(Boolean).join(' · ');
    list.append(h('dt', { textContent: r.label }), h('dd', { className: r.warn ? 'warn' : r.src === 'none' ? 'na' : '' },
      h('span', { className: 'v', textContent: r.value }), ' ', tag, sub ? h('small', { textContent: sub }) : null));
  }
  el.replaceChildren(h('header', {}, h('h2', { textContent: 'Datos de la mesa' }),
    h('p', { className: 'sub', textContent: 'Solo lectura. Cada valor indica su origen; lo que no tiene fuente aparece como SIN DATOS.' })), list);
}
