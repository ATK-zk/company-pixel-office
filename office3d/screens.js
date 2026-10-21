// 2D panels painted on canvases and shown on the 3D screens (area displays, meeting-room summary).
// Every block names its source (REAL / status.json / CALCULADO / SIN DATOS) and when it was updated.
// Panels are repainted only when data changes, never per frame.
import * as THREE from 'three';
import { STATES, formatAge } from './status.js';
import { SOURCE, syncedNetValue, lossCap, discrepancy, fmtUsd, fmtCompactUsd, fmtPct, DAILY_LOSS_CAP_PCT } from './data.js';

export { PANEL_KINDS } from './layout.js';
const W = 768, H = 432, PAD = 24;
const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif', MONO = 'ui-monospace,Consolas,monospace';
const C = { bg: '#04080c', text: '#e8ebef', muted: '#8b939e', up: '#3ddc97', down: '#ff5d73', warn: '#ffb35c', line: 'rgba(255,255,255,.08)' };

function chip(g, x, y, src, alignRight = true) {
  const s = SOURCE[src]; g.font = `700 15px ${MONO}`;
  const w = g.measureText(s.label).width + 16, x0 = alignRight ? x - w : x;
  g.strokeStyle = s.color; g.lineWidth = 1.5; g.strokeRect(x0 + 0.5, y + 0.5, w, 24);
  g.fillStyle = s.color; g.textBaseline = 'middle'; g.fillText(s.label, x0 + 8, y + 13);
  return alignRight ? x0 - 8 : x0 + w + 8;
}
function wrap(g, text, x, y, maxW, lh, maxLines = 3) {
  const words = String(text).split(/\s+/); let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      if (++n === maxLines) { g.fillText(line + ' …', x, y); return y + lh; }
      g.fillText(line, x, y); y += lh; line = words[i];
    } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}
function frame(g, title, color) {
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  g.fillStyle = color; g.fillRect(0, 0, 6, H);
  g.fillStyle = C.text; g.font = `600 26px ${FONT}`; g.textBaseline = 'top'; g.fillText(title, PAD, 20);
  g.fillStyle = C.line; g.fillRect(PAD, 60, W - 2 * PAD, 1.5);
}
function label(g, text, x, y) { g.fillStyle = C.muted; g.font = `500 17px ${FONT}`; g.textBaseline = 'top'; g.fillText(text, x, y); }
function value(g, text, x, y, color = C.text, size = 34) { g.fillStyle = color; g.font = `700 ${size}px ${MONO}`; g.textBaseline = 'top'; g.fillText(text, x, y); }
function footer(g, text) { g.fillStyle = C.muted; g.font = `400 15px ${MONO}`; g.textBaseline = 'alphabetic'; g.fillText(text, PAD, H - 16); }
const hhmm = t => t ? new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—';
const dayTime = t => t ? new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'sin hora';

function agentBlock(g, m, id, y) {
  const s = m.statuses[id], meta = m.agentsCfg.agents[id], st = STATES[s.state];
  chip(g, W - PAD, y - 2, 'sync');
  g.fillStyle = st.color; g.beginPath(); g.arc(PAD + 8, y + 11, 7, 0, 7); g.fill();
  g.fillStyle = C.text; g.font = `600 20px ${FONT}`; g.textBaseline = 'top';
  g.fillText(`${meta.name} · ${st.label}${s.stale && !s.demo ? ' (dato antiguo)' : ''}`, PAD + 24, y);
  g.fillStyle = C.muted; g.font = `400 17px ${FONT}`;
  return wrap(g, s.task ? `Tarea: ${s.task}` : 'Sin tarea en status.json', PAD, y + 32, W - 2 * PAD, 22, 3);
}
function noSource(g, y, title, detail) {
  chip(g, W - PAD, y - 2, 'none');
  g.fillStyle = C.text; g.font = `600 20px ${FONT}`; g.textBaseline = 'top'; g.fillText(title, PAD, y);
  g.fillStyle = C.muted; g.font = `400 17px ${FONT}`;
  return wrap(g, detail, PAD, y + 30, W - 2 * PAD, 22, 3);
}
function sparkline(g, hist, x, y, w, h) {
  g.strokeStyle = C.line; g.strokeRect(x, y, w, h);
  if (hist.length < 2) { label(g, 'Recogiendo muestras de esta sesión…', x + 12, y + h / 2 - 9); return; }
  let lo = Infinity, hi = -Infinity; for (const p of hist) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); }
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  g.beginPath(); hist.forEach((p, i) => { const px = x + i / (hist.length - 1) * w, py = y + h - (p.v - lo) / (hi - lo) * h; i ? g.lineTo(px, py) : g.moveTo(px, py); });
  g.strokeStyle = '#5ef2d6'; g.lineWidth = 2.5; g.stroke();
}
function agentAge(m) { const s = Object.values(m.statuses)[0]; return s ? (s.demo ? 'demo' : formatAge(s.ageMs)) : '—'; }

const PAINTERS = {
  news(g, m, d) {
    frame(g, 'Investigación · eventos vigilados', d.color);
    let y = agentBlock(g, m, d.agent, 80) + 18;
    noSource(g, y, 'Feed de noticias y eventos', 'Sin integración: no hay una fuente de noticias conectada. Queda pendiente elegir la fuente y su adaptador.');
    footer(g, `status.json ${agentAge(m)}`);
  },
  quant(g, m, d) {
    frame(g, 'Quant & Data · equity de la cuenta', d.color);
    const p = m.market.portfolio, err = m.market.errors.portfolio || m.market.errors.address;
    chip(g, W - PAD, 78, p ? 'real' : 'none');
    label(g, 'Equity (Polymarket Perps, API pública)', PAD, 80);
    value(g, p ? fmtUsd(p.equity) : '—', PAD, 106, C.text, 44);
    label(g, p ? `Posiciones abiertas: ${p.positions ?? '—'}` : err ? `Error: ${err}` : 'Cargando…', PAD + 380, 120);
    sparkline(g, m.market.history, PAD, 172, W - 2 * PAD, 130);
    const n = m.market.history.length;
    label(g, `Historial de esta sesión (${n} ${n === 1 ? "muestra" : "muestras"}, una cada 20 s)`, PAD, 310);
    g.font = `400 17px ${FONT}`; g.fillStyle = C.muted; g.fillText('Backtests y métricas de validación: sin datos conectados', PAD, 346);
    chip(g, W - PAD, 342, 'none');
    footer(g, p ? `Proveedor ${hhmm(p.ts)} · consultado ${hhmm(m.market.fetchedAt.portfolio)}` : 'Proveedor sin respuesta');
  },
  strategy(g, m, d) {
    frame(g, 'Estrategia · propuestas', d.color);
    let y = agentBlock(g, m, d.agent, 80) + 18;
    noSource(g, y, 'Propuestas pendientes: 0 conocidas', 'No hay un registro de propuestas publicado. Cuando exista, cada una mostrará hipótesis, precio, tamaño, riesgos y la decisión del motor de riesgo. Una propuesta no es una orden.');
    footer(g, `status.json ${agentAge(m)}`);
  },
  risk(g, m, d) {
    frame(g, 'Control de Riesgo · límite de pérdida diaria', d.color);
    const nv = syncedNetValue(m.status), cap = lossCap(nv), p = m.market.portfolio;
    chip(g, W - PAD, 78, 'sync');
    label(g, `P&L del día según status.json (${dayTime(nv && nv.asOf)})`, PAD, 80);
    value(g, nv ? fmtUsd(nv.dayPnl, { sign: true }) : '—', PAD, 104, nv && nv.dayPnl < 0 ? C.down : C.up);
    let y = 160;
    if (cap) {
      chip(g, W - PAD, y - 2, 'calc');
      label(g, `${fmtPct(cap.pct)} del capital inicial del día · límite −${cap.capPct} %`, PAD, y);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(PAD, y + 30, W - 2 * PAD, 16);
      g.fillStyle = cap.breached ? C.down : cap.used > 0.66 ? C.warn : C.up; g.fillRect(PAD, y + 30, (W - 2 * PAD) * cap.used, 16);
      y += 64;
    }
    const disc = discrepancy(p && p.equity, nv);
    if (disc) {
      g.fillStyle = 'rgba(255,93,115,.12)'; g.fillRect(PAD, y, W - 2 * PAD, 62);
      g.fillStyle = C.down; g.font = `600 18px ${FONT}`; g.textBaseline = 'top';
      g.fillText('Discrepancia entre fuentes', PAD + 12, y + 8);
      g.fillStyle = C.text; g.font = `400 17px ${FONT}`;
      g.fillText(`Proveedor ${fmtUsd(p.equity)} · status.json ${fmtUsd(nv.usd)} (${fmtPct(disc.pct, 0)})`, PAD + 12, y + 34);
      y += 76;
    }
    const sys = (m.status && Array.isArray(m.status.systems)) ? m.status.systems : [];
    label(g, sys.length ? 'Sistemas (status.json): ' + sys.map(s => `${s.name} ${s.ok ? 'OK' : 'FALLO'}`).join(' · ') : 'Sistemas: sin datos', PAD, y);
    footer(g, `Fórmula: P&L del día / (equity − P&L del día) · límite ${DAILY_LOSS_CAP_PCT} % (README)`);
  },
  execution(g, m, d) {
    frame(g, 'Ejecución · órdenes y conciliación', d.color);
    let y = agentBlock(g, m, d.agent, 80) + 14;
    y = noSource(g, y, 'Órdenes MOCK / PAPER: sin registro', 'No hay un registro de órdenes simuladas publicado. Esta oficina es de solo lectura y no puede enviar órdenes.') + 10;
    const p = m.market.portfolio;
    chip(g, W - PAD, y - 2, p ? 'real' : 'none');
    label(g, p ? `Posiciones abiertas en la cuenta (proveedor): ${p.positions ?? '—'}` : 'Posiciones: sin respuesta del proveedor', PAD, y);
    footer(g, `status.json ${agentAge(m)}${p ? ' · proveedor ' + hhmm(p.ts) : ''}`);
  },
  oversight(g, m, d) {
    frame(g, 'Supervisión · estado del equipo', d.color);
    chip(g, W - PAD, 76, 'sync');
    let y = 82;
    for (const dept of m.cfg.departments) {
      const s = m.statuses[dept.agent], st = STATES[s.state], meta = m.agentsCfg.agents[dept.agent];
      g.fillStyle = st.color; g.beginPath(); g.arc(PAD + 8, y + 11, 7, 0, 7); g.fill();
      g.fillStyle = C.text; g.font = `600 19px ${FONT}`; g.textBaseline = 'top'; g.fillText(meta.name, PAD + 24, y);
      g.fillStyle = st.color; g.font = `500 18px ${MONO}`; g.fillText(st.label + (s.stale && !s.demo ? ' · antiguo' : ''), PAD + 220, y);
      g.fillStyle = C.muted; g.font = `400 16px ${FONT}`; g.fillText(dept.name, PAD + 470, y + 1);
      y += 36;
    }
    const sys = (m.status && Array.isArray(m.status.systems)) ? m.status.systems : [];
    label(g, sys.length ? 'Sistemas: ' + sys.map(s => `${s.name} ${s.ok ? 'OK' : 'FALLO'}`).join(' · ') : 'Sistemas: sin datos', PAD, y + 4);
    footer(g, `status.json ${agentAge(m)} · costes de modelos y latencia: sin datos`);
  },
  summary(g, m, d) {
    frame(g, 'Resumen de la mesa', '#c6ff3d');
    const p = m.market.portfolio, lb = m.market.leaderboard, nv = syncedNetValue(m.status);
    const cell = (x, y, title, text, src, color) => { label(g, title, x, y); value(g, text, x, y + 24, color, 30); chip(g, x, y + 64, src, false); };
    cell(PAD, 78, 'Equity', p ? fmtUsd(p.equity) : '—', p ? 'real' : 'none');
    cell(PAD + 250, 78, 'P&L acumulado*', lb && lb.found ? fmtUsd(lb.pnl, { sign: true }) : '—', lb && lb.found ? 'real' : 'none', lb && lb.pnl < 0 ? C.down : C.up);
    cell(PAD + 500, 78, 'Volumen total', lb && lb.found ? fmtCompactUsd(lb.notional) : '—', lb && lb.found ? 'real' : 'none');
    cell(PAD, 196, `P&L del día (${dayTime(nv && nv.asOf)})`, nv ? fmtUsd(nv.dayPnl, { sign: true }) : '—', nv ? 'sync' : 'none', nv && nv.dayPnl < 0 ? C.down : C.up);
    cell(PAD + 250, 196, 'Ranking de volumen', lb && lb.found ? `#${lb.rank.toLocaleString('es-ES')}` : '—', lb && lb.found ? 'real' : 'none');
    const working = Object.values(m.statuses).filter(s => s.state === 'running').length;
    cell(PAD + 500, 196, 'Agentes trabajando', `${working} / ${Object.keys(m.statuses).length}`, 'sync');
    if (discrepancy(p && p.equity, nv)) { g.fillStyle = C.down; g.font = `600 17px ${FONT}`; g.textBaseline = 'top'; g.fillText(`Discrepancia: status.json indica ${fmtUsd(nv.usd)}`, PAD, 322); }
    footer(g, `*Definición del proveedor (leaderboard) · estados ${agentAge(m)}`);
  },
};

// One canvas-backed screen. `paint(model)` redraws it and flags the texture for upload.
export function createScreen(kind, dept, renderer) {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, color: 0xd8d8d8 });
  return {
    kind, material, canvas,
    title: () => (dept.name ? dept.name + ' · ' : '') + 'pantalla',
    paint(model) {
      g.save();
      try { PAINTERS[kind](g, model, dept); }
      catch (e) { frame(g, 'Pantalla sin datos', '#ff5d73'); label(g, 'Error al dibujar: ' + e.message, PAD, 90); }
      g.restore(); texture.needsUpdate = true;
    },
    dispose() { texture.dispose(); material.dispose(); },
  };
}
